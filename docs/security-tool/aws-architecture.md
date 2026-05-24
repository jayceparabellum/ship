# AWS Security Tool Architecture

This design extends the deployed Ship AWS architecture with an optional, scheduled security audit runner. The production runner is implemented in `terraform/environments/prod/security-tool.tf`.

## Purpose

The local command `corepack pnpm security:audit` remains the source of truth. AWS runs the same command on a schedule, stores immutable report copies, and keeps the latest report available for review.

## AWS Services

| Service | Purpose |
| --- | --- |
| Lambda | Scheduled control-plane function that starts the security audit run |
| CodeBuild | Clones the `ShipShape-Security-Tool` branch and runs `corepack pnpm security:audit`; optionally runs `corepack pnpm security:probe` against a live app |
| S3 | Stores JSON and Markdown security reports under `runs/<run-id>/` and `latest/` |
| CloudWatch Logs | Captures CodeBuild execution logs |
| EventBridge | Invokes Lambda on a schedule |
| IAM | Grants least-privilege access to logs, S3 report writes, and optional SSM token reads |
| SSM Parameter Store | Optional SecureString location for a GitLab token if the Labs repository requires authenticated clone |

## Flow

```mermaid
flowchart TD
  EventBridge["EventBridge schedule"] --> Lambda["Lambda trigger"]
  Lambda --> CodeBuild["CodeBuild security runner"]
  CodeBuild --> Audit["corepack pnpm security:audit"]
  Audit --> S3Runs["S3 reports: runs/<run-id>/"]
  Audit --> S3Latest["S3 reports: latest/"]
  CodeBuild --> Logs["CloudWatch Logs"]
  CodeBuild -. optional .-> SSM["SSM SecureString Git token"]
```

## Terraform Toggle

The root Terraform security-tool resources are disabled by default. The production environment runner has been applied from `terraform/environments/prod/security-tool.tf`.

Enable them in `terraform.tfvars`:

```hcl
enable_security_tool = true

security_tool_git_repo_url = "https://labs.gauntletai.com/jayceparabellum/ship.git"
security_tool_git_branch   = "ShipShape-Security-Tool"

# Optional, only needed if CodeBuild cannot clone the repository anonymously.
security_tool_git_token_parameter_name = "/ship/prod/SECURITY_TOOL_GIT_TOKEN"

# Optional active probe target. Leave blank to run static/config/dependency audit only.
security_probe_api_url = "http://ship-api-prod.eba-yrjupwcv.us-east-2.elasticbeanstalk.com"
security_probe_web_url = "https://d9o5hawnpdm4g.cloudfront.net"
security_probe_email_parameter_name    = "/ship/prod/SECURITY_PROBE_EMAIL"
security_probe_password_parameter_name = "/ship/prod/SECURITY_PROBE_PASSWORD"

# Keep discovery non-blocking at first. Change to true once findings are triaged.
security_tool_fail_on_findings = false
```

## Token Setup

If Labs GitLab requires authentication from CodeBuild, create the token outside Terraform:

```bash
aws ssm put-parameter \
  --name /ship/prod/SECURITY_TOOL_GIT_TOKEN \
  --type SecureString \
  --value "<gitlab-token>" \
  --overwrite
```

Then set:

```hcl
security_tool_git_token_parameter_name = "/ship/prod/SECURITY_TOOL_GIT_TOKEN"
```

Active probe credentials should also be stored in SSM, not Terraform:

```bash
aws ssm put-parameter \
  --name /ship/prod/SECURITY_PROBE_EMAIL \
  --type SecureString \
  --value "dev@ship.local" \
  --overwrite

aws ssm put-parameter \
  --name /ship/prod/SECURITY_PROBE_PASSWORD \
  --type SecureString \
  --value "<probe-account-password>" \
  --overwrite
```

## Report Locations

Terraform outputs:

- `security_tool_report_bucket`
- `security_tool_codebuild_project`
- `security_tool_trigger_lambda`
- `security_tool_latest_report_prefix`

Reports are written to:

```text
s3://<security-tool-report-bucket>/runs/<run-id>/latest-security-report.json
s3://<security-tool-report-bucket>/runs/<run-id>/latest-security-report.md
s3://<security-tool-report-bucket>/runs/<run-id>/latest-probe-report.json
s3://<security-tool-report-bucket>/runs/<run-id>/latest-probe-report.md
s3://<security-tool-report-bucket>/latest/latest-security-report.json
s3://<security-tool-report-bucket>/latest/latest-security-report.md
s3://<security-tool-report-bucket>/latest/latest-probe-report.json
s3://<security-tool-report-bucket>/latest/latest-probe-report.md
```

Current production report prefix:

```text
s3://ship-prod-security-tool-743737183156/latest/
```

## Review Before Applying

This branch only defines the AWS services. Applying the Terraform should happen after review because it creates billable resources:

- 1 S3 bucket
- 1 Lambda function
- 1 CodeBuild project
- 2 CloudWatch log groups
- 1 EventBridge scheduled rule
- IAM roles and policies

Estimated idle cost is near zero. Costs accrue mainly when CodeBuild runs and when reports/logs are stored.
