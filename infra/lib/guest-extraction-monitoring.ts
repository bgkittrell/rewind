import * as cdk from 'aws-cdk-lib'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions'
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions'
import { Construct } from 'constructs'

export interface GuestExtractionMonitoringProps {
  /**
   * The Lambda function that handles guest extraction
   */
  guestExtractionFunction: lambda.Function

  /**
   * The name prefix for all monitoring resources
   */
  namePrefix: string

  /**
   * Email address for critical alerts
   */
  alertEmail?: string

  /**
   * Environment name (dev, staging, prod)
   */
  environment: string
}

export class GuestExtractionMonitoring extends Construct {
  public readonly dashboard: cloudwatch.Dashboard
  public readonly successRateAlarm: cloudwatch.Alarm
  public readonly errorRateAlarm: cloudwatch.Alarm
  public readonly latencyAlarm: cloudwatch.Alarm
  public readonly costAlarm: cloudwatch.Alarm

  constructor(scope: Construct, id: string, props: GuestExtractionMonitoringProps) {
    super(scope, id)

    const { guestExtractionFunction, namePrefix, alertEmail, environment } = props

    // Create SNS topic for alerts
    const alertTopic = new sns.Topic(this, 'GuestExtractionAlerts', {
      topicName: `${namePrefix}-guest-extraction-alerts`,
      displayName: 'Guest Extraction Alerts',
    })

    // Add email subscription if provided
    if (alertEmail) {
      alertTopic.addSubscription(new snsSubscriptions.EmailSubscription(alertEmail))
    }

    // Create custom metrics for guest extraction
    const extractionMetrics = this.createExtractionMetrics(namePrefix, environment)

    // Create CloudWatch dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'GuestExtractionDashboard', {
      dashboardName: `${namePrefix}-guest-extraction-${environment}`,
      widgets: [
        // Row 1: Overview metrics
        new cloudwatch.GraphWidget({
          title: 'Guest Extraction Success Rate',
          width: 12,
          height: 6,
          left: [extractionMetrics.successRate, extractionMetrics.failureRate],
          leftYAxis: {
            min: 0,
            max: 100,
            label: 'Percentage',
          },
          period: cdk.Duration.minutes(5),
          statistic: 'Average',
        }),

        new cloudwatch.GraphWidget({
          title: 'Extraction Volume',
          width: 12,
          height: 6,
          left: [
            extractionMetrics.totalExtractions,
            extractionMetrics.successfulExtractions,
            extractionMetrics.failedExtractions,
          ],
          leftYAxis: {
            min: 0,
            label: 'Count',
          },
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),

        // Row 2: Performance metrics
        new cloudwatch.GraphWidget({
          title: 'Extraction Latency',
          width: 12,
          height: 6,
          left: [extractionMetrics.extractionLatency],
          leftYAxis: {
            min: 0,
            label: 'Milliseconds',
          },
          period: cdk.Duration.minutes(5),
          statistic: 'Average',
        }),

        new cloudwatch.GraphWidget({
          title: 'Bedrock API Usage',
          width: 12,
          height: 6,
          left: [extractionMetrics.bedrockApiCalls, extractionMetrics.bedrockApiErrors],
          leftYAxis: {
            min: 0,
            label: 'Count',
          },
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),

        // Row 3: Cost and error analysis
        new cloudwatch.GraphWidget({
          title: 'Estimated Bedrock Costs',
          width: 12,
          height: 6,
          left: [extractionMetrics.estimatedCost],
          leftYAxis: {
            min: 0,
            label: 'USD',
          },
          period: cdk.Duration.hours(1),
          statistic: 'Sum',
        }),

        new cloudwatch.GraphWidget({
          title: 'Error Types',
          width: 12,
          height: 6,
          left: [extractionMetrics.timeoutErrors, extractionMetrics.parseErrors, extractionMetrics.apiErrors],
          leftYAxis: {
            min: 0,
            label: 'Count',
          },
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),

        // Row 4: Lambda function metrics
        new cloudwatch.GraphWidget({
          title: 'Lambda Function Performance',
          width: 12,
          height: 6,
          left: [guestExtractionFunction.metricDuration(), guestExtractionFunction.metricErrors()],
          leftYAxis: {
            min: 0,
            label: 'Duration (ms) / Errors',
          },
          period: cdk.Duration.minutes(5),
        }),

        new cloudwatch.GraphWidget({
          title: 'Lambda Function Invocations',
          width: 12,
          height: 6,
          left: [guestExtractionFunction.metricInvocations(), guestExtractionFunction.metricThrottles()],
          leftYAxis: {
            min: 0,
            label: 'Count',
          },
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),
      ],
    })

    // Create alarms
    this.createAlarms(extractionMetrics, alertTopic, namePrefix, environment)

    // Create log insights queries
    this.createLogInsights(guestExtractionFunction, namePrefix, environment)

    // Output important ARNs and URLs
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${cdk.Stack.of(this).region}.console.aws.amazon.com/cloudwatch/home?region=${cdk.Stack.of(this).region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'Guest Extraction Dashboard URL',
    })

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: alertTopic.topicArn,
      description: 'SNS Topic ARN for Guest Extraction Alerts',
    })
  }

  private createExtractionMetrics(namePrefix: string, environment: string) {
    const namespace = `${namePrefix}/GuestExtraction`

    return {
      // Success/failure rates
      successRate: new cloudwatch.Metric({
        namespace,
        metricName: 'SuccessRate',
        dimensionsMap: {
          Environment: environment,
        },
        statistic: 'Average',
        unit: cloudwatch.Unit.PERCENT,
      }),

      failureRate: new cloudwatch.Metric({
        namespace,
        metricName: 'FailureRate',
        dimensionsMap: {
          Environment: environment,
        },
        statistic: 'Average',
        unit: cloudwatch.Unit.PERCENT,
      }),

      // Volume metrics
      totalExtractions: new cloudwatch.Metric({
        namespace,
        metricName: 'TotalExtractions',
        dimensionsMap: {
          Environment: environment,
        },
        statistic: 'Sum',
        unit: cloudwatch.Unit.COUNT,
      }),

      successfulExtractions: new cloudwatch.Metric({
        namespace,
        metricName: 'SuccessfulExtractions',
        dimensionsMap: {
          Environment: environment,
        },
        statistic: 'Sum',
        unit: cloudwatch.Unit.COUNT,
      }),

      failedExtractions: new cloudwatch.Metric({
        namespace,
        metricName: 'FailedExtractions',
        dimensionsMap: {
          Environment: environment,
        },
        statistic: 'Sum',
        unit: cloudwatch.Unit.COUNT,
      }),

      // Performance metrics
      extractionLatency: new cloudwatch.Metric({
        namespace,
        metricName: 'ExtractionLatency',
        dimensionsMap: {
          Environment: environment,
        },
        statistic: 'Average',
        unit: cloudwatch.Unit.MILLISECONDS,
      }),

      // Bedrock API metrics
      bedrockApiCalls: new cloudwatch.Metric({
        namespace,
        metricName: 'BedrockApiCalls',
        dimensionsMap: {
          Environment: environment,
        },
        statistic: 'Sum',
        unit: cloudwatch.Unit.COUNT,
      }),

      bedrockApiErrors: new cloudwatch.Metric({
        namespace,
        metricName: 'BedrockApiErrors',
        dimensionsMap: {
          Environment: environment,
        },
        statistic: 'Sum',
        unit: cloudwatch.Unit.COUNT,
      }),

      // Cost metrics
      estimatedCost: new cloudwatch.Metric({
        namespace,
        metricName: 'EstimatedCost',
        dimensionsMap: {
          Environment: environment,
        },
        statistic: 'Sum',
        unit: cloudwatch.Unit.NONE, // USD
      }),

      // Error type metrics
      timeoutErrors: new cloudwatch.Metric({
        namespace,
        metricName: 'TimeoutErrors',
        dimensionsMap: {
          Environment: environment,
        },
        statistic: 'Sum',
        unit: cloudwatch.Unit.COUNT,
      }),

      parseErrors: new cloudwatch.Metric({
        namespace,
        metricName: 'ParseErrors',
        dimensionsMap: {
          Environment: environment,
        },
        statistic: 'Sum',
        unit: cloudwatch.Unit.COUNT,
      }),

      apiErrors: new cloudwatch.Metric({
        namespace,
        metricName: 'ApiErrors',
        dimensionsMap: {
          Environment: environment,
        },
        statistic: 'Sum',
        unit: cloudwatch.Unit.COUNT,
      }),
    }
  }

  private createAlarms(
    metrics: ReturnType<typeof this.createExtractionMetrics>,
    alertTopic: sns.Topic,
    namePrefix: string,
    environment: string,
  ) {
    // Success rate alarm (alert if below 85%)
    this.successRateAlarm = new cloudwatch.Alarm(this, 'SuccessRateAlarm', {
      alarmName: `${namePrefix}-guest-extraction-success-rate-${environment}`,
      alarmDescription: 'Alert when guest extraction success rate drops below 85%',
      metric: metrics.successRate,
      threshold: 85,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })

    this.successRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic))

    // Error rate alarm (alert if above 15%)
    this.errorRateAlarm = new cloudwatch.Alarm(this, 'ErrorRateAlarm', {
      alarmName: `${namePrefix}-guest-extraction-error-rate-${environment}`,
      alarmDescription: 'Alert when guest extraction error rate exceeds 15%',
      metric: metrics.failureRate,
      threshold: 15,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })

    this.errorRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic))

    // Latency alarm (alert if average latency > 30 seconds)
    this.latencyAlarm = new cloudwatch.Alarm(this, 'LatencyAlarm', {
      alarmName: `${namePrefix}-guest-extraction-latency-${environment}`,
      alarmDescription: 'Alert when guest extraction latency exceeds 30 seconds',
      metric: metrics.extractionLatency,
      threshold: 30000, // 30 seconds in milliseconds
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })

    this.latencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic))

    // Cost alarm (alert if estimated cost > $50/day)
    this.costAlarm = new cloudwatch.Alarm(this, 'CostAlarm', {
      alarmName: `${namePrefix}-guest-extraction-cost-${environment}`,
      alarmDescription: 'Alert when estimated daily cost exceeds $50',
      metric: metrics.estimatedCost,
      threshold: 50,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      period: cdk.Duration.hours(24),
      statistic: 'Sum',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })

    this.costAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic))
  }

  private createLogInsights(guestExtractionFunction: lambda.Function, namePrefix: string, environment: string) {
    // Create custom log group for structured guest extraction logs
    const logGroup = new logs.LogGroup(this, 'GuestExtractionLogs', {
      logGroupName: `/aws/lambda/${guestExtractionFunction.functionName}/guest-extraction`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Create CloudWatch Insights queries
    const queries = [
      {
        name: 'Top Failed Extractions',
        query: `
          fields @timestamp, episodeId, errorType, errorMessage
          | filter @message like /GUEST_EXTRACTION_FAILED/
          | stats count() by errorType
          | sort count desc
          | limit 10
        `,
      },
      {
        name: 'Extraction Performance by Episode',
        query: `
          fields @timestamp, episodeId, extractionLatency, confidence
          | filter @message like /GUEST_EXTRACTION_SUCCESS/
          | stats avg(extractionLatency) as avgLatency, avg(confidence) as avgConfidence by episodeId
          | sort avgLatency desc
          | limit 20
        `,
      },
      {
        name: 'Bedrock API Errors',
        query: `
          fields @timestamp, episodeId, errorType, errorMessage
          | filter @message like /BEDROCK_API_ERROR/
          | stats count() by errorType
          | sort count desc
          | limit 10
        `,
      },
      {
        name: 'Cost Analysis',
        query: `
          fields @timestamp, episodeId, bedrockCost, tokensUsed
          | filter @message like /GUEST_EXTRACTION_COST/
          | stats sum(bedrockCost) as totalCost, avg(tokensUsed) as avgTokens by bin(5m)
          | sort @timestamp desc
          | limit 100
        `,
      },
    ]

    // Output log group name and sample queries
    new cdk.CfnOutput(this, 'LogGroupName', {
      value: logGroup.logGroupName,
      description: 'CloudWatch Log Group for Guest Extraction',
    })

    new cdk.CfnOutput(this, 'LogInsightsQueries', {
      value: JSON.stringify(queries, null, 2),
      description: 'Sample CloudWatch Insights queries for guest extraction analysis',
    })
  }
}
