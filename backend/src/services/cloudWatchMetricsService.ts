import { CloudWatch } from 'aws-sdk'
import { logger } from './loggerService'

export interface GuestExtractionMetrics {
  episodeId: string
  success: boolean
  processingTime: number
  guestCount: number
  confidence: number
  error?: string
}

export interface BedrockApiMetrics {
  inputTokens: number
  outputTokens: number
  cost: number
  model: string
}

class CloudWatchMetricsService {
  private cloudWatch: CloudWatch
  private readonly namespace = 'Rewind/GuestExtraction'

  constructor() {
    this.cloudWatch = new CloudWatch({
      region: process.env.AWS_REGION || 'us-east-1',
    })
  }

  /**
   * Publishes guest extraction metrics to CloudWatch
   */
  async publishGuestExtractionMetrics(metrics: GuestExtractionMetrics): Promise<void> {
    try {
      const timestamp = new Date()
      const metricData: CloudWatch.MetricData = []

      // Success/failure metrics
      metricData.push({
        MetricName: metrics.success ? 'SuccessfulExtractions' : 'FailedExtractions',
        Value: 1,
        Unit: 'Count',
        Timestamp: timestamp,
        Dimensions: [
          {
            Name: 'Environment',
            Value: process.env.NODE_ENV || 'development',
          },
        ],
      })

      // Episodes processed metric
      metricData.push({
        MetricName: 'EpisodesProcessed',
        Value: 1,
        Unit: 'Count',
        Timestamp: timestamp,
        Dimensions: [
          {
            Name: 'Environment',
            Value: process.env.NODE_ENV || 'development',
          },
        ],
      })

      // Processing latency metric
      metricData.push({
        MetricName: 'ProcessingLatency',
        Value: metrics.processingTime,
        Unit: 'Milliseconds',
        Timestamp: timestamp,
        Dimensions: [
          {
            Name: 'Environment',
            Value: process.env.NODE_ENV || 'development',
          },
        ],
      })

      // Guest count metric (for analysis)
      if (metrics.success) {
        metricData.push({
          MetricName: 'GuestsExtracted',
          Value: metrics.guestCount,
          Unit: 'Count',
          Timestamp: timestamp,
          Dimensions: [
            {
              Name: 'Environment',
              Value: process.env.NODE_ENV || 'development',
            },
          ],
        })

        // Confidence score metric
        metricData.push({
          MetricName: 'ConfidenceScore',
          Value: metrics.confidence,
          Unit: 'Percent',
          Timestamp: timestamp,
          Dimensions: [
            {
              Name: 'Environment',
              Value: process.env.NODE_ENV || 'development',
            },
          ],
        })
      }

      // Error type metric (if failed)
      if (!metrics.success && metrics.error) {
        metricData.push({
          MetricName: 'ExtractionErrors',
          Value: 1,
          Unit: 'Count',
          Timestamp: timestamp,
          Dimensions: [
            {
              Name: 'Environment',
              Value: process.env.NODE_ENV || 'development',
            },
            {
              Name: 'ErrorType',
              Value: this.categorizeError(metrics.error),
            },
          ],
        })
      }

      // Publish metrics to CloudWatch
      await this.cloudWatch
        .putMetricData({
          Namespace: this.namespace,
          MetricData: metricData,
        })
        .promise()

      logger.debug('Published guest extraction metrics to CloudWatch', {
        episodeId: metrics.episodeId,
        success: metrics.success,
        processingTime: metrics.processingTime,
        metricsCount: metricData.length,
      })
    } catch (error) {
      logger.error('Failed to publish guest extraction metrics', error, {
        episodeId: metrics.episodeId,
        success: metrics.success,
      })
      // Don't throw error - metrics publishing shouldn't break the main flow
    }
  }

