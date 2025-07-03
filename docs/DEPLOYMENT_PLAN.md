# Deployment Plan for Rewind App

## Overview

This document outlines the complete deployment strategy for the Rewind podcast app when code is pushed to the `main` branch. The deployment process handles both frontend (React PWA) and backend (Lambda functions) components using AWS CDK for infrastructure management.

## Architecture Summary

- **Frontend**: React PWA hosted on S3 with CloudFront distribution
- **Backend**: Node.js Lambda functions with API Gateway
- **Database**: DynamoDB tables for data persistence
- **Authentication**: Amazon Cognito for user management
- **Infrastructure**: AWS CDK for Infrastructure as Code

## CI/CD Pipeline Strategy

### 1. GitHub Actions Workflow

#### Trigger Conditions

- Push to `main` branch
- Pull request to `main` branch (for validation only)
- Manual dispatch for hotfixes

#### Pipeline Stages

1. **Pre-deployment Validation**
   - Code quality checks (ESLint, Prettier)
   - TypeScript compilation
   - Unit tests (Vitest for both frontend and backend)
   - End-to-end tests (Playwright for frontend)
   - Security scanning

2. **Build Phase**
   - Frontend: Vite build with environment-specific configuration
   - Backend: TypeScript compilation to JavaScript
   - Infrastructure: CDK synthesis and validation

3. **Deployment Phase**
   - Infrastructure deployment (CDK stacks)
   - Backend deployment (Lambda functions)
   - Frontend deployment (S3 sync + CloudFront invalidation)

4. **Post-deployment Validation**
   - Health checks for API endpoints
   - Frontend accessibility verification
   - Smoke tests

### 2. Environment Configuration

#### Environment Variables

**Frontend (.env.production):**

```
VITE_API_BASE_URL=https://12c77xnz00.execute-api.us-east-1.amazonaws.com/v1
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=[FROM_CDK_OUTPUT]
VITE_COGNITO_USER_POOL_CLIENT_ID=[FROM_CDK_OUTPUT]
VITE_COGNITO_IDENTITY_POOL_ID=[FROM_CDK_OUTPUT]
```

**Backend (Lambda environment variables - set by CDK):**

```
USERS_TABLE=RewindUsers
PODCASTS_TABLE=RewindPodcasts
EPISODES_TABLE=RewindEpisodes
LISTENING_HISTORY_TABLE=RewindListeningHistory
SHARES_TABLE=RewindShares
USER_POOL_ID=[FROM_COGNITO]
USER_POOL_CLIENT_ID=[FROM_COGNITO]
```

#### AWS Secrets

- Store sensitive configuration in AWS Systems Manager Parameter Store
- Access via IAM roles, not hardcoded credentials

### 3. Deployment Steps

#### Step 1: Pre-deployment Validation

```bash
# Install dependencies
npm ci

# Code quality and compilation
npm run lint
npm run format:check
npm run build

# Run tests
npm run test
npm run test:e2e
```

#### Step 2: Infrastructure Deployment

```bash
# Navigate to infrastructure directory
cd infra

# Install CDK dependencies
npm ci

# Build infrastructure code
npm run build

# Deploy all stacks with dependency order
npm run deploy
```

**Stack Deployment Order:**

1. `RewindDataStack` (DynamoDB tables, Cognito)
2. `RewindBackendStack` (Lambda functions, API Gateway)
3. `RewindFrontendStack` (S3 bucket, CloudFront)

#### Step 3: Backend Deployment

```bash
# Build backend code
cd backend
npm run build

# Lambda functions are deployed via CDK stack
# Code is packaged from dist/ directory
```

#### Step 4: Frontend Deployment

```bash
# Build frontend with production configuration
cd frontend
npm run build

# Upload to S3 and invalidate CloudFront
aws s3 sync dist/ s3://[BUCKET_NAME]/ --delete
aws cloudfront create-invalidation --distribution-id [DISTRIBUTION_ID] --paths "/*"
```

### 4. Rollback Strategy

#### Automated Rollback Triggers

- API Gateway 5xx error rate > 5% for 5 minutes
- Frontend accessibility score < 90%
- Critical Lambda function failures

#### Rollback Process

