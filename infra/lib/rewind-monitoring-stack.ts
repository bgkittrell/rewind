import * as cdk from 'aws-cdk-lib'
import * as rum from 'aws-cdk-lib/aws-rum'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as logs from 'aws-cdk-lib/aws-logs'
import { Construct } from 'constructs'

export interface RewindMonitoringStackProps extends cdk.StackProps {
  domainName: string
  userPool: cognito.UserPool
}

export class RewindMonitoringStack extends cdk.Stack {
  public readonly rumApplicationId: string
  public readonly rumIdentityPoolId: string
  public readonly rumRegion: string

  constructor(scope: Construct, id: string, props: RewindMonitoringStackProps) {
    super(scope, id, props)

    // Create Identity Pool for RUM authentication
    const identityPool = new cognito.CfnIdentityPool(this, 'RumIdentityPool', {
      allowUnauthenticatedIdentities: true,
      identityPoolName: `rewind-rum-${cdk.Stack.of(this).region}`,
    })

    // Create IAM role for unauthenticated users
    const unauthenticatedRole = new iam.Role(this, 'RumUnauthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'unauthenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    })

    // Create IAM role for authenticated users
    const authenticatedRole = new iam.Role(this, 'RumAuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    })

    // Attach the identity pool to the user pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'RumIdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        unauthenticated: unauthenticatedRole.roleArn,
        authenticated: authenticatedRole.roleArn,
      },
    })

    // Create RUM App Monitor
    const rumAppMonitor = new rum.CfnAppMonitor(this, 'RewindRumAppMonitor', {
      name: `rewind-rum-${cdk.Stack.of(this).region}`,
      domain: props.domainName,
      appMonitorConfiguration: {
        allowCookies: false,
        enableXRay: true,
        sessionSampleRate: 1.0, // 100% sampling rate for troubleshooting
        telemetries: ['errors', 'performance', 'http'],
        identityPoolId: identityPool.ref,
        guestRoleArn: unauthenticatedRole.roleArn,
        includedPages: [`https://${props.domainName}/*`],
        excludedPages: [],
        favoritePages: ['/login', '/signup', '/', '/library'],
        metricDestinations: [
          {
            destination: 'CloudWatch',
          },
        ],
      },
    })

    // Add RUM permissions to both roles
    const rumArn = cdk.Stack.of(this).formatArn({
      service: 'rum',
      resource: 'appmonitor',
      resourceName: rumAppMonitor.attrId,
    })

    const rumPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'rum:PutRumEvents',
        'rum:PutRumMetrics',
        'rum:BatchCreateRumMetricDefinitions',
        'rum:GetAppMonitorData',
      ],
      resources: [rumArn],
    })

    unauthenticatedRole.addToPolicy(rumPolicyStatement)
    authenticatedRole.addToPolicy(rumPolicyStatement)

    // Add CloudWatch Logs permissions for RUM
    const cloudWatchPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: [`arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/aws/rum/*`],
    })

    unauthenticatedRole.addToPolicy(cloudWatchPolicyStatement)
    authenticatedRole.addToPolicy(cloudWatchPolicyStatement)

    // Add X-Ray permissions for enhanced tracing
    const xrayPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
      resources: ['*'],
    })

    unauthenticatedRole.addToPolicy(xrayPolicyStatement)
    authenticatedRole.addToPolicy(xrayPolicyStatement)

    // Store values for frontend configuration
    this.rumApplicationId = rumAppMonitor.attrId
    this.rumIdentityPoolId = identityPool.ref
    this.rumRegion = cdk.Stack.of(this).region

    // Output RUM configuration
    new cdk.CfnOutput(this, 'RumApplicationId', {
      value: this.rumApplicationId,
      description: 'RUM Application ID',
    })

    new cdk.CfnOutput(this, 'RumIdentityPoolId', {
      value: this.rumIdentityPoolId,
      description: 'RUM Identity Pool ID',
    })

    new cdk.CfnOutput(this, 'RumRegion', {
      value: this.rumRegion,
      description: 'RUM Region',
    })

    new cdk.CfnOutput(this, 'RumApplicationArn', {
      value: rumArn,
      description: 'RUM Application ARN',
    })

    // Create Guest Extraction Monitoring Dashboard
    this.createGuestExtractionDashboard()
  }

  private createGuestExtractionDashboard(): void {
    // Create CloudWatch dashboard for guest extraction monitoring
    const dashboard = new cloudwatch.Dashboard(this, 'GuestExtractionDashboard', {
      dashboardName: 'Rewind-Guest-Extraction-Monitoring',
      defaultInterval: cdk.Duration.hours(1),
    })

    // Define metrics for guest extraction
    const guestExtractionSuccessMetric = new cloudwatch.Metric({
      namespace: 'Rewind/GuestExtraction',
      metricName: 'SuccessfulExtractions',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    })

    const guestExtractionFailureMetric = new cloudwatch.Metric({
      namespace: 'Rewind/GuestExtraction',
      metricName: 'FailedExtractions',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    })

    const guestExtractionLatencyMetric = new cloudwatch.Metric({
      namespace: 'Rewind/GuestExtraction',
      metricName: 'ProcessingLatency',
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    })

    const bedrockApiCostMetric = new cloudwatch.Metric({
      namespace: 'Rewind/GuestExtraction',
      metricName: 'BedrockApiCost',
      statistic: 'Sum',
      period: cdk.Duration.hours(1),
    })

    const episodesProcessedMetric = new cloudwatch.Metric({
      namespace: 'Rewind/GuestExtraction',
      metricName: 'EpisodesProcessed',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    })

    // Create success rate metric (calculated metric)
    const successRateMetric = new cloudwatch.MathExpression({
      expression: 'successful / (successful + failed) * 100',
      usingMetrics: {
        successful: guestExtractionSuccessMetric,
        failed: guestExtractionFailureMetric,
      },
      label: 'Success Rate (%)',
    })

    // Add widgets to dashboard
    dashboard.addWidgets(
      // Row 1: Success Rate and Processing Volume
      new cloudwatch.GraphWidget({
        title: 'Guest Extraction Success Rate',
        left: [successRateMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(5),
        yAxis: {
          left: {
            min: 0,
            max: 100,
          },
        },
      }),
      new cloudwatch.GraphWidget({
        title: 'Episodes Processed',
        left: [episodesProcessedMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(5),
      }),
    )

    dashboard.addWidgets(
      // Row 2: Processing Latency and Success/Failure Counts
      new cloudwatch.GraphWidget({
        title: 'Processing Latency',
        left: [guestExtractionLatencyMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(5),
        yAxis: {
          left: {
            label: 'Milliseconds',
          },
        },
      }),
      new cloudwatch.GraphWidget({
        title: 'Success vs Failure Count',
        left: [guestExtractionSuccessMetric, guestExtractionFailureMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(5),
      }),
    )

    dashboard.addWidgets(
      // Row 3: Cost Monitoring
      new cloudwatch.GraphWidget({
        title: 'Bedrock API Cost (USD)',
        left: [bedrockApiCostMetric],
        width: 24,
        height: 6,
        period: cdk.Duration.hours(1),
        yAxis: {
          left: {
            label: 'USD',
          },
        },
      }),
    )

    // Create CloudWatch Alarms for guest extraction
    this.createGuestExtractionAlarms(successRateMetric, guestExtractionFailureMetric, bedrockApiCostMetric)
  }

  private createGuestExtractionAlarms(
    successRateMetric: cloudwatch.MathExpression,
    failureMetric: cloudwatch.Metric,
    costMetric: cloudwatch.Metric,
  ): void {
    // Alarm for low success rate (< 85%)
    new cloudwatch.Alarm(this, 'GuestExtractionLowSuccessRate', {
      alarmName: 'Rewind-Guest-Extraction-Low-Success-Rate',
      alarmDescription: 'Guest extraction success rate is below 85%',
      metric: successRateMetric,
      threshold: 85,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })

    // Alarm for high failure rate (> 10 failures per 5 minutes)
    new cloudwatch.Alarm(this, 'GuestExtractionHighFailureRate', {
      alarmName: 'Rewind-Guest-Extraction-High-Failure-Rate',
      alarmDescription: 'Guest extraction failure rate is too high',
      metric: failureMetric,
      threshold: 10,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })

    // Alarm for high API costs (> $10 per hour)
    new cloudwatch.Alarm(this, 'GuestExtractionHighCost', {
      alarmName: 'Rewind-Guest-Extraction-High-Cost',
      alarmDescription: 'Guest extraction API costs are too high',
      metric: costMetric,
      threshold: 10,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })
  }
}
