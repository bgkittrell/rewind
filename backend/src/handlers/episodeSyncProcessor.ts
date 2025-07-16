import { SQSEvent, SQSHandler } from 'aws-lambda'
import { createCorsHeaders } from '../utils/response'
import { rssService } from '../services/rssService'
import { dynamoService } from '../services/dynamoService'
import { sqsService } from '../services/sqsService'
import { logger } from '../services/loggerService'
import { withLogging } from '../utils/middleware'
import { EpisodeSyncMessage, EpisodeSyncResult, Episode } from '../types'

const episodeSyncProcessor = async (event: SQSEvent): Promise<void> => {
  logger.info('Episode sync processor started', { messageCount: event.Records.length })

  for (const record of event.Records) {
    try {
      const message: EpisodeSyncMessage = JSON.parse(record.body)
      logger.info('Processing episode sync message', {
        podcastId: message.podcastId,
        userId: message.userId,
        rssUrl: message.rssUrl,
      })

      const result = await processEpisodeSync(message)

      if (result.success) {
        logger.info('Episode sync completed successfully', {
          podcastId: message.podcastId,
          episodeCount: result.episodeCount,
          stats: result.stats,
        })
      } else {
        logger.error('Episode sync failed', {
          podcastId: message.podcastId,
          error: result.error,
        })
        // Don't throw error to avoid DLQ - log for monitoring
      }
    } catch (error) {
      logger.error('Error processing episode sync message', {
        error: error instanceof Error ? error.message : String(error),
        messageBody: record.body,
      })
      // Let SQS handle retries via visibility timeout and DLQ
      throw error
    }
  }
}

async function processEpisodeSync(message: EpisodeSyncMessage): Promise<EpisodeSyncResult> {
  const { podcastId, userId, rssUrl } = message

  try {
    logger.info('Starting episode sync processing', { podcastId, rssUrl })

    // Update podcast status to processing
    await dynamoService.updatePodcastSyncStatus(userId, podcastId, 'processing')

    // Parse ALL episodes from RSS feed (no limit)
    const episodeData = await rssService.parseAllEpisodesFromFeed(rssUrl)

    if (episodeData.length === 0) {
      logger.warn('No episodes found in RSS feed', { podcastId, rssUrl })
      return {
        podcastId,
        episodeCount: 0,
        message: 'No episodes found in RSS feed',
        stats: {
          newEpisodes: 0,
          updatedEpisodes: 0,
          totalProcessed: 0,
          duplicatesFound: 0,
        },
        success: true,
      }
    }

    logger.info('Parsed episodes from RSS feed', {
      podcastId,
      totalEpisodes: episodeData.length,
    })

    // Process episodes in batches to handle large feeds
    const batchSize = 25 // Process in batches of 50
    const allSavedEpisodes: Episode[] = []
    let totalProcessed = 0

    for (let i = 0; i < episodeData.length; i += batchSize) {
      const batch = episodeData.slice(i, i + batchSize)
      logger.info('Processing episode batch', {
        podcastId,
        batchNumber: Math.floor(i / batchSize) + 1,
        batchSize: batch.length,
        totalBatches: Math.ceil(episodeData.length / batchSize),
      })

      try {
        // Save/update episodes with deduplication
        const savedEpisodes = await dynamoService.saveEpisodes(podcastId, batch)
        allSavedEpisodes.push(...savedEpisodes)
        totalProcessed += batch.length

        // Trigger guest extraction for new episodes (async, non-blocking)
        await triggerGuestExtraction(savedEpisodes, podcastId, userId)

        logger.info('Completed episode batch', {
          podcastId,
          savedCount: savedEpisodes.length,
          batchNumber: Math.floor(i / batchSize) + 1,
        })
      } catch (batchError) {
        logger.error('Error processing episode batch', {
          podcastId,
          batchNumber: Math.floor(i / batchSize) + 1,
          error: batchError instanceof Error ? batchError.message : String(batchError),
        })
        // Continue with next batch instead of failing entirely
      }
    }

    // Calculate statistics
    const newEpisodes = allSavedEpisodes.length
    const duplicatesFound = Math.max(0, episodeData.length - allSavedEpisodes.length)

    // Get final episode count from database
    const finalEpisodeCount = await dynamoService.getEpisodeCount(podcastId)

    // Update podcast status to completed with final episode count
    await dynamoService.updatePodcastSyncStatus(userId, podcastId, 'completed', {
      episodeCount: finalEpisodeCount,
    })

    const result: EpisodeSyncResult = {
      podcastId,
      episodeCount: allSavedEpisodes.length,
      message: `Episodes synced successfully. Processed ${allSavedEpisodes.length} episodes with guest extraction processing...`,
      stats: {
        newEpisodes,
        updatedEpisodes: 0, // We don't differentiate between new and updated for now
        totalProcessed,
        duplicatesFound,
      },
      success: true,
    }

    logger.info('Episode sync processing completed', {
      podcastId,
      result: result.stats,
    })

    return result
  } catch (error) {
    logger.error('Error in episode sync processing', {
      podcastId,
      error: error instanceof Error ? error.message : String(error),
    })

    // Update podcast status to failed
    try {
      await dynamoService.updatePodcastSyncStatus(userId, podcastId, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } catch (statusError) {
      logger.error('Failed to update podcast sync status to failed', {
        podcastId,
        statusError,
      })
    }

    return {
      podcastId,
      episodeCount: 0,
      message: 'Episode sync failed',
      stats: {
        newEpisodes: 0,
        updatedEpisodes: 0,
        totalProcessed: 0,
        duplicatesFound: 0,
      },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Triggers guest extraction for episodes by sending them to SQS queue
 * This is async and non-blocking to avoid impacting episode import performance
 */
async function triggerGuestExtraction(episodes: Episode[], podcastId: string, userId: string): Promise<void> {
  try {
    // Filter episodes that need guest extraction
    const episodesToProcess = episodes.filter(
      episode => episode.guestExtractionStatus === 'pending' && episode.title && episode.description,
    )

    if (episodesToProcess.length === 0) {
      return
    }

    logger.info(`Queuing ${episodesToProcess.length} episodes for guest extraction`, { podcastId })

    // Convert episodes to SQS messages
    const messages = episodesToProcess.map(episode => ({
      episodeId: episode.episodeId,
      title: episode.title,
      description: episode.description,
      podcastId,
      userId,
    }))

    // Send messages to SQS queue (async, non-blocking)
    await sqsService.sendGuestExtractionMessages(messages)

    logger.info(`Successfully queued ${messages.length} episodes for guest extraction`, { podcastId })
  } catch (error) {
    logger.error('Error queuing guest extraction messages', {
      podcastId,
      error: error instanceof Error ? error.message : String(error),
    })
    // Don't throw error to avoid blocking episode import
  }
}

export const handler: SQSHandler = episodeSyncProcessor
