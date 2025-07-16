import * as cdk from 'aws-cdk-lib'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import { Construct } from 'constructs'

export interface ComprehensiveGuestExtractionMonitoringProps {
  guestExtractionQueue: sqs.Queue
  guestExtractionDlq: sqs.Queue
  guestExtractionProcessor: lambda.Function
  episodeHandler: lambda.Function
  podcastHandler: lambda.Function
}

export class ComprehensiveGuestExtractionMonitoring extends Construct {
  public readonly dashboard: cloudwatch.Dashboard

  constructor(scope: Construct, id: string, props: ComprehensiveGuestExtractionMonitoringProps) {
    super(scope, id)

    // Create comprehensive monitoring dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'ComprehensiveGuestExtractionDashboard', {
      dashboardName: 'Rewind-Guest-Extraction-Comprehensive-Monitoring',
      defaultInterval: cdk.Duration.hours(1),
    })

    // Add all monitoring widgets
    this.addSqsMetrics(props.guestExtractionQueue, props.guestExtractionDlq)
    this.addLambdaMetrics(props.guestExtractionProcessor, props.episodeHandler, props.podcastHandler)
    this.addBedrockMetrics()
    this.addGuestExtractionMetrics()
    this.addLogAnalysis()
    this.addRealTimeAlerting()
  }

  private addSqsMetrics(queue: sqs.Queue, dlq: sqs.Queue): void {
    // SQS Queue Metrics
    const messagesSentMetric = queue.metric('NumberOfMessagesSent', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const messagesReceivedMetric = queue.metric('NumberOfMessagesReceived', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const messagesDeletedMetric = queue.metric('NumberOfMessagesDeleted', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const messagesVisibleMetric = queue.metric('ApproximateNumberOfMessages', {
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    })

    const messagesNotVisibleMetric = queue.metric('ApproximateNumberOfMessagesNotVisible', {
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    })

    const messagesDelayedMetric = queue.metric('ApproximateNumberOfMessagesDelayed', {
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    })

    const oldestMessageAgeMetric = queue.metric('ApproximateAgeOfOldestMessage', {
      period: cdk.Duration.minutes(1),
      statistic: 'Maximum',
    })

    // DLQ Metrics
    const dlqMessagesMetric = dlq.metric('ApproximateNumberOfMessages', {
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    })

    const dlqMessagesSentMetric = dlq.metric('NumberOfMessagesSent', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    // SQS Dashboard Row 1: Message Flow
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'SQS Message Flow (Real-time)',
        left: [messagesSentMetric, messagesReceivedMetric, messagesDeletedMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(1),
        statistic: 'Sum',
      }),
      new cloudwatch.GraphWidget({
        title: 'SQS Queue Depth',
        left: [messagesVisibleMetric, messagesNotVisibleMetric, messagesDelayedMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(1),
        statistic: 'Average',
      }),
    )

    // SQS Dashboard Row 2: Queue Health
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Message Age & DLQ Status',
        left: [oldestMessageAgeMetric],
        right: [dlqMessagesMetric, dlqMessagesSentMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(1),
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Current Queue Status',
        metrics: [messagesVisibleMetric, messagesNotVisibleMetric, dlqMessagesMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(1),
      }),
    )
  }

  private addLambdaMetrics(
    processor: lambda.Function,
    episodeHandler: lambda.Function,
    podcastHandler: lambda.Function,
  ): void {
    // Lambda Metrics for Guest Extraction Processor
    const processorInvocationsMetric = processor.metric('Invocations', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const processorErrorsMetric = processor.metric('Errors', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const processorDurationMetric = processor.metric('Duration', {
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    })

    const processorThrottlesMetric = processor.metric('Throttles', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const processorConcurrentExecutionsMetric = processor.metric('ConcurrentExecutions', {
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    })

    // Lambda Error Rate
    const processorErrorRateMetric = new cloudwatch.MathExpression({
      expression: 'errors / invocations * 100',
      usingMetrics: {
        errors: processorErrorsMetric,
        invocations: processorInvocationsMetric,
      },
      label: 'Error Rate (%)',
    })

    // Episode Handler Metrics
    const episodeInvocationsMetric = episodeHandler.metric('Invocations', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const episodeErrorsMetric = episodeHandler.metric('Errors', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    // Podcast Handler Metrics
    const podcastInvocationsMetric = podcastHandler.metric('Invocations', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const podcastErrorsMetric = podcastHandler.metric('Errors', {
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    // Lambda Dashboard Row 3: Processing Performance
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Invocations (Real-time)',
        left: [processorInvocationsMetric, episodeInvocationsMetric, podcastInvocationsMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(1),
        statistic: 'Sum',
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Errors & Error Rate',
        left: [processorErrorsMetric, episodeErrorsMetric, podcastErrorsMetric],
        right: [processorErrorRateMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(1),
      }),
    )

    // Lambda Dashboard Row 4: Performance Metrics
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Processor Duration & Throttles',
        left: [processorDurationMetric],
        right: [processorThrottlesMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(1),
      }),
      new cloudwatch.GraphWidget({
        title: 'Concurrent Executions',
        left: [processorConcurrentExecutionsMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(1),
        statistic: 'Average',
      }),
    )
  }

  private addBedrockMetrics(): void {
    // Bedrock API Metrics
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

    const bedrockServerErrorsMetric = new cloudwatch.Metric({
      namespace: 'AWS/Bedrock',
      metricName: 'ServerError',
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

    const bedrockInputTokensMetric = new cloudwatch.Metric({
      namespace: 'AWS/Bedrock',
      metricName: 'InputTokenCount',
      dimensionsMap: {
        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      },
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const bedrockOutputTokensMetric = new cloudwatch.Metric({
      namespace: 'AWS/Bedrock',
      metricName: 'OutputTokenCount',
      dimensionsMap: {
        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      },
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    // Bedrock Error Rate
    const bedrockErrorRateMetric = new cloudwatch.MathExpression({
      expression: '(client_errors + server_errors) / invocations * 100',
      usingMetrics: {
        client_errors: bedrockErrorsMetric,
        server_errors: bedrockServerErrorsMetric,
        invocations: bedrockInvocationsMetric,
      },
      label: 'Bedrock Error Rate (%)',
    })

    // Bedrock Dashboard Row 5: API Health
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Bedrock API Calls (Real-time)',
        left: [bedrockInvocationsMetric, bedrockErrorsMetric, bedrockServerErrorsMetric],
        right: [bedrockErrorRateMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(1),
      }),
      new cloudwatch.GraphWidget({
        title: 'Bedrock Throttles & Token Usage',
        left: [bedrockThrottlesMetric],
        right: [bedrockInputTokensMetric, bedrockOutputTokensMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(1),
      }),
    )
  }

  private addGuestExtractionMetrics(): void {
    // Custom Guest Extraction Metrics
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

    const processingLatencyMetric = new cloudwatch.Metric({
      namespace: 'Rewind/GuestExtraction',
      metricName: 'ProcessingLatency',
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    })

    const confidenceScoreMetric = new cloudwatch.Metric({
      namespace: 'Rewind/GuestExtraction',
      metricName: 'ConfidenceScore',
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    })

    const costMetric = new cloudwatch.Metric({
      namespace: 'Rewind/GuestExtraction',
      metricName: 'BedrockApiCost',
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    const episodesProcessedMetric = new cloudwatch.Metric({
      namespace: 'Rewind/GuestExtraction',
      metricName: 'EpisodesProcessed',
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    })

    // Success Rate Calculation
    const successRateMetric = new cloudwatch.MathExpression({
      expression: 'successful / (successful + failed) * 100',
      usingMetrics: {
        successful: successfulExtractionsMetric,
        failed: failedExtractionsMetric,
      },
      label: 'Success Rate (%)',
    })

    // Guest Extraction Dashboard Row 6: Business Metrics
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Guest Extraction Success Rate (Real-time)',
        left: [successRateMetric],
        right: [successfulExtractionsMetric, failedExtractionsMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(1),
      }),
      new cloudwatch.GraphWidget({
        title: 'Processing Performance',
        left: [processingLatencyMetric],
        right: [confidenceScoreMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(1),
      }),
    )

    // Guest Extraction Dashboard Row 7: Volume & Cost
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Episodes Processed (Real-time)',
        left: [episodesProcessedMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(1),
        statistic: 'Sum',
      }),
      new cloudwatch.GraphWidget({
        title: 'Bedrock API Cost (Real-time)',
        left: [costMetric],
        width: 12,
        height: 6,
        period: cdk.Duration.minutes(1),
        statistic: 'Sum',
      }),
    )
  }

  private addLogAnalysis(): void {
    // Create text widgets for log analysis instructions since LogQueryWidget may not be available
    const logAnalysisInstructions = new cloudwatch.TextWidget({
      markdown: `
## Log Analysis Instructions

### Error Analysis Query:
\`\`\`
filter @message like /ERROR/ or @message like /Failed/ or @message like /Exception/
| stats count() by bin(5m)
| sort @timestamp desc
\`\`\`

### Successful Guest Extractions Query:
\`\`\`
filter @message like /Successfully processed/ or @message like /Guest extraction completed/
| stats count() by bin(5m)
| sort @timestamp desc
\`\`\`

### SQS Message Flow Analysis Query:
\`\`\`
filter @message like /SQS/ or @message like /queue/ or @message like /message/
| stats count() by bin(5m)
| sort @timestamp desc
\`\`\`

### Bedrock API Call Analysis Query:
\`\`\`
filter @message like /bedrock/ or @message like /claude/ or @message like /model/
| stats count() by bin(5m)
| sort @timestamp desc
\`\`\`

**Log Groups to Query:**
- /aws/lambda/guest-extraction-processor
- /aws/lambda/episode-handler
- /aws/lambda/podcast-handler
      `,
      width: 24,
      height: 6,
    })

    // Log Analysis Dashboard Row 8: Log Analysis Instructions
    this.dashboard.addWidgets(logAnalysisInstructions)
  }

  private addRealTimeAlerting(): void {
    // Real-time metric widgets for immediate visibility
    const realTimeStatusWidget = new cloudwatch.SingleValueWidget({
      title: 'Real-time Status Dashboard',
      metrics: [
        new cloudwatch.Metric({
          namespace: 'AWS/SQS',
          metricName: 'ApproximateNumberOfMessages',
          dimensionsMap: {
            QueueName: 'guest-extraction-queue',
          },
          period: cdk.Duration.minutes(1),
          statistic: 'Average',
          label: 'Queue Depth',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/SQS',
          metricName: 'ApproximateNumberOfMessages',
          dimensionsMap: {
            QueueName: 'guest-extraction-dlq',
          },
          period: cdk.Duration.minutes(1),
          statistic: 'Average',
          label: 'DLQ Messages',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Invocations',
          dimensionsMap: {
            FunctionName: 'guest-extraction-processor',
          },
          period: cdk.Duration.minutes(1),
          statistic: 'Sum',
          label: 'Processor Invocations',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/Bedrock',
          metricName: 'Invocations',
          dimensionsMap: {
            ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
          },
          period: cdk.Duration.minutes(1),
          statistic: 'Sum',
          label: 'Bedrock Calls',
        }),
      ],
      width: 24,
      height: 6,
      period: cdk.Duration.minutes(1),
    })

    // Real-time Status Dashboard Row 10: Live Status
    this.dashboard.addWidgets(realTimeStatusWidget)
  }
}
