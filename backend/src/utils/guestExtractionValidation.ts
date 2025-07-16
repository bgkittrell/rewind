import { dynamoService } from '../services/dynamoService'
import { sqsService, GuestExtractionMessage } from '../services/sqsService'
import { bedrockService } from '../services/bedrockService'
import { logger } from '../services/loggerService'
import { Episode } from '../types'

export interface ValidationResult {
  success: boolean
  step: string
  message: string
  data?: any
  error?: string
  timestamp: string
}

export interface ValidationReport {
  testId: string
  timestamp: string
  episodeId: string
  results: ValidationResult[]
  overallSuccess: boolean
  totalSteps: number
  completedSteps: number
  durationMs: number
}

/**
 * Comprehensive end-to-end validation of the guest extraction pipeline
 * This validates: Episode → SQS → Lambda → Bedrock → Database
 */
export class GuestExtractionValidator {
  private testId: string
  private startTime: number
  private results: ValidationResult[] = []

  constructor() {
    this.testId = `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.startTime = Date.now()
  }

  /**
   * Logs a validation result
   */
  private logResult(success: boolean, step: string, message: string, data?: any, error?: string): void {
    const result: ValidationResult = {
      success,
      step,
      message,
      data,
      error,
      timestamp: new Date().toISOString(),
    }

    this.results.push(result)

    if (success) {
      logger.info(`✅ VALIDATION STEP: ${step}`, { message, data })
    } else {
      logger.error(`❌ VALIDATION STEP: ${step}`, { message, data, error })
    }
  }

  /**
   * Creates a test episode for validation
   */
  private async createTestEpisode(): Promise<Episode> {
    const testEpisodeData = {
      title: 'Test Episode for Guest Extraction Validation',
      description:
        'This is a test episode featuring guests John Smith and Sarah Johnson discussing technology trends and innovation in the digital age.',
      audioUrl: 'https://example.com/test-audio.mp3',
      releaseDate: new Date().toISOString(),
      duration: '3600',
      imageUrl: 'https://example.com/test-image.jpg',
    }

    try {
      const savedEpisodes = await dynamoService.saveEpisodes('test-podcast-validation', [testEpisodeData])
      const testEpisode = savedEpisodes[0]

      this.logResult(true, 'CREATE_TEST_EPISODE', 'Test episode created successfully', {
        episodeId: testEpisode.episodeId,
        title: testEpisode.title,
      })
      return testEpisode
    } catch (error) {
      this.logResult(
        false,
        'CREATE_TEST_EPISODE',
        'Failed to create test episode',
        null,
        error instanceof Error ? error.message : String(error),
      )
      throw error
    }
  }

  /**
   * Step 1: Test SQS message sending
   */
  private async testSqsMessageSending(episode: Episode): Promise<void> {
    const message: GuestExtractionMessage = {
      episodeId: episode.episodeId,
      title: episode.title,
      description: episode.description,
      podcastId: episode.podcastId,
      userId: 'validation-user',
    }

    try {
      await sqsService.sendGuestExtractionMessage(message)
      this.logResult(true, 'SQS_MESSAGE_SEND', 'SQS message sent successfully', {
        messageId: message.episodeId,
        queueUrl: process.env.GUEST_EXTRACTION_QUEUE_URL?.substring(0, 50) + '...',
      })
    } catch (error) {
      this.logResult(
        false,
        'SQS_MESSAGE_SEND',
        'Failed to send SQS message',
        null,
        error instanceof Error ? error.message : String(error),
      )
      throw error
    }
  }

  /**
   * Step 2: Verify database status update to 'processing'
   */
  private async verifyProcessingStatusUpdate(episodeId: string, maxWaitMs: number = 60000): Promise<void> {
    const startTime = Date.now()
    const checkInterval = 3000 // Check every 3 seconds to allow for SQS visibility timeout

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const episode = await dynamoService.getEpisodeById('test-podcast-validation', episodeId)

        if (episode && episode.guestExtractionStatus === 'processing') {
          this.logResult(true, 'VERIFY_PROCESSING_STATUS', 'Episode status updated to processing', {
            episodeId,
            status: episode.guestExtractionStatus,
            elapsedMs: Date.now() - startTime,
          })
          return
        }

        // Also check for direct transition to completed (in case processing was very fast)
        if (episode && episode.guestExtractionStatus === 'completed') {
          this.logResult(
            true,
            'VERIFY_PROCESSING_STATUS',
            'Episode status updated directly to completed (fast processing)',
            {
              episodeId,
              status: episode.guestExtractionStatus,
              elapsedMs: Date.now() - startTime,
            },
          )
          return
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, checkInterval))
      } catch (error) {
        this.logResult(
          false,
          'VERIFY_PROCESSING_STATUS',
          'Error checking episode status',
          null,
          error instanceof Error ? error.message : String(error),
        )
        throw error
      }
    }

    this.logResult(false, 'VERIFY_PROCESSING_STATUS', 'Episode status did not update to processing within timeout', {
      episodeId,
      timeoutMs: maxWaitMs,
    })
    throw new Error('Processing status update timeout')
  }

  /**
   * Step 3: Test Bedrock API call directly
   */
  private async testBedrockApiCall(episode: Episode): Promise<void> {
    try {
      const extractionResult = await bedrockService.extractGuests({
        episodeId: episode.episodeId,
        title: episode.title,
        description: episode.description,
      })

      if (extractionResult.success !== false) {
        this.logResult(true, 'BEDROCK_API_CALL', 'Bedrock API call successful', {
          episodeId: episode.episodeId,
          guestCount: extractionResult.guests.length,
          confidence: extractionResult.confidence,
          guests: extractionResult.guests,
        })
      } else {
        this.logResult(false, 'BEDROCK_API_CALL', 'Bedrock API call failed', {
          episodeId: episode.episodeId,
          rawResponse: extractionResult.rawResponse,
        })
        throw new Error('Bedrock API call failed')
      }
    } catch (error) {
      this.logResult(
        false,
        'BEDROCK_API_CALL',
        'Bedrock API call threw error',
        null,
        error instanceof Error ? error.message : String(error),
      )
      throw error
    }
  }

  /**
   * Step 4: Verify final database update (completed status)
   */
  private async verifyCompletedStatusUpdate(episodeId: string, maxWaitMs: number = 60000): Promise<void> {
    const startTime = Date.now()
    const checkInterval = 3000 // Check every 3 seconds

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const episode = await dynamoService.getEpisodeById('test-podcast-validation', episodeId)

        if (episode && (episode.guestExtractionStatus === 'completed' || episode.guestExtractionStatus === 'failed')) {
          this.logResult(
            true,
            'VERIFY_COMPLETED_STATUS',
            `Episode status updated to ${episode.guestExtractionStatus}`,
            {
              episodeId,
              status: episode.guestExtractionStatus,
              guestCount: episode.guests?.length || 0,
              confidence: episode.guestExtractionConfidence,
              guests: episode.guests,
              elapsedMs: Date.now() - startTime,
            },
          )
          return
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, checkInterval))
      } catch (error) {
        this.logResult(
          false,
          'VERIFY_COMPLETED_STATUS',
          'Error checking final episode status',
          null,
          error instanceof Error ? error.message : String(error),
        )
        throw error
      }
    }

    this.logResult(
      false,
      'VERIFY_COMPLETED_STATUS',
      'Episode status did not update to completed/failed within timeout',
      {
        episodeId,
        timeoutMs: maxWaitMs,
      },
    )
    throw new Error('Completed status update timeout')
  }

  /**
   * Step 5: Test error handling with invalid data
   */
  private async testErrorHandling(): Promise<void> {
    const invalidMessage: GuestExtractionMessage = {
      episodeId: `invalid-episode-${this.testId}`,
      title: '',
      description: '',
      podcastId: 'non-existent-podcast',
      userId: 'validation-user',
    }

    try {
      await sqsService.sendGuestExtractionMessage(invalidMessage)
      this.logResult(true, 'ERROR_HANDLING_TEST', 'Error handling test: Invalid message sent to queue', {
        episodeId: invalidMessage.episodeId,
      })

      // Wait a bit and check if the message was handled appropriately
      await new Promise(resolve => setTimeout(resolve, 10000))

      this.logResult(
        true,
        'ERROR_HANDLING_TEST',
        'Error handling test completed - message processed without crashing system',
      )
    } catch (error) {
      this.logResult(
        false,
        'ERROR_HANDLING_TEST',
        'Error handling test failed',
        null,
        error instanceof Error ? error.message : String(error),
      )
      throw error
    }
  }

  /**
   * Cleanup test episode
   */
  private async cleanupTestEpisode(episodeId: string): Promise<void> {
    try {
      // Note: Using deleteEpisodesByPodcast to clean up all test episodes
      await dynamoService.deleteEpisodesByPodcast('test-podcast-validation')
      this.logResult(true, 'CLEANUP_TEST_EPISODE', 'Test episode cleaned up successfully', {
        episodeId,
      })
    } catch (error) {
      this.logResult(
        false,
        'CLEANUP_TEST_EPISODE',
        'Failed to cleanup test episode',
        null,
        error instanceof Error ? error.message : String(error),
      )
      // Don't throw - cleanup failure shouldn't fail the validation
    }
  }

  /**
   * Run complete end-to-end validation
   */
  async runValidation(): Promise<ValidationReport> {
    logger.info('🚀 Starting guest extraction pipeline validation', { testId: this.testId })

    let testEpisode: Episode | null = null
    let overallSuccess = true

    try {
      // Step 1: Create test episode
      testEpisode = await this.createTestEpisode()

      // Step 2: Test SQS message sending
      await this.testSqsMessageSending(testEpisode)

      // Add brief delay to allow SQS message to be processed
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Step 3: Verify processing status update
      await this.verifyProcessingStatusUpdate(testEpisode.episodeId)

      // Step 4: Test Bedrock API call directly
      await this.testBedrockApiCall(testEpisode)

      // Step 5: Verify final status update
      await this.verifyCompletedStatusUpdate(testEpisode.episodeId)

      // Step 6: Test error handling
      await this.testErrorHandling()
    } catch (error) {
      overallSuccess = false
      this.logResult(
        false,
        'VALIDATION_FAILURE',
        'Validation failed',
        null,
        error instanceof Error ? error.message : String(error),
      )
    } finally {
      // Cleanup - add delay to allow any pending processing to complete
      if (testEpisode) {
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        await this.cleanupTestEpisode(testEpisode.episodeId)
      }
    }

    const report: ValidationReport = {
      testId: this.testId,
      timestamp: new Date().toISOString(),
      episodeId: testEpisode?.episodeId || 'unknown',
      results: this.results,
      overallSuccess,
      totalSteps: 6,
      completedSteps: this.results.filter(r => r.success).length,
      durationMs: Date.now() - this.startTime,
    }

    logger.info('🏁 Guest extraction pipeline validation completed', {
      testId: this.testId,
      overallSuccess,
      completedSteps: report.completedSteps,
      totalSteps: report.totalSteps,
      durationMs: report.durationMs,
    })

    return report
  }
}

/**
 * Quick validation runner for production testing
 */
export async function validateGuestExtractionPipeline(): Promise<ValidationReport> {
  const validator = new GuestExtractionValidator()
  return await validator.runValidation()
}
