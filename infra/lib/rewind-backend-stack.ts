import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as cognito from 'aws-cdk-lib/aws-cognito'
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

  constructor(scope: Construct, id: string, props: RewindBackendStackProps) {
    super(scope, id, props)

    // Create Lambda function for podcast operations
    const podcastFunction = new NodejsFunction(this, 'PodcastHandler', {
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
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      bundling: {
        forceDockerBundling: false,
        externalModules: [],
      },
    })

    // Create Lambda function for authentication operations
    const authFunction = new NodejsFunction(this, 'AuthHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../backend/src/handlers/authHandler.ts'),
      environment: {
        USERS_TABLE: props.tables.users.tableName,
        USER_POOL_ID: props.userPool.userPoolId,
        USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      bundling: {
        forceDockerBundling: false,
        externalModules: [],
      },
    })

    // Create Lambda function for episode operations
    const episodeFunction = new NodejsFunction(this, 'EpisodeHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../backend/src/handlers/episodeHandler.ts'),
      environment: {
        PODCASTS_TABLE: props.tables.podcasts.tableName,
        EPISODES_TABLE: props.tables.episodes.tableName,
        LISTENING_HISTORY_TABLE: props.tables.listeningHistory.tableName,
      },
      timeout: cdk.Duration.seconds(60), // Longer timeout for RSS parsing
      memorySize: 512, // More memory for episode processing
      bundling: {
        forceDockerBundling: false,
        externalModules: [],
      },
    })

    // Create Lambda function for recommendation operations
    const recommendationFunction = new NodejsFunction(this, 'RecommendationHandler', {
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
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024, // More memory for AI processing
      bundling: {
        forceDockerBundling: false,
        externalModules: [],
      },
    })

    // Grant Bedrock permissions to recommendation function
    recommendationFunction.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
        ],
      }),
    )

    // Grant DynamoDB permissions to the Lambda functions
    Object.values(props.tables).forEach(table => {
      table.grantReadWriteData(podcastFunction)
      table.grantReadWriteData(authFunction)
    })

    // Grant specific permissions to episode function
    props.tables.podcasts.grantReadData(episodeFunction)
    props.tables.episodes.grantReadWriteData(episodeFunction)
    props.tables.listeningHistory.grantReadWriteData(episodeFunction)

    // Grant specific permissions to recommendation function
    props.tables.episodes.grantReadData(recommendationFunction)
    props.tables.listeningHistory.grantReadData(recommendationFunction)
    props.tables.userFavorites.grantReadWriteData(recommendationFunction)
    props.tables.guestAnalytics.grantReadWriteData(recommendationFunction)
    props.tables.userFeedback.grantReadWriteData(recommendationFunction)
    props.tables.podcasts.grantReadData(recommendationFunction)

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
    auth.addResource('signin').addMethod('POST', new apigateway.LambdaIntegration(authFunction))
    auth.addResource('signup').addMethod('POST', new apigateway.LambdaIntegration(authFunction))
    auth.addResource('confirm').addMethod('POST', new apigateway.LambdaIntegration(authFunction))
    auth.addResource('resend').addMethod('POST', new apigateway.LambdaIntegration(authFunction))

    // Add protected API routes (require authorization)
    const podcasts = api.root.addResource('podcasts')
    podcasts.addMethod('GET', new apigateway.LambdaIntegration(podcastFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })
    podcasts.addMethod('POST', new apigateway.LambdaIntegration(podcastFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    const podcastById = podcasts.addResource('{podcastId}')
    podcastById.addMethod('DELETE', new apigateway.LambdaIntegration(podcastFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // Add episode routes
    const episodes = api.root.addResource('episodes')

    // GET /episodes/{podcastId} - Get episodes for a podcast
    const episodesByPodcast = episodes.addResource('{podcastId}')
    episodesByPodcast.addMethod('GET', new apigateway.LambdaIntegration(episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // POST /episodes/{podcastId}/sync - Sync episodes from RSS
    const syncEpisodes = episodesByPodcast.addResource('sync')
    syncEpisodes.addMethod('POST', new apigateway.LambdaIntegration(episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // DELETE /episodes/{podcastId} - Delete all episodes for a podcast
    episodesByPodcast.addMethod('DELETE', new apigateway.LambdaIntegration(episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // POST /episodes/{podcastId}/fix-images - Fix episode image URLs
    const fixImages = episodesByPodcast.addResource('fix-images')
    fixImages.addMethod('POST', new apigateway.LambdaIntegration(episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // Episode progress routes
    const episodeById = episodes.addResource('{episodeId}')

    // GET /episodes/{episodeId} - Get individual episode
    episodeById.addMethod('GET', new apigateway.LambdaIntegration(episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    const progress = episodeById.addResource('progress')

    // GET /episodes/{episodeId}/progress - Get playback progress
    progress.addMethod('GET', new apigateway.LambdaIntegration(episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // PUT /episodes/{episodeId}/progress - Save playback progress
    progress.addMethod('PUT', new apigateway.LambdaIntegration(episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // GET /listening-history - Get user's listening history
    const listeningHistory = api.root.addResource('listening-history')
    listeningHistory.addMethod('GET', new apigateway.LambdaIntegration(episodeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // Add recommendation routes
    const recommendations = api.root.addResource('recommendations')

    // GET /recommendations - Get personalized recommendations
    recommendations.addMethod('GET', new apigateway.LambdaIntegration(recommendationFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // POST /recommendations/extract-guests - Extract guests from episode
    const extractGuests = recommendations.addResource('extract-guests')
    extractGuests.addMethod('POST', new apigateway.LambdaIntegration(recommendationFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // POST /recommendations/batch-extract-guests - Batch extract guests
    const batchExtractGuests = recommendations.addResource('batch-extract-guests')
    batchExtractGuests.addMethod('POST', new apigateway.LambdaIntegration(recommendationFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    })

    // POST /recommendations/guest-analytics - Update guest analytics
    const guestAnalytics = recommendations.addResource('guest-analytics')
    guestAnalytics.addMethod('POST', new apigateway.LambdaIntegration(recommendationFunction), {
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
