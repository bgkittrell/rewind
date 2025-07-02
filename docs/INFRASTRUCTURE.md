# Rewind Infrastructure Specifications

## Overview
This document outlines the AWS infrastructure for Rewind, a mobile-first Progressive Web App (PWA) targeting podcast enthusiasts aged 35+. The setup leverages serverless resources for low-cost hosting and scalability, aligning with the architecture (see PLAN.md), CDK configuration (see AWS_CONFIG.md), and deployment requirements.

## Cloud Provider
- **Provider**: Amazon Web Services (AWS)
- **Regions**: Primary: `us-east-1` (N. Virginia), with failover to `us-west-2` (Oregon)
- **Management**: AWS CDK for Infrastructure as Code (IaC)

## Infrastructure Components
### Frontend Hosting
- **S3 Bucket**:
  - Name: `rewind-frontend-bucket-${AWS::AccountId}`
  - Configuration: Static website hosting, public read access, versioning enabled.
  - Deployment: Sync `dist/` directory (Vite build) using CDK custom resource.
- **CloudFront Distribution**:
  - Origin: S3 bucket.
  - Default cache behavior: Serve `index.html` for SPA routing.
  - SSL: Managed certificate via AWS Certificate Manager (ACM).
  - Custom domain: `rewindpodcast.com` (route via Route 53).
  - Invalidation: Automatic on deploy to clear cache.

### Backend Hosting
- **API Gateway**:
  - REST API with CORS enabled.
  - Stages: `dev`, `prod`.
  - Endpoints: Mapped to Lambda functions (e.g., `/podcasts/add`, `/share/generate`).
  - Throttling: 100 requests/second per stage.
- **Lambda Functions**:
  - Runtimes: Node.js 18.x.
  - Functions: `podcastHandler`, `recommendationHandler`, `shareHandler`.
  - Packaging: TypeScript compiled with `esbuild`, deployed via CDK.
  - Environment: `DYNAMODB_TABLE_NAME`, `PERSONALIZE_CAMPAIGN_ARN`.
  - Timeout: 10 seconds, memory: 256 MB.
- **EventBridge**:
  - Rule: Daily schedule (Cron: `0 0 * * ? *` UTC) for RSS updates.
  - Target: `podcastHandler` Lambda.

### Database
- **DynamoDB**:
  - Table: `RewindDataTable` (see DATABASE.md).
  - Billing Mode: Pay-per-request.
  - Auto-scaling: Enabled with target utilization at 70%.
  - Streams: Enabled for Personalize data ingestion.

### Recommendation Engine
- **AWS Personalize**:
  - Dataset Group: `RewindDatasetGroup`.
  - Campaign: SIMS recipe, trained weekly via EventBridge.
  - Data Source: DynamoDB Streams to Personalize batch export.

### Authentication
- **Amazon Cognito**:
  - User Pool ID and Client ID configured in CDK environment.
  - JWT validation in API Gateway authorizer.

### Monitoring
- **CloudWatch**:
  - Logs: Capture Lambda errors and API metrics.
  - Alarms: Trigger on 5% `500` errors over 5 minutes.
- **Cost Explorer**:
  - Set budget alerts at $50/month.
  - Track usage of Lambda, DynamoDB, Personalize.

## Deployment Process
- **Bootstrap**:
  ```
  cdk bootstrap aws://<account-id>/us-east-1
  ```
- **Synth and Deploy**:
  ```
  cdk synth
  cdk deploy --all
  ```
- **Rollback**:
  - Use CDK `diff` to identify changes, revert with `cdk destroy` if needed.
- **CI/CD** (Optional)**:
  - Integrate with AWS CodePipeline for automated deploys.

## Cost Management
- **Optimization**:
  - Lambda: Minimum execution duration, cold start mitigation with provisioned concurrency.
  - DynamoDB: Efficient queries, auto-scaling.
  - Personalize: Batch inference, free tier usage.
- **Monitoring**:
  - Cost Explorer with weekly reports.
  - Set SNS notifications for budget overruns.

## Security
- **IAM Roles**:
  - Least privilege for Lambda (DynamoDB, S3, Personalize).
  - Separate roles for deployment and runtime.
- **Networking**:
  - API Gateway with WAF for DDoS protection.
  - S3 bucket policy restricts access to CloudFront.
- **Data**:
  - Encrypt DynamoDB at rest with KMS.
  - Secure S3 objects with SSE-S3.

## Notes for AI Agent
- Configure infrastructure via AWS CDK TypeScript.
- Test deployment in `dev` stage first.
- Monitor costs and adjust auto-scaling as needed.
- Commit CDK changes to Git after each update.
- Report issues (e.g., region latency) in PLAN.md.

## References
- PLAN.md: Deployment and monitoring tasks.
- AWS_CONFIG.md: CDK stack definitions.
- UI_TECH.md: Frontend hosting integration.
- BACKEND_API.md: API Gateway endpoints.
- BACKEND_LOGIC.md: Lambda logic.
- DATABASE.md: DynamoDB setup.
- RECOMMENDATION_ENGINE.md: Personalize integration.
- 
