# Rewind Infrastructure Specifications

## Overview

This document outlines the AWS infrastructure architecture for the Rewind backend, a mobile-first Progressive Web App (PWA) for podcast enthusiasts aged 35+. The infrastructure is designed for scalability, security, and cost-effectiveness, supporting the backend API (see BACKEND_API.md) and data storage (see DATABASE.md).

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CloudFront│────▶│   REST API  │────▶│   Lambda    │────▶│  DynamoDB   │
│  (Frontend) │     │   Gateway   │     │  Functions  │     │   Tables    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                            │                   │                   │
                            ▼                   ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
                    │  Cognito    │     │ CloudWatch  │     │     WAF     │
                    │ User Pool   │     │   Logs      │     │ (Security)  │
                    └─────────────┘     └─────────────┘     └─────────────┘
```

## 🚀 Current Infrastructure (Deployed)

### API Gateway - REST API ✅ DEPLOYED

- **Type**: REST API Gateway (not HTTP API v2)
- **Configuration**:
  - Stage: `prod`
  - CORS: Enabled for all origins during development
  - Authentication: Cognito User Pool Authorizer
  - Rate Limiting: API Gateway default throttling (10,000 requests/second)
  - Caching: Disabled (on-demand pricing)
  - Custom Domain: Not configured (using default AWS URL)
  - Binary Media Types: Not configured
  - Request Validation: Configured at method level
  - Logging: CloudWatch integration enabled
  - Metrics: CloudWatch custom metrics enabled

```typescript
// Current CDK Implementation
const api = new RestApi(this, 'RewindApi', {
  restApiName: 'Rewind API',
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS,
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: ['*'],
  },
  deploy: true,
  deployOptions: {
    stageName: 'prod',
    metricsEnabled: true,
    loggingLevel: MethodLoggingLevel.INFO,
    dataTraceEnabled: true,
  },
})

