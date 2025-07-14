import { dynamoService } from '../services/dynamoService'
import { logger } from '../services/loggerService'

/**
 * Utility script to fix existing episodes with complex imageUrl objects
 * This script should be run once to clean up existing data
 */
export async function fixAllEpisodeImageUrls(): Promise<void> {
  logger.info('Starting to fix episode image URLs...')

  try {
    // This would require getting all users and their podcasts
    // For now, we'll need to implement this per-podcast using the API endpoint
    logger.info('Use the API endpoint /episodes/{podcastId}/fix-images to fix individual podcasts')
    logger.info('Example: POST /episodes/your-podcast-id/fix-images')
  } catch (error) {
    logger.error('Error fixing episode image URLs:', error)
    throw error
  }
}

/**
 * Fix episode image URLs for a specific podcast
 */
export async function fixEpisodeImageUrlsForPodcast(podcastId: string): Promise<void> {
  logger.info(`Fixing episode image URLs for podcast ${podcastId}...`)

  try {
    await dynamoService.fixEpisodeImageUrls(podcastId)
    logger.info(`Successfully fixed episode image URLs for podcast ${podcastId}`)
  } catch (error) {
    logger.error(`Error fixing episode image URLs for podcast ${podcastId}:`, error)
    throw error
  }
}
