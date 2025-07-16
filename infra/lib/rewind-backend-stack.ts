import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Construct } from 'constructs'
import * as path from 'path'

export interface RewindBackendStackProps extends cdk.StackProps {
  tables: { [key: string]: dynamodb.Table }
  userPool: cognito.UserPool
  userPoolClient: cognito.UserPoolClient
}

export class RewindBackendStack extends cdk.Stack {
  public readonly apiUrl: string
  public readonly podcastFunction: lambda.Function
  public readonly authFunction: lambda.Function
  public readonly episodeFunction: lambda.Function
  public readonly recommendationFunction: lambda.Function
  public readonly searchFunction: lambda.Function
  public readonly guestExtractionProcessor: lambda.Function
  public readonly episodeSyncProcessor: lambda.Function

  constructor(scope: Construct, id: string, props: RewindBackendStackProps) {
    super(scope, id, props)

    const allowedOrigins =
      'http://localhost:5173,http://localhost:3000,https://rewind-production.com,https://d1bpz7t7ooyig6.cloudfront.net'
    // Create Lambda function for podcast operations
    this.podcastFunction = new NodejsFunction(this, 'PodcastHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../backend/src/handlers/podcastHandler.ts'),
      environment: {
        USERS_TABLE: props.tables.users.tableName,
        PODCASTS_TABLE: props.tables.podcasts.tableName,
        EPISODES_TABLE: props.tables.episodes.tableName,
        LISTENING_HISTORY_TABLE: props.tables.listeningHistory.tableName,
        SHARES_TABLE: props.tables.shares.tableName,
        USER_POOL_ID: props.userPool.userPoolId,
        USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
        RATE_LIMIT_TABLE: props.tables.rateLimit.tableName,
        LOG_LEVEL: 'INFO',
        ALLOWED_ORIGINS: allowedOrigins,
        CSP_REPORT_URI: 'https://rewind-production.com/csp-report',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      bundling: {
        forceDockerBundling: false,
        externalModules: [],
      },
    })

