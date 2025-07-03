# Rewind AWS CDK Configuration Specifications

## Overview

This document defines the AWS CDK configuration for Rewind, a mobile-first Progressive Web App (PWA) for podcast enthusiasts aged 35+. The configuration sets up serverless infrastructure using AWS Lambda, API Gateway, S3, CloudFront, DynamoDB, and Personalize, aligning with the architecture (see PLAN.md) and backend requirements (see BACKEND_API.md).

## CDK Setup

- **Version**: AWS CDK v2
- **Language**: TypeScript
- **Dependencies**:
  ```
  npm install -g aws-cdk
  npm install aws-cdk-lib constructs @types/node typescript ts-node
  ```
- **Project Structure**:
  - `lib/`: CDK stack definitions.
  - `bin/`: Entry point for CDK app.
  - `cdk.json`: CDK configuration.

## Stacks

### RewindFrontendStack

- **Description**: Hosts the frontend on S3 with CloudFront distribution.
- **Resources**:
  - **S3 Bucket**:
    - Name: `rewind-frontend-bucket-${this.account}`
    - Configuration: Static website hosting, public read access via CloudFront OAI.
    - Versioning: Enabled for rollback capability.
  - **CloudFront Distribution**:
    - Origin: S3 bucket with Origin Access Identity (OAI).
    - Default cache behavior: Serve index.html for SPA routing.
    - Custom error pages: 404 and 403 redirect to index.html.
    - SSL: Managed certificate via AWS Certificate Manager (ACM).
    - Custom domain: `rewindpodcast.com` (optional, configured via Route 53).
  - **Route 53** (Optional):
    - Hosted zone for custom domain.
    - CNAME record pointing to CloudFront distribution.
- **Deployment**:
  - Use `BucketDeployment` construct to sync frontend build (`dist/`) to S3.
  - Automatic CloudFront invalidation on deploy.

### RewindBackendStack

- **Description**: Manages Lambda functions, API Gateway HTTP API, and DynamoDB.
- **Resources**:
  - **API Gateway HTTP API**:
    - HTTP API with CORS enabled for all origins in development.
    - Built-in JWT authorizer for Amazon Cognito integration (no Lambda required).
    - Stages: `dev`, `prod`.
    - Custom domain: `api.rewindpodcast.com` (optional).
    - Request validation and throttling (10000 requests/second).
  - **Lambda Functions**:
    - Runtime: Node.js 18.x.
    - Functions:
      - `podcastHandler`: Manages podcast CRUD operations.
      - `episodeHandler`: Manages episode operations and playback tracking.
      - `recommendationHandler`: Provides episode recommendations.
      - `shareHandler`: Handles library sharing functionality.
    - Packaging: TypeScript compiled with esbuild, deployed via CDK.
    - Environment variables: `DYNAMODB_TABLE_PREFIX` (Cognito validation handled by API Gateway).
    - Memory: 512 MB, timeout: 30 seconds.
    - Dead letter queues for error handling.
  - **EventBridge**:
    - Rule: Daily schedule (Cron: `0 8 * * ? *` UTC) for RSS feed updates.
    - Target: `podcastHandler` Lambda with specific event payload.
  - **JWT Authorizer**:
    - Built-in API Gateway JWT authorizer using Cognito User Pool issuer and client ID.
    - No Lambda function required for token validation.

### RewindDataStack

- **Description**: Manages DynamoDB tables and related infrastructure.
- **Resources**:
  - **DynamoDB Tables** (as defined in DATABASE.md):
    - `RewindUsers`: User profile data.
    - `RewindPodcasts`: Podcast metadata and user associations.
    - `RewindEpisodes`: Episode details.
    - `RewindListeningHistory`: Playback tracking.
    - `RewindUserFavorites`: User favorites and ratings.
    - `RewindUserFeedback`: Episode feedback.
    - `RewindShares`: Library sharing data.
  - **Configuration**:
    - Billing Mode: Pay-per-request (on-demand).
    - Point-in-time recovery: Enabled.
    - DynamoDB Streams: Enabled for recommendation engine.
    - Global Secondary Indexes as specified in DATABASE.md.
  - **IAM Roles**:
    - Lambda execution role with DynamoDB read/write permissions.
    - Least privilege access patterns.

