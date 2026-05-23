# ShipShape Security Tool AWS Resources
#
# Scheduled Category 8 runner:
# - EventBridge invokes Lambda on a schedule
# - Lambda starts CodeBuild
# - CodeBuild clones the ShipShape security branch
# - Runs the static scanner and optional live-app probe
# - Uploads JSON/Markdown reports to encrypted S3

locals {
  security_tool_name        = "${var.project_name}-${var.environment}-security-tool"
  security_tool_bucket_name = "${var.project_name}-${var.environment}-security-tool-${data.aws_caller_identity.current.account_id}"
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "security_tool_reports" {
  count  = var.enable_security_tool ? 1 : 0
  bucket = local.security_tool_bucket_name

  tags = {
    Name = "${var.project_name}-security-tool-reports"
  }
}

resource "aws_s3_bucket_public_access_block" "security_tool_reports" {
  count  = var.enable_security_tool ? 1 : 0
  bucket = aws_s3_bucket.security_tool_reports[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "security_tool_reports" {
  count  = var.enable_security_tool ? 1 : 0
  bucket = aws_s3_bucket.security_tool_reports[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "security_tool_reports" {
  count  = var.enable_security_tool ? 1 : 0
  bucket = aws_s3_bucket.security_tool_reports[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "security_tool_reports" {
  count  = var.enable_security_tool ? 1 : 0
  bucket = aws_s3_bucket.security_tool_reports[0].id

  rule {
    id     = "expire-old-security-reports"
    status = "Enabled"

    filter {
      prefix = "runs/"
    }

    expiration {
      days = 180
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_cloudwatch_log_group" "security_tool" {
  count             = var.enable_security_tool ? 1 : 0
  name              = "/aws/codebuild/${local.security_tool_name}"
  retention_in_days = 90

  tags = {
    Name = "${var.project_name}-security-tool-logs"
  }
}

resource "aws_cloudwatch_log_group" "security_tool_lambda" {
  count             = var.enable_security_tool ? 1 : 0
  name              = "/aws/lambda/${local.security_tool_name}-trigger"
  retention_in_days = 90

  tags = {
    Name = "${var.project_name}-security-tool-lambda-logs"
  }
}

resource "aws_iam_role" "security_tool_codebuild" {
  count = var.enable_security_tool ? 1 : 0
  name  = "${local.security_tool_name}-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-security-tool-codebuild-role"
  }
}

resource "aws_iam_role_policy" "security_tool_codebuild" {
  count = var.enable_security_tool ? 1 : 0
  name  = "${local.security_tool_name}-codebuild-policy"
  role  = aws_iam_role.security_tool_codebuild[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.security_tool[0].arn}:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.security_tool_reports[0].arn,
          "${aws_s3_bucket.security_tool_reports[0].arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "ssm.${var.aws_region}.amazonaws.com"
          }
        }
      }
    ]
  })
}

resource "aws_codebuild_project" "security_tool" {
  count         = var.enable_security_tool ? 1 : 0
  name          = local.security_tool_name
  description   = "Runs the ShipShape security audit tool and stores reports in S3"
  service_role  = aws_iam_role.security_tool_codebuild[0].arn
  build_timeout = 30

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = var.security_tool_compute_type
    image                       = "aws/codebuild/amazonlinux-x86_64-standard:5.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "SECURITY_TOOL_REPO_URL"
      value = var.security_tool_git_repo_url
    }

    environment_variable {
      name  = "SECURITY_TOOL_BRANCH"
      value = var.security_tool_git_branch
    }

    environment_variable {
      name  = "SECURITY_TOOL_REPORT_BUCKET"
      value = aws_s3_bucket.security_tool_reports[0].id
    }

    environment_variable {
      name  = "SECURITY_AUDIT_FAIL_ON_FINDINGS"
      value = var.security_tool_fail_on_findings ? "1" : "0"
    }

    environment_variable {
      name  = "SECURITY_TOOL_GIT_TOKEN_PARAMETER_NAME"
      value = var.security_tool_git_token_parameter_name
    }

    environment_variable {
      name  = "SECURITY_PROBE_API_URL"
      value = var.security_probe_api_url
    }

    environment_variable {
      name  = "SECURITY_PROBE_WEB_URL"
      value = var.security_probe_web_url
    }

    environment_variable {
      name  = "SECURITY_PROBE_EMAIL_PARAMETER_NAME"
      value = var.security_probe_email_parameter_name
    }

    environment_variable {
      name  = "SECURITY_PROBE_PASSWORD_PARAMETER_NAME"
      value = var.security_probe_password_parameter_name
    }
  }

  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.security_tool[0].name
      status     = "ENABLED"
    }
  }

  source {
    type      = "NO_SOURCE"
    buildspec = <<-BUILDSPEC
      version: 0.2

      phases:
        install:
          runtime-versions:
            nodejs: 20
          commands:
            - npm install -g corepack
            - corepack enable
            - yum install -y git jq
        pre_build:
          commands:
            - export RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$CODEBUILD_BUILD_NUMBER"
            - export CLONE_URL="$SECURITY_TOOL_REPO_URL"
            - |
              if [ -n "$SECURITY_TOOL_GIT_TOKEN_PARAMETER_NAME" ]; then
                TOKEN="$(aws ssm get-parameter --name "$SECURITY_TOOL_GIT_TOKEN_PARAMETER_NAME" --with-decryption --query Parameter.Value --output text)"
                CLONE_URL="$(echo "$SECURITY_TOOL_REPO_URL" | sed "s#https://#https://oauth2:$TOKEN@#")"
              fi
            - git clone --depth 1 --branch "$SECURITY_TOOL_BRANCH" "$CLONE_URL" repo
        build:
          commands:
            - cd repo
            - corepack pnpm install --frozen-lockfile
            - SECURITY_AUDIT_OUT_DIR=".security-tool-output" corepack pnpm security:audit
            - |
              if [ -n "$SECURITY_PROBE_API_URL" ]; then
                if [ -z "$SECURITY_PROBE_WEB_URL" ]; then
                  echo "SECURITY_PROBE_WEB_URL is required when SECURITY_PROBE_API_URL is set"
                  exit 1
                fi
                if [ -z "$SECURITY_PROBE_EMAIL_PARAMETER_NAME" ] || [ -z "$SECURITY_PROBE_PASSWORD_PARAMETER_NAME" ]; then
                  echo "Probe credential SSM parameter names are required when SECURITY_PROBE_API_URL is set"
                  exit 1
                fi
                PROBE_EMAIL="$(aws ssm get-parameter --name "$SECURITY_PROBE_EMAIL_PARAMETER_NAME" --with-decryption --query Parameter.Value --output text)"
                PROBE_PASSWORD="$(aws ssm get-parameter --name "$SECURITY_PROBE_PASSWORD_PARAMETER_NAME" --with-decryption --query Parameter.Value --output text)"
                SECURITY_PROBE_OUT_DIR=".security-tool-output" corepack pnpm security:probe -- --api-url "$SECURITY_PROBE_API_URL" --web-url "$SECURITY_PROBE_WEB_URL" --email "$PROBE_EMAIL" --password "$PROBE_PASSWORD"
              else
                echo "SECURITY_PROBE_API_URL not set; skipping active live-app probe"
              fi
        post_build:
          commands:
            - cd "$CODEBUILD_SRC_DIR/repo"
            - aws s3 cp .security-tool-output/latest-security-report.json "s3://$SECURITY_TOOL_REPORT_BUCKET/runs/$RUN_ID/latest-security-report.json"
            - aws s3 cp .security-tool-output/latest-security-report.md "s3://$SECURITY_TOOL_REPORT_BUCKET/runs/$RUN_ID/latest-security-report.md"
            - aws s3 cp .security-tool-output/latest-security-report.json "s3://$SECURITY_TOOL_REPORT_BUCKET/latest/latest-security-report.json"
            - aws s3 cp .security-tool-output/latest-security-report.md "s3://$SECURITY_TOOL_REPORT_BUCKET/latest/latest-security-report.md"
            - |
              if [ -f .security-tool-output/latest-probe-report.json ]; then
                aws s3 cp .security-tool-output/latest-probe-report.json "s3://$SECURITY_TOOL_REPORT_BUCKET/runs/$RUN_ID/latest-probe-report.json"
                aws s3 cp .security-tool-output/latest-probe-report.md "s3://$SECURITY_TOOL_REPORT_BUCKET/runs/$RUN_ID/latest-probe-report.md"
                aws s3 cp .security-tool-output/latest-probe-report.json "s3://$SECURITY_TOOL_REPORT_BUCKET/latest/latest-probe-report.json"
                aws s3 cp .security-tool-output/latest-probe-report.md "s3://$SECURITY_TOOL_REPORT_BUCKET/latest/latest-probe-report.md"
              fi
            - echo "Security report uploaded to s3://$SECURITY_TOOL_REPORT_BUCKET/runs/$RUN_ID/"
    BUILDSPEC
  }

  tags = {
    Name = "${var.project_name}-security-tool-codebuild"
  }
}