  /**
   * Publishes Bedrock API usage metrics to CloudWatch
   */
  async publishBedrockApiMetrics(metrics: BedrockApiMetrics): Promise<void> {
    try {
      const timestamp = new Date()
      const metricData: CloudWatch.MetricData = []

      // Input tokens metric
      metricData.push({
        MetricName: 'BedrockInputTokens',
        Value: metrics.inputTokens,
        Unit: 'Count',
        Timestamp: timestamp,
        Dimensions: [
          {
            Name: 'Environment',
            Value: process.env.NODE_ENV || 'development',
          },
          {
            Name: 'Model',
            Value: metrics.model,
          },
        ],
      })

      // Output tokens metric
      metricData.push({
        MetricName: 'BedrockOutputTokens',
        Value: metrics.outputTokens,
        Unit: 'Count',
        Timestamp: timestamp,
        Dimensions: [
          {
            Name: 'Environment',
            Value: process.env.NODE_ENV || 'development',
          },
          {
            Name: 'Model',
            Value: metrics.model,
          },
        ],
      })

      // Cost metric
      metricData.push({
        MetricName: 'BedrockApiCost',
        Value: metrics.cost,
        Unit: 'None', // USD amount
        Timestamp: timestamp,
        Dimensions: [
          {
            Name: 'Environment',
            Value: process.env.NODE_ENV || 'development',
          },
          {
            Name: 'Model',
            Value: metrics.model,
          },
        ],
      })

      // API call count
      metricData.push({
        MetricName: 'BedrockApiCalls',
        Value: 1,
        Unit: 'Count',
        Timestamp: timestamp,
        Dimensions: [
          {
            Name: 'Environment',
            Value: process.env.NODE_ENV || 'development',
          },
          {
            Name: 'Model',
            Value: metrics.model,
          },
        ],
      })

      // Publish metrics to CloudWatch
      await this.cloudWatch
        .putMetricData({
          Namespace: this.namespace,
          MetricData: metricData,
        })
        .promise()

      logger.debug('Published Bedrock API metrics to CloudWatch', {
        inputTokens: metrics.inputTokens,
        outputTokens: metrics.outputTokens,
        cost: metrics.cost,
        model: metrics.model,
      })
    } catch (error) {
      logger.error('Failed to publish Bedrock API metrics', error, {
        inputTokens: metrics.inputTokens,
        outputTokens: metrics.outputTokens,
        cost: metrics.cost,
        model: metrics.model,
      })
      // Don't throw error - metrics publishing shouldn't break the main flow
    }
  }

  /**
   * Publishes batch processing metrics
   */
  async publishBatchMetrics(
    batchSize: number,
    processingTime: number,
    successCount: number,
    failureCount: number,
  ): Promise<void> {
    try {
      const timestamp = new Date()
      const metricData: CloudWatch.MetricData = []

      // Batch processing metrics
      metricData.push({
        MetricName: 'BatchSize',
        Value: batchSize,
        Unit: 'Count',
        Timestamp: timestamp,
        Dimensions: [
          {
            Name: 'Environment',
            Value: process.env.NODE_ENV || 'development',
          },
        ],
      })

      metricData.push({
        MetricName: 'BatchProcessingTime',
        Value: processingTime,
        Unit: 'Milliseconds',
        Timestamp: timestamp,
        Dimensions: [
          {
            Name: 'Environment',
            Value: process.env.NODE_ENV || 'development',
          },
        ],
      })

      metricData.push({
        MetricName: 'BatchSuccessCount',
        Value: successCount,
        Unit: 'Count',
        Timestamp: timestamp,
        Dimensions: [
          {
            Name: 'Environment',
            Value: process.env.NODE_ENV || 'development',
          },
        ],
      })

      metricData.push({
        MetricName: 'BatchFailureCount',
        Value: failureCount,
        Unit: 'Count',
        Timestamp: timestamp,
        Dimensions: [
          {
            Name: 'Environment',
            Value: process.env.NODE_ENV || 'development',
          },
        ],
      })

      // Publish metrics to CloudWatch
      await this.cloudWatch
        .putMetricData({
          Namespace: this.namespace,
          MetricData: metricData,
        })
        .promise()

      logger.debug('Published batch processing metrics to CloudWatch', {
        batchSize,
        processingTime,
        successCount,
        failureCount,
      })
    } catch (error) {
      logger.error('Failed to publish batch processing metrics', error, {
        batchSize,
        processingTime,
        successCount,
        failureCount,
      })
      // Don't throw error - metrics publishing shouldn't break the main flow
    }
  }

  /**
   * Categorizes error messages for metrics
   */
  private categorizeError(error: string): string {
    const errorLower = error.toLowerCase()

    if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
      return 'Timeout'
    }
    if (errorLower.includes('throttle') || errorLower.includes('rate limit')) {
      return 'RateLimit'
    }
    if (errorLower.includes('bedrock') || errorLower.includes('model')) {
      return 'BedrockError'
    }
    if (errorLower.includes('validation') || errorLower.includes('invalid')) {
      return 'ValidationError'
    }
    if (errorLower.includes('network') || errorLower.includes('connection')) {
      return 'NetworkError'
    }

    return 'UnknownError'
  }
}

export const cloudWatchMetricsService = new CloudWatchMetricsService()
export default cloudWatchMetricsService
