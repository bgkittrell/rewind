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
        minify: false,
        sourceMap: true,
        externalModules: ['aws-sdk'],
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
        minify: false,
        sourceMap: true,
        externalModules: ['aws-sdk'],
      },
    })

    // Grant DynamoDB permissions to the Lambda functions
    Object.values(props.tables).forEach(table => {
      table.grantReadWriteData(podcastFunction)
      table.grantReadWriteData(authFunction)
    })

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

    // Store API URL for frontend
    this.apiUrl = api.url

    // Output API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      description: 'API Gateway URL',
    })
  }
}