### RewindPersonalizeStack (Optional for v1)

- **Description**: Sets up AWS Personalize for recommendation engine.
- **Resources**:
  - **Personalize Dataset Group**: `RewindDatasetGroup`.
  - **Datasets**: Users, Items (episodes), Interactions.
  - **Solution**: SIMS (Similar Items) recipe.
  - **Campaign**: Real-time recommendation endpoint.
  - **EventBridge Rule**: Weekly retraining schedule.
- **Integration**:
  - DynamoDB Streams trigger Lambda to feed data to Personalize.
  - Batch data export for training.

## Code Structure

### CDK App Entry Point

```typescript
// bin/rewind.ts
import * as cdk from 'aws-cdk-lib'
import { RewindFrontendStack } from '../lib/rewind-frontend-stack'
import { RewindBackendStack } from '../lib/rewind-backend-stack'
import { RewindDataStack } from '../lib/rewind-data-stack'

const app = new cdk.App()

const dataStack = new RewindDataStack(app, 'RewindDataStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
})

const backendStack = new RewindBackendStack(app, 'RewindBackendStack', {
  dynamoTables: dataStack.tables,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
})

const frontendStack = new RewindFrontendStack(app, 'RewindFrontendStack', {
  apiUrl: backendStack.apiUrl,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
})
```

### Data Stack Implementation

```typescript
// lib/rewind-data-stack.ts
import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'

export class RewindDataStack extends cdk.Stack {
  public readonly tables: { [key: string]: dynamodb.Table } = {}

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Users table
    this.tables.users = new dynamodb.Table(this, 'RewindUsers', {
      tableName: 'RewindUsers',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    // Podcasts table with GSI
    this.tables.podcasts = new dynamodb.Table(this, 'RewindPodcasts', {
      tableName: 'RewindPodcasts',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    this.tables.podcasts.addGlobalSecondaryIndex({
      indexName: 'RssUrlIndex',
      partitionKey: { name: 'rssUrl', type: dynamodb.AttributeType.STRING },
    })

    // Episodes table with GSI
    this.tables.episodes = new dynamodb.Table(this, 'RewindEpisodes', {
      tableName: 'RewindEpisodes',
      partitionKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'episodeId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    this.tables.episodes.addGlobalSecondaryIndex({
      indexName: 'ReleaseDateIndex',
      partitionKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'releaseDate', type: dynamodb.AttributeType.STRING },
    })

    // ListeningHistory table with GSI
    this.tables.listeningHistory = new dynamodb.Table(this, 'RewindListeningHistory', {
      tableName: 'RewindListeningHistory',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'episodeId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    this.tables.listeningHistory.addGlobalSecondaryIndex({
      indexName: 'LastPlayedIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lastPlayed', type: dynamodb.AttributeType.STRING },
    })

    // UserFavorites table with GSI
    this.tables.userFavorites = new dynamodb.Table(this, 'RewindUserFavorites', {
      tableName: 'RewindUserFavorites',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'itemId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    this.tables.userFavorites.addGlobalSecondaryIndex({
      indexName: 'ItemTypeIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'itemType', type: dynamodb.AttributeType.STRING },
    })

    // UserFeedback table
    this.tables.userFeedback = new dynamodb.Table(this, 'RewindUserFeedback', {
      tableName: 'RewindUserFeedback',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'episodeId#feedbackId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    // Shares table with GSI
    this.tables.shares = new dynamodb.Table(this, 'RewindShares', {
      tableName: 'RewindShares',
      partitionKey: { name: 'shareId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    this.tables.shares.addGlobalSecondaryIndex({
      indexName: 'UserSharesIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })
  }
}
```

### Backend Stack Implementation

