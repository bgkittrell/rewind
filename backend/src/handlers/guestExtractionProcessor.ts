import { SQSEvent, SQSHandler } from 'aws-lambda'
import { dynamoService } from '../services/dynamoService'
import { bedrockService } from '../services/bedrockService'
import { cloudWatchMetricsService } from '../services/cloudWatchMetricsService'
import { logger } from '../services/loggerService'
import { GuestExtractionMessage } from '../services/sqsService'

/**
 * Lambda handler for processing guest extraction messages from SQS queue
 * This function is triggered by SQS events and processes episodes one at a time
 */
export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  logger.info('Processing guest extraction batch', {
    messageCount: event.Records.length,
  })

  // Process each message individually to respect throttling limits
  for (const record of event.Records) {
    const startTime = Date.now()

    try {
      // Parse the message
      const message: GuestExtractionMessage = JSON.parse(record.body)

      logger.info('Processing guest extraction for episode', {
        episodeId: message.episodeId,
        title: message.title,
        podcastId: message.podcastId,
      })

      // Update episode status to processing
      await dynamoService.updateEpisodeGuestExtraction(message.episodeId, [], 0, 'processing')

      // Extract guests using Bedrock
      const extractionResult = await bedrockService.extractGuests({
        episodeId: message.episodeId,
        title: message.title,
        description: message.description,
      })

      if (extractionResult.success !== false) {
        // Update episode with successful extraction
        await dynamoService.updateEpisodeGuestExtraction(
          message.episodeId,
          extractionResult.guests,
          extractionResult.confidence,
          'completed',
        )

        logger.info('Guest extraction completed successfully', {
          episodeId: message.episodeId,
          guestCount: extractionResult.guests.length,
          confidence: extractionResult.confidence,
        })
      } else {
        // Update episode with failed extraction
        await dynamoService.updateEpisodeGuestExtraction(message.episodeId, [], 0, 'failed')

        logger.error('Guest extraction failed', {
          episodeId: message.episodeId,
          rawResponse: extractionResult.rawResponse,
        })
      }

      // Publish metrics
      const processingTime = Date.now() - startTime
      await cloudWatchMetricsService.publishGuestExtractionMetrics({
        episodeId: message.episodeId,
        success: extractionResult.success !== false,
        processingTime,
        guestCount: extractionResult.guests.length,
        confidence: extractionResult.confidence,
        error: extractionResult.success === false ? 'Guest extraction failed' : undefined,
      })
    } catch (error) {
      const processingTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      logger.error('Error processing guest extraction message', {
        error: errorMessage,
        messageId: record.messageId,
        processingTime,
      })

      // Try to parse message for episode ID
      let episodeId = 'unknown'
      try {
        const message: GuestExtractionMessage = JSON.parse(record.body)
        episodeId = message.episodeId

        // Update episode status to failed
        await dynamoService.updateEpisodeGuestExtraction(episodeId, [], 0, 'failed')
      } catch (parseError) {
        logger.error('Failed to parse message for error handling', {
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
          messageBody: record.body,
        })
      }

      // Publish failure metrics
      await cloudWatchMetricsService.publishGuestExtractionMetrics({
        episodeId,
        success: false,
        processingTime,
        guestCount: 0,
        confidence: 0,
        error: errorMessage,
      })

      // Re-throw error to trigger SQS retry/DLQ mechanism
      throw error
    }
  }

  logger.info('Guest extraction batch processing completed', {
    messageCount: event.Records.length,
  })
}
