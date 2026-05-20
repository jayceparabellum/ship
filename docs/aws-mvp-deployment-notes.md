# AWS MVP Deployment Notes

Goal: deploy `jayceparabellum/ship` using the government-compliant AWS infrastructure plan.

## Service Shape

Use the split deployment model from `INFRASTRUCTURE.md`:

1. Terraform provisions infrastructure that changes rarely.
2. Elastic Beanstalk deploys the Express API and WebSocket server.
3. S3 and CloudFront host the React static frontend.

## Infrastructure

Terraform provisions:

- VPC `10.0.0.0/16`
- Public subnets for the ALB
- Private subnets for Elastic Beanstalk and Aurora
- Aurora Serverless v2 PostgreSQL 16
- SSM Parameter Store entries for secrets/configuration
- S3 bucket and CloudFront distribution for the frontend
- Security groups for ALB, EB, and Aurora

Deploy command:

```bash
./scripts/deploy-infrastructure.sh
```

## API

The API deploys to Elastic Beanstalk as a Dockerized Express application with WebSocket support through ALB sticky sessions.

Deploy command:

```bash
./scripts/deploy-api.sh
```

Required configuration:

```text
DATABASE_URL=<Aurora PostgreSQL connection string from SSM>
SESSION_SECRET=<SSM secure parameter>
CORS_ORIGIN=<CloudFront/app domain>
APP_BASE_URL=<CloudFront/app domain>
PORT=<Elastic Beanstalk configured port>
```

## Frontend

The frontend builds with Vite and deploys static assets to S3 behind CloudFront.

Deploy command:

```bash
./scripts/deploy-frontend.sh
```

Required configuration:

```text
VITE_API_URL=<API domain or ALB/EB API URL>
VITE_APP_ENV=production
```

## Audit Measurement After Deploy

After AWS deployment is live:

1. Run migrations and seed representative data.
2. Use the deployed app to identify the five key API endpoints from real user flows.
3. Benchmark those endpoints with `autocannon` at 10, 25, and 50 concurrent connections.
4. Enable PostgreSQL query logging and capture query counts per flow.
5. Run `EXPLAIN ANALYZE` on slow queries.
6. Run Lighthouse and axe on the major frontend pages.
7. Capture console/server logs for runtime error and edge-case testing.

## MVP Cost Assumption

The target development deployment is approximately `$80/month`:

- Elastic Beanstalk `t3.small`: ~$15
- Aurora Serverless v2 `0.5 ACU min`: ~$43
- ALB minimal traffic: ~$20
- CloudFront 10GB transfer: ~$1
- S3 static hosting: ~$1
- Standard SSM parameters: free