```typescript
// lib/rewind-backend-stack.ts
import * as cdk from 'aws-cdk-lib'
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2'
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as events from 'aws-cdk-lib/aws-events'
import * as targets from 'aws-cdk-lib/aws-events-targets'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

interface RewindBackendStackProps extends cdk.StackProps {
  dynamoTables: { [key: string]: dynamodb.Table }
}

export class RewindBackendStack extends cdk.Stack {
  public readonly apiUrl: string

  constructor(scope: Construct, id: string, props: RewindBackendStackProps) {
    super(scope, id, props)

    // Lambda execution role
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    })

    // Grant DynamoDB permissions
    Object.values(props.dynamoTables).forEach(table => {
      table.grantReadWriteData(lambdaRole)
    })

    // Common Lambda environment variables (Cognito handled by API Gateway)
    const commonEnv = {
      DYNAMODB_TABLE_PREFIX: 'Rewind',
    }

    // HTTP API with built-in JWT authorizer
    const httpApi = new apigateway.HttpApi(this, 'RewindHttpApi', {
      apiName: 'Rewind API',
      description: 'HTTP API for Rewind podcast app',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigateway.CorsHttpMethod.ANY],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    })

    // JWT Authorizer for Amazon Cognito
    const jwtAuthorizer = new apigateway.HttpJwtAuthorizer(
      'CognitoAuthorizer',
      `https://cognito-idp.${this.region}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
      {
        jwtAudience: [process.env.COGNITO_CLIENT_ID],
      },
    )

    // Lambda functions
    const podcastFunction = new lambda.Function(this, 'PodcastFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('backend/dist/podcast'),
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    })

    const episodeFunction = new lambda.Function(this, 'EpisodeFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('backend/dist/episode'),
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    })

    const recommendationFunction = new lambda.Function(this, 'RecommendationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('backend/dist/recommendation'),
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
    })

    const shareFunction = new lambda.Function(this, 'ShareFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('backend/dist/share'),
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
    })

    // HTTP API routes with JWT authorization
    httpApi.addRoutes({
      path: '/v1/podcasts',
      methods: [apigateway.HttpMethod.GET, apigateway.HttpMethod.POST],
      integration: new apigateway.HttpLambdaIntegration('PodcastIntegration', podcastFunction),
      authorizer: jwtAuthorizer,
    })

    httpApi.addRoutes({
      path: '/v1/podcasts/{podcastId}',
      methods: [apigateway.HttpMethod.DELETE],
      integration: new apigateway.HttpLambdaIntegration('PodcastDeleteIntegration', podcastFunction),
      authorizer: jwtAuthorizer,
    })

    // Episodes routes
    httpApi.addRoutes({
      path: '/v1/podcasts/{podcastId}/episodes',
      methods: [apigateway.HttpMethod.GET],
      integration: new apigateway.HttpLambdaIntegration('PodcastEpisodesIntegration', episodeFunction),
      authorizer: jwtAuthorizer,
    })

    // Episode playback routes
    httpApi.addRoutes({
      path: '/v1/episodes/{episodeId}/playback',
      methods: [apigateway.HttpMethod.GET, apigateway.HttpMethod.PUT],
      integration: new apigateway.HttpLambdaIntegration('EpisodePlaybackIntegration', episodeFunction),
      authorizer: jwtAuthorizer,
    })

    // Episode feedback routes
    httpApi.addRoutes({
      path: '/v1/episodes/{episodeId}/feedback',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigateway.HttpLambdaIntegration('EpisodeFeedbackIntegration', episodeFunction),
      authorizer: jwtAuthorizer,
    })

    // Recommendations routes
    httpApi.addRoutes({
      path: '/v1/recommendations',
      methods: [apigateway.HttpMethod.GET],
      integration: new apigateway.HttpLambdaIntegration('RecommendationIntegration', recommendationFunction),
      authorizer: jwtAuthorizer,
    })

    // Share routes
    httpApi.addRoutes({
      path: '/v1/share',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigateway.HttpLambdaIntegration('ShareCreateIntegration', shareFunction),
      authorizer: jwtAuthorizer,
    })

    // Public share access (no auth required)
    httpApi.addRoutes({
      path: '/v1/share/{shareId}',
      methods: [apigateway.HttpMethod.GET],
      integration: new apigateway.HttpLambdaIntegration('ShareGetIntegration', shareFunction),
    })

    // Add shared content to user library (auth required)
    httpApi.addRoutes({
      path: '/v1/share/{shareId}/add',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigateway.HttpLambdaIntegration('ShareAddIntegration', shareFunction),
      authorizer: jwtAuthorizer,
    })

    // EventBridge rule for RSS updates
    const rssUpdateRule = new events.Rule(this, 'RssUpdateRule', {
      schedule: events.Schedule.cron({ hour: '8', minute: '0' }),
      description: 'Daily RSS feed updates',
    })

    rssUpdateRule.addTarget(
      new targets.LambdaFunction(podcastFunction, {
        event: events.RuleTargetInput.fromObject({
          action: 'updateRssFeeds',
        }),
      }),
    )

    // Output API URL
    this.apiUrl = httpApi.url || ''

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      description: 'API Gateway URL',
    })
  }
}
```

### Frontend Stack Implementation

```typescript
// lib/rewind-frontend-stack.ts
import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import { Construct } from 'constructs'

