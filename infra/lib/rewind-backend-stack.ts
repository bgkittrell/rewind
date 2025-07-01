import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

interface RewindBackendStackProps extends cdk.StackProps {
  dynamoTables: { [key: string]: dynamodb.Table };
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
}

export class RewindBackendStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: RewindBackendStackProps) {
    super(scope, id, props);

    // Lambda execution role
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant DynamoDB permissions
    Object.values(props.dynamoTables).forEach(table => {
      table.grantReadWriteData(lambdaRole);
    });

    // Common Lambda environment variables
    const commonEnv = {
      USERS_TABLE: props.dynamoTables.users.tableName,
      PODCASTS_TABLE: props.dynamoTables.podcasts.tableName,
      EPISODES_TABLE: props.dynamoTables.episodes.tableName,
      LISTENING_HISTORY_TABLE: props.dynamoTables.listeningHistory.tableName,
      USER_FAVORITES_TABLE: props.dynamoTables.userFavorites.tableName,
      USER_FEEDBACK_TABLE: props.dynamoTables.userFeedback.tableName,
      SHARES_TABLE: props.dynamoTables.shares.tableName,
      COGNITO_USER_POOL_ID: props.userPool.userPoolId,
      COGNITO_CLIENT_ID: props.userPoolClient.userPoolClientId,
    };

    // HTTP API with built-in JWT authorizer
    const httpApi = new apigateway.HttpApi(this, 'RewindHttpApi', {
      apiName: 'Rewind API',
      description: 'HTTP API for Rewind podcast app',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigateway.CorsHttpMethod.ANY],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // JWT Authorizer for Amazon Cognito
    const jwtAuthorizer = new authorizers.HttpJwtAuthorizer('CognitoAuthorizer', 
      `https://cognito-idp.${this.region}.amazonaws.com/${props.userPool.userPoolId}`, {
      jwtAudience: [props.userPoolClient.userPoolClientId],
    });

    // Lambda functions
    const podcastFunction = new lambda.Function(this, 'PodcastFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/podcast.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const episodeFunction = new lambda.Function(this, 'EpisodeFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/episode.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const recommendationFunction = new lambda.Function(this, 'RecommendationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/recommendation.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
    });

    const shareFunction = new lambda.Function(this, 'ShareFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/share.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
    });

    // HTTP API routes with JWT authorization
    httpApi.addRoutes({
      path: '/v1/podcasts',
      methods: [apigateway.HttpMethod.GET, apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('PodcastIntegration', podcastFunction),
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: '/v1/podcasts/{podcastId}',
      methods: [apigateway.HttpMethod.DELETE],
      integration: new integrations.HttpLambdaIntegration('PodcastDeleteIntegration', podcastFunction),
      authorizer: jwtAuthorizer,
    });

    // Episodes routes
    httpApi.addRoutes({
      path: '/v1/podcasts/{podcastId}/episodes',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('PodcastEpisodesIntegration', episodeFunction),
      authorizer: jwtAuthorizer,
    });

    // Episode playback routes
    httpApi.addRoutes({
      path: '/v1/episodes/{episodeId}/playback',
      methods: [apigateway.HttpMethod.GET, apigateway.HttpMethod.PUT],
      integration: new integrations.HttpLambdaIntegration('EpisodePlaybackIntegration', episodeFunction),
      authorizer: jwtAuthorizer,
    });

    // Episode feedback routes
    httpApi.addRoutes({
      path: '/v1/episodes/{episodeId}/feedback',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('EpisodeFeedbackIntegration', episodeFunction),
      authorizer: jwtAuthorizer,
    });

    // Recommendations routes
    httpApi.addRoutes({
      path: '/v1/recommendations',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('RecommendationIntegration', recommendationFunction),
      authorizer: jwtAuthorizer,
    });

    // Share routes
    httpApi.addRoutes({
      path: '/v1/share',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('ShareCreateIntegration', shareFunction),
      authorizer: jwtAuthorizer,
    });

    // Public share access (no auth required)
    httpApi.addRoutes({
      path: '/v1/share/{shareId}',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('ShareGetIntegration', shareFunction),
    });

    // Add shared content to user library (auth required)
    httpApi.addRoutes({
      path: '/v1/share/{shareId}/add',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('ShareAddIntegration', shareFunction),
      authorizer: jwtAuthorizer,
    });

    // EventBridge rule for RSS updates
    const rssUpdateRule = new events.Rule(this, 'RssUpdateRule', {
      schedule: events.Schedule.cron({ hour: '8', minute: '0' }),
      description: 'Daily RSS feed updates',
    });

    rssUpdateRule.addTarget(new targets.LambdaFunction(podcastFunction, {
      event: events.RuleTargetInput.fromObject({
        action: 'updateRssFeeds',
      }),
    }));

    // Output API URL
    this.apiUrl = httpApi.url || '';

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      description: 'API Gateway URL',
    });
  }
}