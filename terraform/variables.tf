variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name (used for resource naming)"
  type        = string
  default     = "ship"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "ship_main"
}

variable "route53_zone_id" {
  description = "Route53 Hosted Zone ID for DNS records (optional)"
  type        = string
  default     = ""
}

variable "api_domain_name" {
  description = "Custom domain for API (e.g., api.example.gov)"
  type        = string
  default     = ""
}

variable "app_domain_name" {
  description = "Custom domain for frontend (e.g., app.example.gov)"
  type        = string
  default     = ""
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets (required for EB Docker pulls)"
  type        = bool
  default     = true
}

variable "aurora_min_capacity" {
  description = "Aurora Serverless v2 minimum capacity (ACUs)"
  type        = number
  default     = 0.5
}

variable "aurora_max_capacity" {
  description = "Aurora Serverless v2 maximum capacity (ACUs)"
  type        = number
  default     = 4
}

variable "eb_environment_cname" {
  description = "Elastic Beanstalk environment CNAME for API routing through CloudFront"
  type        = string
  default     = ""
}

variable "upload_cors_origins" {
  description = "Allowed origins for file upload CORS (browser direct-to-S3 uploads)"
  type        = list(string)
  default     = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"]
}

variable "cloudfront_waf_web_acl_id" {
  description = "WAF WebACL ARN to attach to CloudFront distribution (optional, creates managed WAF if empty)"
  type        = string
  default     = ""
}

variable "enable_security_tool" {
  description = "Create AWS resources for scheduled ShipShape security audit runs"
  type        = bool
  default     = false
}

variable "security_tool_git_repo_url" {
  description = "Git repository URL for the security audit runner to clone"
  type        = string
  default     = "https://labs.gauntletai.com/jayceparabellum/ship.git"
}

variable "security_tool_git_branch" {
  description = "Git branch used by the security audit runner"
  type        = string
  default     = "ShipShape-Security-Tool"
}

variable "security_tool_git_token_parameter_name" {
  description = "Optional SSM SecureString parameter containing a GitLab token for cloning a private repository"
  type        = string
  default     = ""
}

variable "security_tool_schedule_expression" {
  description = "EventBridge schedule for security audit runs"
  type        = string
  default     = "rate(1 day)"
}

variable "security_tool_fail_on_findings" {
  description = "Make the CodeBuild job fail when the security audit reports findings"
  type        = bool
  default     = false
}

variable "security_tool_compute_type" {
  description = "CodeBuild compute type for the security audit runner"
  type        = string
  default     = "BUILD_GENERAL1_SMALL"
}

variable "security_probe_api_url" {
  description = "Optional live API URL for the active Category 8 security probe"
  type        = string
  default     = ""
}

variable "security_probe_web_url" {
  description = "Optional live web URL for the active Category 8 security probe"
  type        = string
  default     = ""
}

variable "security_probe_email_parameter_name" {
  description = "Optional SSM SecureString/String parameter containing the active security probe login email"
  type        = string
  default     = ""
}

variable "security_probe_password_parameter_name" {
  description = "Optional SSM SecureString parameter containing the active security probe login password"
  type        = string
  default     = ""
}
