#!/bin/bash
set -e

echo "=========================================="
echo "Ship - Infrastructure Deployment"
echo "=========================================="
echo ""

ENV="${1:-dev}"
if [[ ! "$ENV" =~ ^(dev|shadow|prod)$ ]]; then
    echo "Usage: $0 [dev|shadow|prod]"
    echo ""
    echo "Examples:"
    echo "  $0 dev     # Deploy dev infrastructure"
    echo "  $0 shadow  # Deploy shadow/UAT infrastructure"
    echo "  $0 prod    # Deploy prod infrastructure"
    exit 1
fi

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "Error: terraform is not installed"
    echo "Install with: brew install terraform"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Sync terraform config from SSM (source of truth)
echo "Syncing Terraform config from SSM for $ENV..."
"$SCRIPT_DIR/sync-terraform-config.sh" "$ENV"
echo ""

# Navigate to environment-specific terraform directory
if [ "$ENV" = "prod" ]; then
    cd "$SCRIPT_DIR/../terraform"
else
    cd "$SCRIPT_DIR/../terraform/environments/$ENV"
fi

echo "Step 1: Initializing Terraform..."
terraform init

echo ""
echo "Step 2: Planning infrastructure changes..."
terraform plan -out=tfplan

echo ""
echo "Step 3: Applying infrastructure changes..."
echo "This will create:"
echo "  - VPC with public/private subnets"
echo "  - Aurora Serverless v2 PostgreSQL cluster"
echo "  - SSM Parameter Store secrets"
echo "  - S3 bucket + CloudFront for frontend"
echo "  - Elastic Beanstalk application"
echo "  - Security groups and IAM roles"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
fi

terraform apply tfplan
rm tfplan

echo ""
echo "=========================================="
echo "Infrastructure deployment complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Run database migrations: pnpm --filter @ship/api db:seed"
echo "2. Deploy API: ./scripts/deploy-api.sh"
echo "3. Deploy frontend: ./scripts/deploy-frontend.sh"
echo ""
echo "Important outputs:"
terraform output