1. **Infrastructure Rollback**: Use CDK to revert to previous stack version
2. **Frontend Rollback**: Deploy previous S3 version with CloudFront invalidation
3. **Database**: DynamoDB point-in-time recovery if needed (manual process)

#### Manual Rollback Commands

```bash
# Get stack drift and changes
cdk diff

# Rollback to previous version
git checkout [PREVIOUS_COMMIT]
cdk deploy --all

# Or destroy and recreate if needed
cdk destroy --all
cdk deploy --all
```

### 5. Monitoring and Alerts

#### CloudWatch Metrics

- Lambda function duration, errors, and invocations
- API Gateway request count, latency, and 4xx/5xx errors
- CloudFront cache hit ratio and origin request count
- DynamoDB read/write capacity and throttles

#### Alerts Setup

```yaml
Alerts:
  - LambdaErrors: > 5% in 5 minutes
  - ApiLatency: > 2 seconds average over 5 minutes
  - DynamoDBThrottles: > 0 in 1 minute
  - CloudFrontOriginErrors: > 1% in 5 minutes
```

#### Cost Monitoring

- Set billing alerts at $50/month threshold
- Monitor AWS resource usage weekly
- Optimize based on CloudWatch cost explorer

### 6. Security Considerations

#### Deployment Security

- Use IAM roles with least privilege principles
- Store secrets in AWS Systems Manager Parameter Store
- Enable MFA for production deployments
- Rotate AWS access keys regularly

#### Runtime Security

- Lambda functions run with minimal IAM permissions
- API Gateway with AWS WAF for DDoS protection
- S3 bucket policies restrict CloudFront-only access
- DynamoDB encryption at rest with AWS KMS

### 7. Performance Optimization

#### Frontend Optimization

- Vite build optimization with tree shaking
- CloudFront caching with appropriate TTL settings
- PWA caching strategies for offline functionality
- Image optimization and lazy loading

#### Backend Optimization

- Lambda cold start mitigation with provisioned concurrency
- DynamoDB query optimization with proper indexing
- API Gateway caching for frequently accessed endpoints
- Connection pooling for external API calls

### 8. Disaster Recovery

#### Backup Strategy

- DynamoDB point-in-time recovery enabled
- S3 versioning for frontend assets
- CDK stack templates in version control
- Infrastructure configuration documented

#### Recovery Procedures

- Cross-region deployment capability for failover
- Database restore procedures documented
- Frontend rollback process automated
- API endpoint failover configuration

### 9. Environment-Specific Configurations

#### Development Environment

- Separate AWS account or isolated stacks
- Reduced monitoring and alerting
- Faster deployment cycles with reduced validation

#### Production Environment

- Full monitoring and alerting enabled
- Blue-green deployment strategy for zero-downtime
- Enhanced security with additional WAF rules
- Performance monitoring with detailed metrics

### 10. Deployment Checklist

**Pre-deployment:**

- [ ] All tests passing
- [ ] Code review completed
- [ ] Security scan passed
- [ ] Documentation updated
- [ ] Environment variables configured

**During deployment:**

- [ ] Monitor deployment progress
- [ ] Verify CDK stack outputs
- [ ] Check Lambda function health
- [ ] Validate API endpoints
- [ ] Test frontend functionality

**Post-deployment:**

- [ ] Smoke tests completed
- [ ] Performance metrics within thresholds
- [ ] Monitor for errors for 30 minutes
- [ ] Update deployment documentation
- [ ] Notify team of successful deployment

## Implementation Timeline

1. **Week 1**: Set up GitHub Actions workflow and basic CI/CD
2. **Week 2**: Implement monitoring, alerting, and rollback procedures
3. **Week 3**: Security hardening and performance optimization
4. **Week 4**: Documentation completion and team training

## Maintenance and Updates

- Review deployment processes monthly
- Update dependencies quarterly
- Security audit semi-annually
- Performance optimization review quarterly
- Cost optimization review monthly

## References

- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Project organization
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) - AWS infrastructure details
- [AWS_CONFIG.md](./AWS_CONFIG.md) - CDK configuration specifics
- [ERROR_HANDLING.md](./ERROR_HANDLING.md) - Error handling strategies
