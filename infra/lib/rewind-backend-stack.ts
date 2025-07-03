import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'

export interface RewindBackendStackProps extends cdk.StackProps {
  tables: { [key: string]: dynamodb.Table }
}

export class RewindBackendStack extends cdk.Stack {
  public readonly apiUrl: string

  constructor(scope: Construct, id: string, props: RewindBackendStackProps) {
    super(scope, id, props)

    // Create a placeholder Lambda function for podcast operations
    const podcastFunction = new lambda.Function(this, 'PodcastHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'podcastHandler.handler',
      code: lambda.Code.fromAsset('../backend/dist'), // Will be built later
      environment: {
        USERS_TABLE: props.tables.users.tableName,
        PODCASTS_TABLE: props.tables.podcasts.tableName,
        EPISODES_TABLE: props.tables.episodes.tableName,
        LISTENING_HISTORY_TABLE: props.tables.listeningHistory.tableName,
        SHARES_TABLE: props.tables.shares.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    })

    // Grant DynamoDB permissions to the Lambda function
    Object.values(props.tables).forEach(table => {
      table.grantReadWriteData(podcastFunction)
    })

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'RewindApi', {
      restApiName: 'Rewind API',
      description: 'API for Rewind podcast app',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    })

    // Add API routes
    const podcasts = api.root.addResource('podcasts')
    podcasts.addMethod('GET', new apigateway.LambdaIntegration(podcastFunction))
    podcasts.addMethod('POST', new apigateway.LambdaIntegration(podcastFunction))

    const podcastById = podcasts.addResource('{podcastId}')
    podcastById.addMethod('DELETE', new apigateway.LambdaIntegration(podcastFunction))

    // Store API URL for frontend
    this.apiUrl = api.url

    // Output API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      description: 'API Gateway URL',
    })
  }
}
