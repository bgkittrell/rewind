import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch'
import { logger } from './logger'

export interface GuestExtractionMetrics {
  episodeId: string
  extractionStartTime: number
  extractionEndTime: number
  success: boolean
  errorType?: string
  errorMessage?: string
  confidence?: number
  extractedGuestCount?: number
  bedrockApiCalls?: number
  bedrockApiErrors?: number
  estimatedCost?: number
  tokensUsed?: number
}

export class GuestExtractionMetricsService {
  private cloudWatchClient: CloudWatchClient
  private namespace: string
  private environment: string

  constructor() {
    this.cloudWatchClient = new CloudWatchClient({
      region: process.env.AWS_REGION || 'us-east-1',
    })
    this.namespace = 'Rewind/GuestExtraction'
    this.environment = process.env.ENVIRONMENT || 'production'
  }

  /**
   * Publish comprehensive guest extraction metrics to CloudWatch
   */
  async publishMetrics(metrics: GuestExtractionMetrics): Promise<void> {
    try {
      const extractionLatency = metrics.extractionEndTime - metrics.extractionStartTime
      const timestamp = new Date()

      const metricData = [
        // Success/failure metrics
        {
          MetricName: 'TotalExtractions',
          Value: 1,
          Unit: 'Count',
          Timestamp: timestamp,
          Dimensions: [
            { Name: 'Environment', Value: this.environment },
            { Name: 'Success', Value: metrics.success.toString() },
          ],
        },
        {
          MetricName: metrics.success ? 'SuccessfulExtractions' : 'FailedExtractions',
          Value: 1,
          Unit: 'Count',
          Timestamp: timestamp,
          Dimensions: [{ Name: 'Environment', Value: this.environment }],
        },

        // Success/failure rate metrics
        {
          MetricName: 'SuccessRate',
          Value: metrics.success ? 100 : 0,
          Unit: 'Percent',
          Timestamp: timestamp,
          Dimensions: [{ Name: 'Environment', Value: this.environment }],
        },
        {
          MetricName: 'FailureRate',
          Value: metrics.success ? 0 : 100,
          Unit: 'Percent',
          Timestamp: timestamp,
          Dimensions: [{ Name: 'Environment', Value: this.environment }],
        },

        // Performance metrics
        {
          MetricName: 'ExtractionLatency',
          Value: extractionLatency,
          Unit: 'Milliseconds',
          Timestamp: timestamp,
          Dimensions: [{ Name: 'Environment', Value: this.environment }],
        },
      ]

      // Add success-specific metrics
      if (metrics.success) {
        if (metrics.confidence !== undefined) {
          metricData.push({
            MetricName: 'ExtractionConfidence',
            Value: metrics.confidence,
            Unit: 'Percent',
            Timestamp: timestamp,
            Dimensions: [{ Name: 'Environment', Value: this.environment }],
          })
        }

        if (metrics.extractedGuestCount !== undefined) {
          metricData.push({
            MetricName: 'GuestCount',
            Value: metrics.extractedGuestCount,
            Unit: 'Count',
            Timestamp: timestamp,
            Dimensions: [{ Name: 'Environment', Value: this.environment }],
          })
        }
      }

      // Add error-specific metrics
      if (!metrics.success && metrics.errorType) {
        metricData.push({
          MetricName: `${metrics.errorType}Errors`,
          Value: 1,
          Unit: 'Count',
          Timestamp: timestamp,
          Dimensions: [
            { Name: 'Environment', Value: this.environment },
            { Name: 'ErrorType', Value: metrics.errorType },
          ],
        })
      }

      // Add Bedrock API metrics
      if (metrics.bedrockApiCalls !== undefined) {
        metricData.push({
          MetricName: 'BedrockApiCalls',
          Value: metrics.bedrockApiCalls,
          Unit: 'Count',
          Timestamp: timestamp,
          Dimensions: [{ Name: 'Environment', Value: this.environment }],
        })
      }

      if (metrics.bedrockApiErrors !== undefined && metrics.bedrockApiErrors > 0) {
        metricData.push({
          MetricName: 'BedrockApiErrors',
          Value: metrics.bedrockApiErrors,
          Unit: 'Count',
          Timestamp: timestamp,
          Dimensions: [{ Name: 'Environment', Value: this.environment }],
        })
      }

      // Add cost metrics
      if (metrics.estimatedCost !== undefined) {
        metricData.push({
          MetricName: 'EstimatedCost',
          Value: metrics.estimatedCost,
          Unit: 'None', // USD
          Timestamp: timestamp,
          Dimensions: [{ Name: 'Environment', Value: this.environment }],
        })
      }

      if (metrics.tokensUsed !== undefined) {
        metricData.push({
          MetricName: 'TokensUsed',
          Value: metrics.tokensUsed,
          Unit: 'Count',
          Timestamp: timestamp,
          Dimensions: [{ Name: 'Environment', Value: this.environment }],
        })
      }

      // Publish metrics in batches (CloudWatch limit is 20 metrics per request)
      const batchSize = 20
      for (let i = 0; i < metricData.length; i += batchSize) {
        const batch = metricData.slice(i, i + batchSize)

        const command = new PutMetricDataCommand({
          Namespace: this.namespace,
          MetricData: batch,
        })

        await this.cloudWatchClient.send(command)
      }

      // Log structured data for CloudWatch Insights
      this.logStructuredMetrics(metrics, extractionLatency)
    } catch (error) {
      logger.error('Failed to publish guest extraction metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        episodeId: metrics.episodeId,
        correlationId: process.env.CORRELATION_ID,
      })
    }
  }

  /**
   * Log structured metrics for CloudWatch Insights analysis
   */
  private logStructuredMetrics(metrics: GuestExtractionMetrics, extractionLatency: number): void {
    const logData = {
      timestamp: new Date().toISOString(),
      level: metrics.success ? 'INFO' : 'ERROR',
      correlationId: process.env.CORRELATION_ID,
      episodeId: metrics.episodeId,
      extractionLatency,
      success: metrics.success,
      environment: this.environment,
      ...(metrics.success && {
        confidence: metrics.confidence,
        extractedGuestCount: metrics.extractedGuestCount,
      }),
      ...(metrics.bedrockApiCalls && {
        bedrockApiCalls: metrics.bedrockApiCalls,
        bedrockApiErrors: metrics.bedrockApiErrors,
      }),
      ...(metrics.estimatedCost && {
        estimatedCost: metrics.estimatedCost,
        tokensUsed: metrics.tokensUsed,
      }),
      ...(!metrics.success && {
        errorType: metrics.errorType,
        errorMessage: metrics.errorMessage,
      }),
    }

    if (metrics.success) {
      logger.info('GUEST_EXTRACTION_SUCCESS', logData)
    } else {
      logger.error('GUEST_EXTRACTION_FAILED', logData)
    }

    // Log cost information separately for analysis
    if (metrics.estimatedCost) {
      logger.info('GUEST_EXTRACTION_COST', {
        timestamp: new Date().toISOString(),
        correlationId: process.env.CORRELATION_ID,
        episodeId: metrics.episodeId,
        bedrockCost: metrics.estimatedCost,
        tokensUsed: metrics.tokensUsed,
        environment: this.environment,
      })
    }

    // Log Bedrock API errors separately
    if (metrics.bedrockApiErrors && metrics.bedrockApiErrors > 0) {
      logger.error('BEDROCK_API_ERROR', {
        timestamp: new Date().toISOString(),
        correlationId: process.env.CORRELATION_ID,
        episodeId: metrics.episodeId,
        apiErrors: metrics.bedrockApiErrors,
        errorType: metrics.errorType,
        errorMessage: metrics.errorMessage,
        environment: this.environment,
      })
    }
  }

  /**
   * Track simple success/failure metrics
   */
  async trackExtractionResult(
    episodeId: string,
    success: boolean,
    latency: number,
    errorType?: string,
    errorMessage?: string,
  ): Promise<void> {
    const now = Date.now()
    await this.publishMetrics({
      episodeId,
      extractionStartTime: now - latency,
      extractionEndTime: now,
      success,
      errorType,
      errorMessage,
    })
  }

  /**
   * Track detailed success metrics with confidence and guest data
   */
  async trackSuccessfulExtraction(
    episodeId: string,
    latency: number,
    confidence: number,
    extractedGuestCount: number,
    bedrockApiCalls: number,
    tokensUsed: number,
    estimatedCost: number,
  ): Promise<void> {
    const now = Date.now()
    await this.publishMetrics({
      episodeId,
      extractionStartTime: now - latency,
      extractionEndTime: now,
      success: true,
      confidence,
      extractedGuestCount,
      bedrockApiCalls,
      tokensUsed,
      estimatedCost,
    })
  }

  /**
   * Track failed extraction with detailed error information
   */
  async trackFailedExtraction(
    episodeId: string,
    latency: number,
    errorType: string,
    errorMessage: string,
    bedrockApiCalls?: number,
    bedrockApiErrors?: number,
    estimatedCost?: number,
  ): Promise<void> {
    const now = Date.now()
    await this.publishMetrics({
      episodeId,
      extractionStartTime: now - latency,
      extractionEndTime: now,
      success: false,
      errorType,
      errorMessage,
      bedrockApiCalls,
      bedrockApiErrors,
      estimatedCost,
    })
  }
}

// Export singleton instance
export const guestExtractionMetrics = new GuestExtractionMetricsService()

// Export error types for consistent error categorization
export const GuestExtractionErrorTypes = {
  TIMEOUT: 'Timeout',
  PARSE_ERROR: 'Parse',
  API_ERROR: 'Api',
  BEDROCK_ERROR: 'Bedrock',
  VALIDATION_ERROR: 'Validation',
  UNKNOWN: 'Unknown',
} as const

export type GuestExtractionErrorType = (typeof GuestExtractionErrorTypes)[keyof typeof GuestExtractionErrorTypes]
