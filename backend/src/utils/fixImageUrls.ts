import { dynamoService } from '../services/dynamoService'

/**
 * Utility script to fix existing episodes with complex imageUrl objects
 * This script should be run once to clean up existing data
 */
export async function fixAllEpisodeImageUrls(): Promise<void> {
  console.log('Starting to fix episode image URLs...')
  
  try {
    // This would require getting all users and their podcasts
    // For now, we'll need to implement this per-podcast using the API endpoint
    console.log('Use the API endpoint /episodes/{podcastId}/fix-images to fix individual podcasts')
    console.log('Example: POST /episodes/your-podcast-id/fix-images')
  } catch (error) {
    console.error('Error fixing episode image URLs:', error)
    throw error
  }
}

/**
 * Fix episode image URLs for a specific podcast
 */
export async function fixEpisodeImageUrlsForPodcast(podcastId: string): Promise<void> {
  console.log(`Fixing episode image URLs for podcast ${podcastId}...`)
  
  try {
    await dynamoService.fixEpisodeImageUrls(podcastId)
    console.log(`Successfully fixed episode image URLs for podcast ${podcastId}`)
  } catch (error) {
    console.error(`Error fixing episode image URLs for podcast ${podcastId}:`, error)
    throw error
  }
}