interface RewindFrontendStackProps extends cdk.StackProps {
  apiUrl: string
}

export class RewindFrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: RewindFrontendStackProps) {
    super(scope, id, props)

    // S3 bucket for frontend
    const bucket = new s3.Bucket(this, 'RewindFrontendBucket', {
      bucketName: `rewind-frontend-${this.account}-${this.region}`,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    // Origin Access Identity for CloudFront
    const oai = new cloudfront.OriginAccessIdentity(this, 'RewindOAI', {
      comment: 'OAI for Rewind frontend',
    })

    bucket.grantRead(oai)

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'RewindDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(bucket, { originAccessIdentity: oai }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    })

    // Deploy frontend
    new s3deploy.BucketDeployment(this, 'RewindFrontendDeployment', {
      sources: [s3deploy.Source.asset('frontend/dist')],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
    })

    // Output URLs
    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution URL',
    })

    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
      description: 'S3 bucket name',
    })
  }
}
```

## Deployment Process

- **Bootstrap**:
  ```
  cdk bootstrap aws://<account-id>/us-east-1
  ```
- **Build Backend**:
  ```
  cd backend && npm run build
  ```
- **Build Frontend**:
  ```
  cd frontend && npm run build
  ```
- **Synth and Deploy**:
  ```
  cdk synth
  cdk deploy --all --require-approval never
  ```
- **Rollback**:
  - Use CDK `diff` to identify changes, revert with `cdk destroy` if needed.

## Environment Variables

- **Required Environment Variables**:
  - `COGNITO_USER_POOL_ID`: Cognito User Pool ID
  - `COGNITO_CLIENT_ID`: Cognito App Client ID
  - `COGNITO_REGION`: AWS region for Cognito service
  - `CDK_DEFAULT_ACCOUNT`: AWS account ID
  - `CDK_DEFAULT_REGION`: AWS region (e.g., us-east-1)

## Cost Management

- **Optimization**:
  - DynamoDB: Pay-per-request billing, efficient partition key design.
  - Lambda: Right-sized memory allocation, efficient code.
  - CloudFront: Optimized caching policies.
- **Monitoring**:
  - Cost Explorer with weekly reports.
  - CloudWatch alarms for unexpected usage.

## Security

- **IAM Roles**:
  - Least privilege for Lambda functions.
  - Separate roles for each service.
- **Networking**:
  - API Gateway with rate limiting.
  - CloudFront with WAF (optional).
- **Data**:
  - DynamoDB encryption at rest (default).
  - S3 encryption with SSE-S3.

## Notes for AI Agent

- Configure infrastructure via AWS CDK v2 TypeScript.
- Use proper construct patterns and least privilege IAM.
- Test deployment in `dev` stage first.
- Monitor costs and adjust resources as needed.
- Ensure all environment variables are properly configured.
- Use CDK context for environment-specific configurations.
- Commit CDK changes to Git after each update.
- Report issues (e.g., deployment failures) in PLAN.md.

## References

- PLAN.md: Deployment and monitoring tasks.
- DATABASE.md: DynamoDB table specifications.
- BACKEND_API.md: API Gateway endpoint mapping.
- BACKEND_LOGIC.md: Lambda function requirements.
- INFRASTRUCTURE.md: High-level architecture overview.