data "archive_file" "security_tool_trigger" {
  count       = var.enable_security_tool ? 1 : 0
  type        = "zip"
  source_dir  = "${path.module}/../../lambda/security-tool-trigger"
  output_path = "${path.module}/.terraform/security-tool-trigger.zip"
}

resource "aws_iam_role" "security_tool_lambda" {
  count = var.enable_security_tool ? 1 : 0
  name  = "${local.security_tool_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-security-tool-lambda-role"
  }
}

resource "aws_iam_role_policy" "security_tool_lambda" {
  count = var.enable_security_tool ? 1 : 0
  name  = "${local.security_tool_name}-lambda-policy"
  role  = aws_iam_role.security_tool_lambda[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "codebuild:StartBuild"
        ]
        Resource = aws_codebuild_project.security_tool[0].arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.security_tool_lambda[0].arn}:*"
      }
    ]
  })
}

resource "aws_lambda_function" "security_tool_trigger" {
  count            = var.enable_security_tool ? 1 : 0
  function_name    = "${local.security_tool_name}-trigger"
  description      = "Starts the ShipShape security audit CodeBuild job"
  role             = aws_iam_role.security_tool_lambda[0].arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.security_tool_trigger[0].output_path
  source_code_hash = data.archive_file.security_tool_trigger[0].output_base64sha256
  timeout          = 30

  environment {
    variables = {
      CODEBUILD_PROJECT_NAME = aws_codebuild_project.security_tool[0].name
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.security_tool_lambda,
  ]

  tags = {
    Name = "${var.project_name}-security-tool-lambda"
  }
}

resource "aws_cloudwatch_event_rule" "security_tool_schedule" {
  count               = var.enable_security_tool ? 1 : 0
  name                = "${local.security_tool_name}-schedule"
  description         = "Scheduled ShipShape security audit run"
  schedule_expression = var.security_tool_schedule_expression
}

resource "aws_cloudwatch_event_target" "security_tool_schedule" {
  count     = var.enable_security_tool ? 1 : 0
  rule      = aws_cloudwatch_event_rule.security_tool_schedule[0].name
  target_id = "lambda-security-tool-trigger"
  arn       = aws_lambda_function.security_tool_trigger[0].arn
}

resource "aws_lambda_permission" "security_tool_schedule" {
  count         = var.enable_security_tool ? 1 : 0
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.security_tool_trigger[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.security_tool_schedule[0].arn
}