// Cognito User Pool Authorizer
const authorizer = new CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
  cognitoUserPools: [userPool],
  authorizerName: 'RewindAuthorizer',
  identitySource: 'method.request.header.Authorization',
})
```

### AWS Lambda Functions ✅ DEPLOYED

- **Runtime**: Node.js 18.x
- **Memory**: 1024 MB (adjustable based on performance)
- **Timeout**: 30 seconds
- **Environment Variables**: Injected via CDK outputs
- **Architecture**: ARM64 (Graviton2) for cost efficiency
- **Dead Letter Queue**: Configured for failed executions
- **Reserved Concurrency**: Not configured (uses account default)
- **Provisioned Concurrency**: Not configured (cold start acceptable)

#### Current Lambda Functions:

1. **Auth Handler** (`/auth/*` routes)
   - Cognito user management
   - JWT token validation
   - User profile operations

2. **Podcast Handler** (`/podcasts/*` routes)
   - RSS feed processing
   - Podcast CRUD operations
   - Episode metadata management

3. **Health Check Handler** (`/health` route)
   - API status monitoring
   - Basic connectivity validation

```typescript
// Current CDK Implementation
const lambdaFunction = new Function(this, 'RewindFunction', {
  runtime: Runtime.NODEJS_18_X,
  architecture: Architecture.ARM_64,
  handler: 'index.handler',
  code: Code.fromAsset('backend/dist'),
  environment: {
    USER_POOL_ID: userPool.userPoolId,
    USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
    DYNAMODB_TABLE_PODCASTS: tables.podcasts.tableName,
    DYNAMODB_TABLE_EPISODES: tables.episodes.tableName,
    DYNAMODB_TABLE_USERS: tables.users.tableName,
    DYNAMODB_TABLE_LISTENING_HISTORY: tables.listeningHistory.tableName,
    DYNAMODB_TABLE_SHARES: tables.shares.tableName,
  },
  timeout: Duration.seconds(30),
  memorySize: 1024,
  deadLetterQueue: dlq,
})
```

### Amazon Cognito ✅ DEPLOYED

- **User Pool**: `us-east-1_Cw78Mapt3`
- **User Pool Client**: `49kf2uvsl9vg08ka6o67ts41jj`
- **Hosted UI Domain**: `rewind-730420835413-us-east-1.auth.us-east-1.amazoncognito.com`
- **Configuration**:
  - Sign-up: Email verification required
  - MFA: Disabled (can be enabled later)
  - Password Policy: AWS default (8 chars, uppercase, lowercase, numbers)
  - Token Expiration: 60 minutes (access), 30 days (refresh)
  - Attributes: Email (required), Name (optional)
  - OAuth Flows: Authorization Code, Implicit (for future social login)
  - OAuth Scopes: `email`, `openid`, `profile`

```typescript
// Current CDK Implementation
const userPool = new UserPool(this, 'RewindUserPool', {
  userPoolName: 'RewindUserPool',
  selfSignUpEnabled: true,
  signInAliases: {
    email: true,
  },
  passwordPolicy: {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireDigits: true,
    requireSymbols: false,
  },
  accountRecovery: AccountRecovery.EMAIL_ONLY,
  standardAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    givenName: {
      required: false,
      mutable: true,
    },
  },
})
```

### DynamoDB Tables ✅ DEPLOYED

- **Billing Mode**: On-demand (pay-per-request)
- **Backup**: Point-in-time recovery enabled
- **Encryption**: AWS managed keys
- **Tables**: Users, Podcasts, Episodes, ListeningHistory, Shares
- **Global Secondary Indexes**: RssUrlIndex, ReleaseDateIndex
- **Time To Live**: Configured on Shares table

### CloudWatch Logging ✅ DEPLOYED

- **Log Groups**: Automatically created for each Lambda function
- **Log Retention**: 30 days (configurable)
- **Structured Logging**: JSON format with correlation IDs
- **Metrics**: Custom metrics for business logic
- **Alarms**: Not yet configured

### IAM Roles and Policies ✅ DEPLOYED

- **Lambda Execution Role**: Automatically created by CDK
- **Permissions**:
  - DynamoDB: Read/Write access to all tables
  - CloudWatch: Logs and metrics
  - Cognito: User management operations
  - VPC: Not configured (Lambda runs in AWS VPC)

## 📋 Planned Infrastructure Improvements

_Future enhancements to be implemented:_

### API Gateway Enhancements (Phase 2)

- **Custom Domain**: Map to `api.rewindpodcast.com`
- **WAF Integration**: DDoS protection and rate limiting
- **API Caching**: Cache GET requests for podcast metadata
- **Request/Response Compression**: Reduce bandwidth usage
- **API Key Management**: For third-party integrations

### Lambda Optimizations (Phase 2)

- **Provisioned Concurrency**: For frequently-called functions
- **Layer Configuration**: Shared dependencies optimization
- **X-Ray Tracing**: Distributed tracing for performance monitoring
- **Environment-specific Configurations**: Dev/Staging/Prod separation

### Monitoring and Alerting (Phase 2)

- **CloudWatch Alarms**: Error rate, latency, and throttling alerts
- **SNS Notifications**: Email/SMS alerts for critical issues
- **AWS X-Ray**: Performance tracing and bottleneck identification
- **Custom Dashboards**: Business metrics and system health

### Security Enhancements (Phase 3)

- **VPC Configuration**: Private subnets for Lambda functions
- **Secrets Manager**: Secure credential management
- **KMS Encryption**: Customer-managed keys for sensitive data
- **Security Groups**: Network-level access control

### CDN and Performance (Phase 3)

- **CloudFront**: Global content delivery for static assets
- **S3 Integration**: Podcast episode caching and delivery
- **Edge Locations**: Reduced latency for global users
- **HTTP/2 Support**: Improved connection efficiency

## Deployment Architecture

### Current Deployment (CDK v2)

```typescript
// infra/bin/rewind.ts
const app = new App()

new RewindDataStack(app, 'RewindDataStack', {
  env: { region: 'us-east-1' },
})

new RewindBackendStack(app, 'RewindBackendStack', {
  env: { region: 'us-east-1' },
  tables: dataStack.tables,
})

new RewindFrontendStack(app, 'RewindFrontendStack', {
  env: { region: 'us-east-1' },
  apiUrl: backendStack.apiUrl,
  userPoolId: backendStack.userPoolId,
  userPoolClientId: backendStack.userPoolClientId,
})
```

### Multi-Environment Support (Planned)

- **Development**: `dev` stage with reduced resources
- **Staging**: `staging` stage with production-like configuration
- **Production**: `prod` stage with full security and monitoring

## Cost Optimization

### Current Approach

- **On-demand Pricing**: Pay only for actual usage
- **ARM64 Architecture**: 34% cost savings on Lambda
- **Efficient Memory Allocation**: Right-sized Lambda functions
- **DynamoDB On-demand**: No provisioned capacity waste

### Planned Optimizations

- **Reserved Capacity**: For predictable workloads
- **Spot Instances**: For batch processing workloads
- **Resource Scheduling**: Automated scaling based on usage patterns
- **Cost Monitoring**: Budget alerts and usage optimization

## Security Configuration

### Current Security ✅ DEPLOYED

- **HTTPS Only**: All API endpoints use TLS 1.2+
- **Cognito Authentication**: JWT-based user authentication
- **IAM Roles**: Least privilege access principles
- **CORS Configuration**: Controlled cross-origin requests
- **Input Validation**: Request validation at API Gateway level

### Planned Security Enhancements

- **WAF Rules**: SQL injection, XSS, and rate limiting protection
- **API Throttling**: Advanced rate limiting per user/IP
- **Data Encryption**: At-rest and in-transit encryption
- **Audit Logging**: Comprehensive security event tracking

## Environment Variables

### Current Management

Environment variables are managed through CDK outputs and deployment scripts:

```typescript
// Injected via CDK
environment: {
  USER_POOL_ID: userPool.userPoolId,
  USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
  DYNAMODB_TABLE_PODCASTS: tables.podcasts.tableName,
  DYNAMODB_TABLE_EPISODES: tables.episodes.tableName,
  DYNAMODB_TABLE_USERS: tables.users.tableName,
  DYNAMODB_TABLE_LISTENING_HISTORY: tables.listeningHistory.tableName,
  DYNAMODB_TABLE_SHARES: tables.shares.tableName,
}
```

### Frontend Environment Variables

- Generated during deployment via `scripts/deploy.sh`
- Written to `.env.production` file automatically
- No manual environment file management required

## Implementation Status

### Phase 1 - Complete ✅

- ✅ Basic REST API Gateway with Cognito authorization
- ✅ Lambda functions for core functionality
- ✅ DynamoDB tables with proper access patterns
- ✅ CloudWatch logging and basic monitoring
- ✅ Automated deployment with CDK

### Phase 2 - Next Sprint

- 🚧 API Gateway custom domain and WAF
- 🚧 Enhanced monitoring and alerting
- 🚧 Lambda optimization (layers, tracing)
- 🚧 Multi-environment deployment

### Phase 3 - Advanced Features

- 📋 VPC configuration for enhanced security
- 📋 CloudFront CDN for global performance
- 📋 Advanced cost optimization strategies
- 📋 Disaster recovery and backup automation

## Notes for AI Agent

- Use AWS CDK v2 for all infrastructure as code ✅
- Follow AWS Well-Architected Framework principles ✅
- Implement proper IAM roles with least privilege ✅
- Use REST API Gateway with Cognito User Pool authorizer ✅
- Enable CloudWatch logging for all services ✅
- Implement proper error handling and monitoring ✅
- Use ARM64 architecture for Lambda cost savings ✅
- Test deployment in development environment before production ✅
- Commit infrastructure changes to Git after each update ✅
- Report issues or unclear requirements in PLAN.md

## References

- BACKEND_API.md: API endpoint specifications and authentication
- DATABASE.md: DynamoDB schema and data access patterns
- AWS_CONFIG.md: Detailed AWS service configurations
- PLAN.md: Development phases and progress tracking
- DEPLOYMENT_SETUP.md: Deployment procedures and environment management