    // Create Lambda function for authentication operations
    this.authFunction = new NodejsFunction(this, 'AuthHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../backend/src/handlers/authHandler.ts'),
      environment: {
        USERS_TABLE: props.tables.users.tableName,
        USER_POOL_ID: props.userPool.userPoolId,
        USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
        RATE_LIMIT_TABLE: props.tables.rateLimit.tableName,
        LOG_LEVEL: 'INFO',
        ALLOWED_ORIGINS: allowedOrigins,
        CSP_REPORT_URI: 'https://rewind-production.com/csp-report',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      bundling: {
        forceDockerBundling: false,
        externalModules: [],
      },
    })

    // Create Lambda function for episode operations
    this.episodeFunction = new NodejsFunction(this, 'EpisodeHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../backend/src/handlers/episodeHandler.ts'),
      environment: {
        PODCASTS_TABLE: props.tables.podcasts.tableName,
        EPISODES_TABLE: props.tables.episodes.tableName,
        LISTENING_HISTORY_TABLE: props.tables.listeningHistory.tableName,
        RATE_LIMIT_TABLE: props.tables.rateLimit.tableName,
        LOG_LEVEL: 'INFO',
        ALLOWED_ORIGINS: allowedOrigins,
      },
      timeout: cdk.Duration.seconds(60), // Longer timeout for RSS parsing
      memorySize: 512, // More memory for episode processing
      bundling: {
        forceDockerBundling: false,
        externalModules: [],
      },
    })

    // Create Lambda function for recommendation operations
    this.recommendationFunction = new NodejsFunction(this, 'RecommendationHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../backend/src/handlers/recommendationHandlerSecure.ts'),
      environment: {
        EPISODES_TABLE: props.tables.episodes.tableName,
        LISTENING_HISTORY_TABLE: props.tables.listeningHistory.tableName,
        USER_FAVORITES_TABLE: props.tables.userFavorites.tableName,
        GUEST_ANALYTICS_TABLE: props.tables.guestAnalytics.tableName,
        USER_FEEDBACK_TABLE: props.tables.userFeedback.tableName,
        PODCASTS_TABLE: props.tables.podcasts.tableName,
        RATE_LIMIT_TABLE: props.tables.rateLimit.tableName,
        LOG_LEVEL: 'INFO',
        ALLOWED_ORIGINS: allowedOrigins,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024, // More memory for AI processing
      bundling: {
        forceDockerBundling: false,
        externalModules: [],
      },
    })

    // Create Lambda function for search operations
    this.searchFunction = new NodejsFunction(this, 'SearchHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../backend/src/handlers/searchHandler.ts'),
      environment: {
        PODCASTS_TABLE: props.tables.podcasts.tableName,
        EPISODES_TABLE: props.tables.episodes.tableName,
        RATE_LIMIT_TABLE: props.tables.rateLimit.tableName,
        LOG_LEVEL: 'INFO',
        ALLOWED_ORIGINS: allowedOrigins,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 512, // Balanced for performance/cost
      architecture: lambda.Architecture.ARM_64, // Cost optimization
      bundling: {
        forceDockerBundling: false,
        externalModules: [],
      },
    })

    // Grant Bedrock permissions to recommendation function
    this.recommendationFunction.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:inference-profile/us.anthropic.claude-sonnet-4-20250514-v1:0`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0`,
        ],
      }),
    )

    // Grant Bedrock permissions to episode function for guest extraction
    this.episodeFunction.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:inference-profile/us.anthropic.claude-sonnet-4-20250514-v1:0`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0`,
        ],
      }),
    )

    // Grant CloudWatch permissions to episode function for metrics publishing
    this.episodeFunction.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      }),
    )

    // Grant DynamoDB permissions to the Lambda functions
    Object.values(props.tables).forEach(table => {
      table.grantReadWriteData(this.podcastFunction)
      table.grantReadWriteData(this.authFunction)
    })

    // Grant specific permissions to episode function
    props.tables.podcasts.grantReadWriteData(this.episodeFunction)
    props.tables.episodes.grantReadWriteData(this.episodeFunction)
    props.tables.listeningHistory.grantReadWriteData(this.episodeFunction)
    props.tables.rateLimit.grantReadWriteData(this.episodeFunction)

    // Grant specific permissions to recommendation function
    props.tables.episodes.grantReadData(this.recommendationFunction)
    props.tables.listeningHistory.grantReadData(this.recommendationFunction)
    props.tables.userFavorites.grantReadWriteData(this.recommendationFunction)
    props.tables.guestAnalytics.grantReadWriteData(this.recommendationFunction)
    props.tables.userFeedback.grantReadWriteData(this.recommendationFunction)
    props.tables.podcasts.grantReadData(this.recommendationFunction)
    props.tables.rateLimit.grantReadWriteData(this.recommendationFunction)

    // Grant specific permissions to search function
    props.tables.podcasts.grantReadData(this.searchFunction)
    props.tables.episodes.grantReadData(this.searchFunction)
    props.tables.rateLimit.grantReadWriteData(this.searchFunction)

    // Create SQS queue for guest extraction processing
    const guestExtractionDLQ = new sqs.Queue(this, 'GuestExtractionDLQ', {
      queueName: 'guest-extraction-dlq',
      retentionPeriod: cdk.Duration.days(14),
    })

    const guestExtractionQueue = new sqs.Queue(this, 'GuestExtractionQueue', {
      queueName: 'guest-extraction-queue',
      visibilityTimeout: cdk.Duration.seconds(1800), // 30 minutes - increased for retry handling
      retentionPeriod: cdk.Duration.days(14),
      receiveMessageWaitTime: cdk.Duration.seconds(20), // Long polling
      deadLetterQueue: {
        queue: guestExtractionDLQ,
        maxReceiveCount: 4,
      },
    })

    // Create SQS queue for episode sync processing
    const episodeSyncDLQ = new sqs.Queue(this, 'EpisodeSyncDLQ', {
      queueName: 'episode-sync-dlq',
      retentionPeriod: cdk.Duration.days(14),
    })

    const episodeSyncQueue = new sqs.Queue(this, 'EpisodeSyncQueue', {
      queueName: 'episode-sync-queue',
      visibilityTimeout: cdk.Duration.minutes(15), // 15 minutes for RSS parsing and batch processing
      retentionPeriod: cdk.Duration.days(14),
      receiveMessageWaitTime: cdk.Duration.seconds(20), // Long polling
      deadLetterQueue: {
        queue: episodeSyncDLQ,
        maxReceiveCount: 3,
      },
    })

    // Create Lambda function for guest extraction processing
    this.guestExtractionProcessor = new NodejsFunction(this, 'GuestExtractionProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../backend/src/handlers/guestExtractionProcessor.ts'),
      timeout: cdk.Duration.minutes(5), // Increased timeout for retry handling
      memorySize: 1024,
      environment: {
        EPISODES_TABLE: props.tables.episodes.tableName,
        GUEST_EXTRACTION_QUEUE_URL: guestExtractionQueue.queueUrl,
        LOG_LEVEL: 'INFO',
      },
    })

    // Create Lambda function for episode sync processing
    this.episodeSyncProcessor = new NodejsFunction(this, 'EpisodeSyncProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../backend/src/handlers/episodeSyncProcessor.ts'),
      timeout: cdk.Duration.minutes(15), // Longer timeout for RSS parsing and batch processing
      memorySize: 1024,
      environment: {
        PODCASTS_TABLE: props.tables.podcasts.tableName,
        EPISODES_TABLE: props.tables.episodes.tableName,
        GUEST_EXTRACTION_QUEUE_URL: guestExtractionQueue.queueUrl,
        LOG_LEVEL: 'INFO',
        ALLOWED_ORIGINS: allowedOrigins,
      },
    })

    // Grant permissions to guest extraction processor
    props.tables.episodes.grantReadWriteData(this.guestExtractionProcessor)
    guestExtractionQueue.grantConsumeMessages(this.guestExtractionProcessor)
    guestExtractionQueue.grantSendMessages(this.episodeFunction) // Allow episode handler to send messages
    guestExtractionQueue.grantSendMessages(this.podcastFunction) // Allow podcast handler to send messages

    // Grant permissions to episode sync processor
    props.tables.podcasts.grantReadWriteData(this.episodeSyncProcessor)
    props.tables.episodes.grantReadWriteData(this.episodeSyncProcessor)
    episodeSyncQueue.grantConsumeMessages(this.episodeSyncProcessor)
    episodeSyncQueue.grantSendMessages(this.podcastFunction) // Allow podcast handler to send messages
    episodeSyncQueue.grantSendMessages(this.episodeFunction) // Allow episode handler to send messages
    guestExtractionQueue.grantSendMessages(this.episodeSyncProcessor) // Allow episode sync processor to queue guest extraction

    // Grant Bedrock permissions to guest extraction processor
    this.guestExtractionProcessor.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:inference-profile/us.anthropic.claude-sonnet-4-20250514-v1:0`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0`,
        ],
      }),
    )

    // Grant CloudWatch permissions for metrics publishing
    this.guestExtractionProcessor.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      }),
    )

    // Add SQS event source to guest extraction processor
    this.guestExtractionProcessor.addEventSource(
      new SqsEventSource(guestExtractionQueue, {
        batchSize: 1, // Process one message at a time for throttling
        maxBatchingWindow: cdk.Duration.seconds(5),
        maxConcurrency: 2, // Limit to 2 concurrent Lambda executions (AWS minimum)
        enabled: true,
      }),
    )

    // Add SQS event source to episode sync processor
    this.episodeSyncProcessor.addEventSource(
      new SqsEventSource(episodeSyncQueue, {
        batchSize: 1, // Process one podcast at a time
        maxBatchingWindow: cdk.Duration.seconds(5),
        maxConcurrency: 3, // Allow more concurrency for episode sync jobs
        enabled: true,
      }),
    )

    // Add environment variable for guest extraction queue URL to episode handler
    this.episodeFunction.addEnvironment('GUEST_EXTRACTION_QUEUE_URL', guestExtractionQueue.queueUrl)

    // Add environment variable for episode sync queue URL to episode handler
    this.episodeFunction.addEnvironment('EPISODE_SYNC_QUEUE_URL', episodeSyncQueue.queueUrl)

    // Add environment variable for guest extraction queue URL to podcast handler (needed for addPodcast)
    this.podcastFunction.addEnvironment('GUEST_EXTRACTION_QUEUE_URL', guestExtractionQueue.queueUrl)

    // Add environment variable for episode sync queue URL to podcast handler
    this.podcastFunction.addEnvironment('EPISODE_SYNC_QUEUE_URL', episodeSyncQueue.queueUrl)

    // Add environment variable for guest extraction queue URL to recommendation handler (for validation scripts)
    this.recommendationFunction.addEnvironment('GUEST_EXTRACTION_QUEUE_URL', guestExtractionQueue.queueUrl)

    // Create Cognito authorizer for API Gateway
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'RewindAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: 'RewindCognitoAuthorizer',
      identitySource: 'method.request.header.Authorization',
      resultsCacheTtl: cdk.Duration.seconds(0), // Disable caching for debugging
    })

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'RewindApi', {
      restApiName: 'Rewind API',
      description: 'API for Rewind podcast app',
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
        allowCredentials: false,
      },
      deployOptions: {
        stageName: 'prod',
      },
    })

    // Add health check endpoint (no authorization needed)
    api.root.addResource('health').addMethod(
      'GET',
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify({
                status: 'healthy',
                timestamp: '$context.requestTime',
                version: '1.0.0',
              }),
            },
          },
        ],
        requestTemplates: {
          'application/json': JSON.stringify({ statusCode: 200 }),
        },
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
            },
          },
        ],
      },
    )

    // Add authentication routes (no authorization needed)
    const auth = api.root.addResource('auth')
    auth.addResource('signin').addMethod('POST', new apigateway.LambdaIntegration(this.authFunction))
    auth.addResource('signup').addMethod('POST', new apigateway.LambdaIntegration(this.authFunction))
    auth.addResource('confirm').addMethod('POST', new apigateway.LambdaIntegration(this.authFunction))
    auth.addResource('resend').addMethod('POST', new apigateway.LambdaIntegration(this.authFunction))

    // Add protected API routes (require authorization)
    const podcasts = api.root.addResource('podcasts')
    podcasts.addMethod('GET', new apigateway.LambdaIntegration(this.podcastFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })
    podcasts.addMethod('POST', new apigateway.LambdaIntegration(this.podcastFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    const podcastById = podcasts.addResource('{podcastId}')
    podcastById.addMethod('DELETE', new apigateway.LambdaIntegration(this.podcastFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // Add episode routes
    const episodes = api.root.addResource('episodes')

    // GET /episodes/{podcastId} - Get episodes for a podcast
    const episodesByPodcast = episodes.addResource('{podcastId}')
    episodesByPodcast.addMethod('GET', new apigateway.LambdaIntegration(this.episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // POST /episodes/{podcastId}/sync - Sync episodes from RSS
    const syncEpisodes = episodesByPodcast.addResource('sync')
    syncEpisodes.addMethod('POST', new apigateway.LambdaIntegration(this.episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // POST /episodes/{podcastId}/sync-status - Get sync status for a podcast
    const syncStatus = episodesByPodcast.addResource('sync-status')
    syncStatus.addMethod('POST', new apigateway.LambdaIntegration(this.episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // DELETE /episodes/{podcastId} - Delete all episodes for a podcast
    episodesByPodcast.addMethod('DELETE', new apigateway.LambdaIntegration(this.episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // POST /episodes/{podcastId}/fix-images - Fix episode image URLs
    const fixImages = episodesByPodcast.addResource('fix-images')
    fixImages.addMethod('POST', new apigateway.LambdaIntegration(this.episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // POST /episodes/refresh-url - Refresh episode audio URL
    const refreshUrl = episodes.addResource('refresh-url')
    refreshUrl.addMethod('POST', new apigateway.LambdaIntegration(this.episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // GET /episodes/{podcastId}/{episodeId} - Get specific episode by podcast and episode ID
    const episodeByPodcastAndId = episodesByPodcast.addResource('{episodeId}')
    episodeByPodcastAndId.addMethod('GET', new apigateway.LambdaIntegration(this.episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // Episode progress routes
    const episodeById = episodes.addResource('{episodeId}')

    // GET /episodes/{episodeId} - Get individual episode
    episodeById.addMethod('GET', new apigateway.LambdaIntegration(this.episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    const progress = episodeById.addResource('progress')

    // GET /episodes/{episodeId}/progress - Get playback progress
    progress.addMethod('GET', new apigateway.LambdaIntegration(this.episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // PUT /episodes/{episodeId}/progress - Save playback progress
    progress.addMethod('PUT', new apigateway.LambdaIntegration(this.episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // GET /listening-history - Get user's listening history
    const listeningHistory = api.root.addResource('listening-history')
    listeningHistory.addMethod('GET', new apigateway.LambdaIntegration(this.episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // GET /resume - Get resume data for last played episode
    const resume = api.root.addResource('resume')
    resume.addMethod('GET', new apigateway.LambdaIntegration(this.episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // Add recommendation routes
    const recommendations = api.root.addResource('recommendations')

    // GET /recommendations - Get personalized recommendations
    recommendations.addMethod('GET', new apigateway.LambdaIntegration(this.recommendationFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // POST /recommendations/extract-guests - Extract guests from episode
    const extractGuests = recommendations.addResource('extract-guests')
    extractGuests.addMethod('POST', new apigateway.LambdaIntegration(this.recommendationFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // POST /recommendations/batch-extract-guests - Batch extract guests
    const batchExtractGuests = recommendations.addResource('batch-extract-guests')
    batchExtractGuests.addMethod('POST', new apigateway.LambdaIntegration(this.recommendationFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // POST /recommendations/guest-analytics - Update guest analytics
    const guestAnalytics = recommendations.addResource('guest-analytics')
    guestAnalytics.addMethod('POST', new apigateway.LambdaIntegration(this.recommendationFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // Add search endpoint
    // GET /search - Search episodes
    const search = api.root.addResource('search')
    search.addMethod('GET', new apigateway.LambdaIntegration(this.searchFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // Store API URL for frontend
    this.apiUrl = api.url

    // Output API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      description: 'API Gateway URL',
    })
  }
}
