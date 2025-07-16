import * as cdk from 'aws-cdk-lib'
import { RewindBackendStack } from './rewind-backend-stack'
import { GuestExtractionMonitoring } from './guest-extraction-monitoring'
import { FeatureFlags } from './feature-flags'
import { Construct } from 'constructs'

export interface RewindBackendStackMonitoringProps {
  backendStack: RewindBackendStack
  environment: string
  alertEmail?: string
}

export class RewindBackendStackMonitoring extends Construct {
  public readonly guestExtractionMonitoring: GuestExtractionMonitoring
  public readonly featureFlags: FeatureFlags

  constructor(scope: Construct, id: string, props: RewindBackendStackMonitoringProps) {
    super(scope, id)

    const { backendStack, environment, alertEmail } = props

    // Create feature flags infrastructure
    this.featureFlags = new FeatureFlags(this, 'FeatureFlags', {
      environment,
      namePrefix: 'rewind',
    })

    // Create guest extraction monitoring
    this.guestExtractionMonitoring = new GuestExtractionMonitoring(this, 'GuestExtractionMonitoring', {
      guestExtractionFunction: backendStack.guestExtractionProcessor,
      namePrefix: 'rewind',
      environment,
      alertEmail,
    })

    // Add feature flag support to all relevant Lambda functions
    // This would be done in the main backend stack, but showing the pattern here
    const lambdaFunctions = [
      backendStack.recommendationFunction,
      backendStack.episodeFunction,
      backendStack.podcastFunction,
    ]

    lambdaFunctions.forEach(func => {
      if (func) {
        this.featureFlags.addFeatureFlagSupport(func)

        // Add CloudWatch permissions for metrics publishing
        func.addToRolePolicy(
          new cdk.aws_iam.PolicyStatement({
            effect: cdk.aws_iam.Effect.ALLOW,
            actions: ['cloudwatch:PutMetricData', 'logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            resources: ['*'],
          }),
        )
      }
    })

    // Output monitoring URLs and configuration
    new cdk.CfnOutput(this, 'MonitoringDashboardUrl', {
      value: `https://${cdk.Stack.of(this).region}.console.aws.amazon.com/cloudwatch/home?region=${cdk.Stack.of(this).region}#dashboards:name=${this.guestExtractionMonitoring.dashboard.dashboardName}`,
      description: 'Guest Extraction Monitoring Dashboard URL',
    })

    new cdk.CfnOutput(this, 'FeatureFlagsTableName', {
      value: this.featureFlags.featureFlagsTable.tableName,
      description: 'Feature Flags DynamoDB Table Name',
    })
  }
}

// Extended interface for backend stack to expose Lambda functions
export interface ExtendedRewindBackendStackProps extends cdk.StackProps {
  tables: { [key: string]: cdk.aws_dynamodb.Table }
  userPool: cdk.aws_cognito.UserPool
  userPoolClient: cdk.aws_cognito.UserPoolClient
  enableGuestExtractionMonitoring?: boolean
  alertEmail?: string
}

// This would be the updated backend stack with monitoring integration
export class RewindBackendStackWithMonitoring extends RewindBackendStack {
  public readonly monitoring?: RewindBackendStackMonitoring

  constructor(scope: Construct, id: string, props: ExtendedRewindBackendStackProps) {
    super(scope, id, props)

    // Add monitoring if enabled
    if (props.enableGuestExtractionMonitoring) {
      this.monitoring = new RewindBackendStackMonitoring(this, 'Monitoring', {
        backendStack: this,
        environment: props.env?.account || 'production',
        alertEmail: props.alertEmail,
      })
    }
  }
}
