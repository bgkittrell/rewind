import * as cdk from 'aws-cdk-lib'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import { Construct } from 'constructs'

export interface EmergencyGuestExtractionMonitoringProps {
  guestExtractionQueue: sqs.Queue
  guestExtractionDlq: sqs.Queue
  guestExtractionProcessor: lambda.Function
  episodeHandler: lambda.Function
  podcastHandler: lambda.Function
}

export class EmergencyGuestExtractionMonitoring extends Construct {
  public readonly dashboard: cloudwatch.Dashboard

  constructor(scope: Construct, id: string, props: EmergencyGuestExtractionMonitoringProps) {
    super(scope, id)

    // Create emergency monitoring dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'EmergencyGuestExtractionDashboard', {
      dashboardName: 'EMERGENCY-Guest-Extraction-Pipeline-Monitoring',
      defaultInterval: cdk.Duration.minutes(5),
    })

    this.addCriticalMetrics(props)
  }

  private addCriticalMetrics(props: EmergencyGuestExtractionMonitoringProps): void {
    // SQS Queue Metrics
    const messagesSentMetric = props.guestExtractionQueue.metric('NumberOfMessagesSent', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const messagesReceivedMetric = props.guestExtractionQueue.metric('NumberOfMessagesReceived', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const messagesDeletedMetric = props.guestExtractionQueue.metric('NumberOfMessagesDeleted', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const queueDepthMetric = props.guestExtractionQueue.metric('ApproximateNumberOfMessages', {
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    })

    const dlqDepthMetric = props.guestExtractionDlq.metric('ApproximateNumberOfMessages', {
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    })

    // Lambda Metrics
    const processorInvocationsMetric = props.guestExtractionProcessor.metric('Invocations', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const processorErrorsMetric = props.guestExtractionProcessor.metric('Errors', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const processorDurationMetric = props.guestExtractionProcessor.metric('Duration', {
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    })

    const episodeInvocationsMetric = props.episodeHandler.metric('Invocations', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const episodeErrorsMetric = props.episodeHandler.metric('Errors', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const podcastInvocationsMetric = props.podcastHandler.metric('Invocations', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const podcastErrorsMetric = props.podcastHandler.metric('Errors', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    // Bedrock Metrics
    const bedrockInvocationsMetric = new cloudwatch.Metric({
      namespace: 'AWS/Bedrock',
      metricName: 'Invocations',
      dimensionsMap: {
        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      },
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const bedrockErrorsMetric = new cloudwatch.Metric({
      namespace: 'AWS/Bedrock',
      metricName: 'ClientError',
      dimensionsMap: {
        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      },
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const bedrockThrottlesMetric = new cloudwatch.Metric({
      namespace: 'AWS/Bedrock',
      metricName: 'ModelInvocationThrottles',
      dimensionsMap: {
        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      },
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    // Guest Extraction Custom Metrics
    const successfulExtractionsMetric = new cloudwatch.Metric({
      namespace: 'Rewind/GuestExtraction',
      metricName: 'SuccessfulExtractions',
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const failedExtractionsMetric = new cloudwatch.Metric({
      namespace: 'Rewind/GuestExtraction',
      metricName: 'FailedExtractions',
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    // Real-time Status
    const realTimeStatusWidget = new cloudwatch.SingleValueWidget({
      title: 'REAL-TIME PIPELINE STATUS',
      metrics: [
        queueDepthMetric.with({ label: 'Queue Depth' }),
        dlqDepthMetric.with({ label: 'DLQ Messages' }),
        processorInvocationsMetric.with({ label: 'Processor Invocations' }),
        bedrockInvocationsMetric.with({ label: 'Bedrock Calls' }),
      ],
      width: 24,
      height: 6,
    })

    // SQS Message Flow
    const sqsFlowWidget = new cloudwatch.GraphWidget({
      title: 'SQS Message Flow (1-minute resolution)',
      left: [messagesSentMetric, messagesReceivedMetric, messagesDeletedMetric],
      width: 12,
      height: 6,
    })

    // Queue Depth
    const queueDepthWidget = new cloudwatch.GraphWidget({
      title: 'Queue Depth Monitoring',
      left: [queueDepthMetric],
      right: [dlqDepthMetric],
      width: 12,
      height: 6,
    })

    // Lambda Performance
    const lambdaPerformanceWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Invocations',
      left: [processorInvocationsMetric, episodeInvocationsMetric, podcastInvocationsMetric],
      width: 12,
      height: 6,
    })

    // Lambda Errors
    const lambdaErrorsWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Errors',
      left: [processorErrorsMetric, episodeErrorsMetric, podcastErrorsMetric],
      width: 12,
      height: 6,
    })

    // Bedrock API Monitoring
    const bedrockWidget = new cloudwatch.GraphWidget({
      title: 'Bedrock API Calls & Errors',
      left: [bedrockInvocationsMetric, bedrockErrorsMetric, bedrockThrottlesMetric],
      width: 12,
      height: 6,
    })

    // Guest Extraction Success/Failure
    const guestExtractionWidget = new cloudwatch.GraphWidget({
      title: 'Guest Extraction Results',
      left: [successfulExtractionsMetric, failedExtractionsMetric],
      width: 12,
      height: 6,
    })

    // Processing Duration
    const durationWidget = new cloudwatch.GraphWidget({
      title: 'Processing Duration',
      left: [processorDurationMetric],
      width: 12,
      height: 6,
    })

    // Emergency Instructions
    const instructionsWidget = new cloudwatch.TextWidget({
      markdown: `# 🚨 EMERGENCY GUEST EXTRACTION PIPELINE MONITORING

## Key Metrics to Watch:
- **Queue Depth**: Should be 0 when idle, shows backlog when processing
- **DLQ Messages**: Should be 0 - any messages here indicate failures
- **Processor Invocations**: Should match messages received from queue
- **Bedrock Calls**: Should match successful processor invocations
- **Guest Extraction Results**: Success vs failure counts

## Troubleshooting:
1. **High Queue Depth**: Check processor errors and Bedrock throttling
2. **DLQ Messages**: Check processor logs for error details
3. **Zero Processor Invocations**: Check SQS event source configuration
4. **Bedrock Throttles**: Reduce processing rate or check API limits
5. **Zero Guest Extraction Results**: Check custom metrics publishing

## Log Groups to Check:
- /aws/lambda/guest-extraction-processor
- /aws/lambda/episode-handler
- /aws/lambda/podcast-handler
      `,
      width: 12,
      height: 6,
    })

    // Add all widgets to dashboard
    this.dashboard.addWidgets(
      // Row 1: Real-time status
      realTimeStatusWidget,
      // Row 2: SQS monitoring
      sqsFlowWidget,
      queueDepthWidget,
      // Row 3: Lambda monitoring
      lambdaPerformanceWidget,
      lambdaErrorsWidget,
      // Row 4: Bedrock & Results
      bedrockWidget,
      guestExtractionWidget,
      // Row 5: Duration & Instructions
      durationWidget,
      instructionsWidget,
    )

    // Create critical alarms
    this.createCriticalAlarms(props)
  }

  private createCriticalAlarms(props: EmergencyGuestExtractionMonitoringProps): void {
    // DLQ Alarm - Critical
    new cloudwatch.Alarm(this, 'DLQMessagesAlarm', {
      alarmName: 'EMERGENCY-Guest-Extraction-DLQ-Messages',
      alarmDescription: 'Messages in DLQ indicate guest extraction failures',
      metric: props.guestExtractionDlq.metric('ApproximateNumberOfMessages'),
      threshold: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })

    // Processor Error Alarm
    new cloudwatch.Alarm(this, 'ProcessorErrorsAlarm', {
      alarmName: 'EMERGENCY-Guest-Extraction-Processor-Errors',
      alarmDescription: 'High error rate in guest extraction processor',
      metric: props.guestExtractionProcessor.metric('Errors'),
      threshold: 5,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })

    // Queue Depth Alarm
    new cloudwatch.Alarm(this, 'QueueDepthAlarm', {
      alarmName: 'EMERGENCY-Guest-Extraction-Queue-Depth',
      alarmDescription: 'High queue depth indicates processing backlog',
      metric: props.guestExtractionQueue.metric('ApproximateNumberOfMessages'),
      threshold: 50,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      evaluationPeriods: 3,
      datapointsToAlarm: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })
  }
}
