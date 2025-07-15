import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as iam from 'aws-cdk-lib/aws-iam'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Construct } from 'constructs'
import * as path from 'path'

export interface FeatureFlagsProps {
  /**
   * Environment name (dev, staging, prod)
   */
  environment: string

  /**
   * Name prefix for resources
   */
  namePrefix: string
}

export class FeatureFlags extends Construct {
  public readonly featureFlagsTable: dynamodb.Table
  public readonly featureFlagsFunction: lambda.Function

  constructor(scope: Construct, id: string, props: FeatureFlagsProps) {
    super(scope, id)

    const { environment, namePrefix } = props

    // Create DynamoDB table for feature flags
    this.featureFlagsTable = new dynamodb.Table(this, 'FeatureFlagsTable', {
      tableName: `${namePrefix}-feature-flags-${environment}`,
      partitionKey: { name: 'flagKey', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'environment', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    })

    // Add GSI for querying by flag status
    this.featureFlagsTable.addGlobalSecondaryIndex({
      indexName: 'FlagStatusIndex',
      partitionKey: { name: 'enabled', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'flagKey', type: dynamodb.AttributeType.STRING },
    })

    // Create Lambda function for feature flag management
    this.featureFlagsFunction = new NodejsFunction(this, 'FeatureFlagsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../backend/src/utils/featureFlags.ts'),
      environment: {
        FEATURE_FLAGS_TABLE: this.featureFlagsTable.tableName,
        ENVIRONMENT: environment,
        LOG_LEVEL: 'INFO',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      bundling: {
        forceDockerBundling: false,
        externalModules: [],
      },
    })

    // Grant DynamoDB permissions to the Lambda function
    this.featureFlagsTable.grantReadWriteData(this.featureFlagsFunction)

    // Create initial feature flags
    this.createInitialFeatureFlags(environment)

    // Output important values
    new cdk.CfnOutput(this, 'FeatureFlagsTableName', {
      value: this.featureFlagsTable.tableName,
      description: 'Feature Flags DynamoDB Table Name',
    })

    new cdk.CfnOutput(this, 'FeatureFlagsFunctionArn', {
      value: this.featureFlagsFunction.functionArn,
      description: 'Feature Flags Lambda Function ARN',
    })
  }

  private createInitialFeatureFlags(environment: string) {
    // Create custom resource to populate initial feature flags
    const flagsData = [
      {
        flagKey: 'guest-extraction-enabled',
        environment,
        enabled: false,
        rolloutPercentage: 0,
        description: 'Enable AI-powered guest extraction during episode import',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        flagKey: 'guest-extraction-batch-processing',
        environment,
        enabled: false,
        rolloutPercentage: 0,
        description: 'Enable batch processing for historical episode guest extraction',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        flagKey: 'guest-extraction-ui-components',
        environment,
        enabled: false,
        rolloutPercentage: 0,
        description: 'Enable frontend UI components for guest information display',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        flagKey: 'guest-search-filter',
        environment,
        enabled: false,
        rolloutPercentage: 0,
        description: 'Enable filtering episodes by guest names in search',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        flagKey: 'guest-extraction-monitoring',
        environment,
        enabled: true,
        rolloutPercentage: 100,
        description: 'Enable comprehensive monitoring and alerting for guest extraction',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    // Create custom resource to populate the table
    const populateFlags = new cdk.CustomResource(this, 'PopulateFeatureFlags', {
      serviceToken: this.featureFlagsFunction.functionArn,
      properties: {
        action: 'POPULATE_INITIAL_FLAGS',
        flags: JSON.stringify(flagsData),
      },
    })

    // Ensure the table exists before populating
    populateFlags.node.addDependency(this.featureFlagsTable)
  }

  /**
   * Add feature flag support to a Lambda function
   */
  public addFeatureFlagSupport(lambdaFunction: lambda.Function): void {
    // Add environment variables
    lambdaFunction.addEnvironment('FEATURE_FLAGS_TABLE', this.featureFlagsTable.tableName)
    lambdaFunction.addEnvironment('FEATURE_FLAGS_ENABLED', 'true')

    // Grant read permissions to the feature flags table
    this.featureFlagsTable.grantReadData(lambdaFunction)

    // Add policy for feature flag evaluation
    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['dynamodb:GetItem', 'dynamodb:Query'],
        resources: [this.featureFlagsTable.tableArn, `${this.featureFlagsTable.tableArn}/index/*`],
      }),
    )
  }
}

/**
 * TypeScript interfaces for feature flag data structures
 */
export interface FeatureFlag {
  flagKey: string
  environment: string
  enabled: boolean
  rolloutPercentage: number
  description: string
  createdAt: string
  updatedAt: string
  conditions?: FeatureFlagCondition[]
}

export interface FeatureFlagCondition {
  type: 'USER_ID' | 'USER_EMAIL' | 'RANDOM_PERCENTAGE' | 'USER_ATTRIBUTE'
  operator: 'EQUALS' | 'CONTAINS' | 'STARTS_WITH' | 'IN' | 'PERCENTAGE'
  value: string | string[] | number
}

export interface FeatureFlagEvaluationContext {
  userId?: string
  userEmail?: string
  userAttributes?: Record<string, string>
  randomSeed?: number
}

export interface FeatureFlagEvaluationResult {
  flagKey: string
  enabled: boolean
  rolloutPercentage: number
  evaluationReason: string
  evaluatedAt: string
}
