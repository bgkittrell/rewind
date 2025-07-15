import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { createSuccessResponse, createErrorResponse, createCorsHeaders } from '../utils/response'
import { rssService } from '../services/rssService'
import { dynamoService } from '../services/dynamoService'
import { logger } from '../services/loggerService'
import { sqsService } from '../services/sqsService'
import { withLogging } from '../utils/middleware'
import { Episode } from '../types'
import crypto from 'crypto'

const episodeHandler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const headers = createCorsHeaders()

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      }
    }

    const method = event.httpMethod
    const path = event.path

    // Extract user ID from JWT claims (API Gateway populates this)
    const userId = event.requestContext.authorizer?.claims?.sub
    if (!userId) {
      return createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401, event.path)
    }

    // Route handling
    switch (method) {
      case 'GET':
        if (path.includes('/resume')) {
          return await getResumeData(userId, path)
        } else if (path.includes('/listening-history')) {
          return await getListeningHistory(userId, event.queryStringParameters, path)
        } else if (path.includes('/progress')) {
          return await getProgress(userId, event.pathParameters, path)
        } else if (event.pathParameters?.podcastId && event.pathParameters?.episodeId) {
          // Handle direct episode lookup with podcast context (most efficient)
          return await getEpisodeByIdWithPodcast(
            event.pathParameters.podcastId,
            event.pathParameters.episodeId,
            userId,
            path,
          )
        } else if (event.pathParameters?.episodeId && !event.pathParameters?.podcastId) {
          // Handle individual episode requests: /episode/{episodeId} (inefficient fallback)
          return await getEpisodeById(event.pathParameters.episodeId, userId, path)
        } else if (event.pathParameters?.podcastId) {
          return await getEpisodes(event.pathParameters.podcastId, event.queryStringParameters, path)
        }
        break

      case 'POST':
        if (path.includes('/sync')) {
          return await syncEpisodes(event.pathParameters?.podcastId, userId, path)
        } else if (path.includes('/fix-images')) {
          return await fixEpisodeImages(event.pathParameters?.podcastId, userId, path)
        } else if (path.includes('/refresh-url')) {
          return await refreshEpisodeUrl(event.body, userId, path)
        }
        break

      case 'PUT':
        if (path.includes('/progress')) {
          return await saveProgress(userId, event.pathParameters, event.body, path)
        }
        break

      case 'DELETE':
        if (event.pathParameters?.podcastId) {
          return await deleteEpisodes(event.pathParameters.podcastId, userId, path)
        }
        break

      default:
        return createErrorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405, path)
    }

    return createErrorResponse('Not found', 'NOT_FOUND', 404, path)
  } catch (error) {
    logger.error('Episode handler error:', error)
    return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500, event.path)
  }
}

async function getEpisodes(
  podcastId: string | undefined,
  queryParams: { [key: string]: string | undefined } | null,
  path: string,
): Promise<APIGatewayProxyResult> {
  if (!podcastId) {
    return createErrorResponse('Podcast ID is required', 'VALIDATION_ERROR', 400, path)
  }

  try {
    const limit = queryParams?.limit ? parseInt(queryParams.limit, 10) : 20
    const cursor = queryParams?.cursor

    if (limit > 100) {
      return createErrorResponse('Limit cannot exceed 100', 'VALIDATION_ERROR', 400, path)
    }

    const result = await dynamoService.getEpisodesByPodcast(podcastId, limit, cursor)

    const response = {
      episodes: result.episodes,
      pagination: {
        hasMore: !!result.lastEvaluatedKey,
        nextCursor: result.lastEvaluatedKey,
        limit,
      },
    }

    return createSuccessResponse(response, 200, path)
  } catch (error) {
    logger.error('Error getting episodes:', error)
    return createErrorResponse('Failed to get episodes', 'DATABASE_ERROR', 500, path)
  }
}

async function syncEpisodes(
  podcastId: string | undefined,
  userId: string,
  path: string,
): Promise<APIGatewayProxyResult> {
  if (!podcastId) {
    return createErrorResponse('Podcast ID is required', 'VALIDATION_ERROR', 400, path)
  }

  try {
    // First, verify the podcast belongs to the user
    const userPodcasts = await dynamoService.getPodcastsByUser(userId)
    const podcast = userPodcasts.find(p => p.podcastId === podcastId)

    if (!podcast) {
      return createErrorResponse('Podcast not found or access denied', 'NOT_FOUND', 404, path)
    }

    // Get existing episodes count before sync
    const existingEpisodesResponse = await dynamoService.getEpisodesByPodcast(podcastId, 1000)
    const existingEpisodesCount = existingEpisodesResponse.episodes.length

    // Parse episodes from RSS feed
    const episodeData = await rssService.parseEpisodesFromFeed(podcast.rssUrl)

    if (episodeData.length === 0) {
      return createSuccessResponse(
        {
          message: 'No episodes found in RSS feed',
          episodeCount: 0,
          episodes: [],
          stats: {
            newEpisodes: 0,
            updatedEpisodes: 0,
            totalProcessed: 0,
            duplicatesFound: 0,
          },
        },
        200,
        path,
      )
    }

    // Save/update episodes with deduplication
    const savedEpisodes = await dynamoService.saveEpisodes(podcastId, episodeData)

    // Trigger guest extraction for new episodes (async, non-blocking)
    await triggerGuestExtraction(savedEpisodes, podcastId, userId)

    // Calculate statistics
    const newEpisodesResponse = await dynamoService.getEpisodesByPodcast(podcastId, 1000)
    const newEpisodesCount = newEpisodesResponse.episodes.length

    const newEpisodes = Math.max(0, newEpisodesCount - existingEpisodesCount)
    const updatedEpisodes = Math.max(0, savedEpisodes.length - newEpisodes)
    const duplicatesFound = episodeData.length - savedEpisodes.length

    const response = {
      message: 'Episodes synced successfully',
      episodeCount: savedEpisodes.length,
      episodes: savedEpisodes.slice(0, 5), // Return first 5 episodes as preview
      stats: {
        newEpisodes,
        updatedEpisodes,
        totalProcessed: episodeData.length,
        duplicatesFound: Math.max(0, duplicatesFound),
      },
    }

    return createSuccessResponse(response, 201, path)
  } catch (error) {
    logger.error('Error syncing episodes:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (errorMessage.includes('Failed to parse episodes from RSS feed')) {
      return createErrorResponse(errorMessage, 'RSS_PARSE_ERROR', 400, path)
    }

    return createErrorResponse('Failed to sync episodes', 'INTERNAL_ERROR', 500, path)
  }
}

async function saveProgress(
  userId: string,
  pathParams: { [key: string]: string | undefined } | null,
  body: string | null,
  path: string,
): Promise<APIGatewayProxyResult> {
  const episodeId = pathParams?.episodeId

  if (!episodeId) {
    return createErrorResponse('Episode ID is required', 'VALIDATION_ERROR', 400, path)
  }

  if (!body) {
    return createErrorResponse('Request body is required', 'VALIDATION_ERROR', 400, path)
  }

  try {
    const { position, duration, podcastId } = JSON.parse(body)

    if (typeof position !== 'number' || typeof duration !== 'number') {
      return createErrorResponse('Position and duration must be numbers', 'VALIDATION_ERROR', 400, path)
    }

    if (position < 0 || duration <= 0) {
      return createErrorResponse('Invalid position or duration values', 'VALIDATION_ERROR', 400, path)
    }

    if (!podcastId) {
      return createErrorResponse('Podcast ID is required', 'VALIDATION_ERROR', 400, path)
    }

    await dynamoService.savePlaybackProgress(userId, episodeId, podcastId, position, duration)

    const response = {
      message: 'Progress saved successfully',
      position,
      duration,
      progressPercentage: Math.round((position / duration) * 100),
    }

    return createSuccessResponse(response, 200, path)
  } catch (error) {
    logger.error('Error saving progress:', error)

    if (error instanceof SyntaxError) {
      return createErrorResponse('Invalid JSON in request body', 'VALIDATION_ERROR', 400, path)
    }

    return createErrorResponse('Failed to save progress', 'INTERNAL_ERROR', 500, path)
  }
}

async function getProgress(
  userId: string,
  pathParams: { [key: string]: string | undefined } | null,
  path: string,
): Promise<APIGatewayProxyResult> {
  const episodeId = pathParams?.episodeId

  if (!episodeId) {
    return createErrorResponse('Episode ID is required', 'VALIDATION_ERROR', 400, path)
  }

  try {
    const progress = await dynamoService.getPlaybackProgress(userId, episodeId)

    if (!progress) {
      return createSuccessResponse(
        {
          position: 0,
          duration: 0,
          progressPercentage: 0,
        },
        200,
        path,
      )
    }

    const response = {
      position: progress.position,
      duration: progress.duration,
      progressPercentage: Math.round((progress.position / progress.duration) * 100),
    }

    return createSuccessResponse(response, 200, path)
  } catch (error) {
    logger.error('Error getting progress:', error)
    return createErrorResponse('Failed to get progress', 'INTERNAL_ERROR', 500, path)
  }
}

async function getListeningHistory(
  userId: string,
  queryParams: { [key: string]: string | undefined } | null,
  path: string,
): Promise<APIGatewayProxyResult> {
  try {
    const limit = queryParams?.limit ? parseInt(queryParams.limit, 10) : 20

    if (limit > 100) {
      return createErrorResponse('Limit cannot exceed 100', 'VALIDATION_ERROR', 400, path)
    }

    const history = await dynamoService.getListeningHistory(userId, limit)

    const response = {
      history,
      total: history.length,
    }

    return createSuccessResponse(response, 200, path)
  } catch (error) {
    logger.error('Error getting listening history:', error)
    return createErrorResponse('Failed to get listening history', 'INTERNAL_ERROR', 500, path)
  }
}

async function getResumeData(userId: string, path: string): Promise<APIGatewayProxyResult> {
  try {
    const lastPlayedEpisode = await dynamoService.getLastPlayedEpisode(userId)

    if (!lastPlayedEpisode) {
      return createSuccessResponse(null, 200, path)
    }

    return createSuccessResponse(lastPlayedEpisode, 200, path)
  } catch (error) {
    logger.error('Error getting resume data:', error)
    return createErrorResponse('Failed to get resume data', 'INTERNAL_ERROR', 500, path)
  }
}

async function deleteEpisodes(podcastId: string, userId: string, path: string): Promise<APIGatewayProxyResult> {
  try {
    // Verify the podcast belongs to the user
    const userPodcasts = await dynamoService.getPodcastsByUser(userId)
    const podcast = userPodcasts.find(p => p.podcastId === podcastId)

    if (!podcast) {
      return createErrorResponse('Podcast not found or access denied', 'NOT_FOUND', 404, path)
    }

    await dynamoService.deleteEpisodesByPodcast(podcastId)

    return createSuccessResponse(
      {
        message: 'Episodes deleted successfully',
      },
      200,
      path,
    )
  } catch (error) {
    logger.error('Error deleting episodes:', error)
    return createErrorResponse('Failed to delete episodes', 'INTERNAL_ERROR', 500, path)
  }
}

async function fixEpisodeImages(
  podcastId: string | undefined,
  userId: string,
  path: string,
): Promise<APIGatewayProxyResult> {
  if (!podcastId) {
    return createErrorResponse('Podcast ID is required', 'VALIDATION_ERROR', 400, path)
  }

  try {
    // First, verify the podcast belongs to the user
    const userPodcasts = await dynamoService.getPodcastsByUser(userId)
    const podcast = userPodcasts.find(p => p.podcastId === podcastId)

    if (!podcast) {
      return createErrorResponse('Podcast not found or access denied', 'NOT_FOUND', 404, path)
    }

    // Fix episode image URLs
    await dynamoService.fixEpisodeImageUrls(podcastId)

    return createSuccessResponse(
      {
        message: 'Episode image URLs fixed successfully',
      },
      200,
      path,
    )
  } catch (error) {
    logger.error('Error fixing episode image URLs:', error)
    return createErrorResponse('Failed to fix episode image URLs', 'INTERNAL_ERROR', 500, path)
  }
}

async function getEpisodeById(episodeId: string, userId: string, path: string): Promise<APIGatewayProxyResult> {
  logger.debug(`Getting episode by ID: ${episodeId} for user: ${userId}`)

  try {
    // First, get all user podcasts
    const userPodcasts = await dynamoService.getPodcastsByUser(userId)
    logger.debug(`Found ${userPodcasts.length} podcasts for user`)

    if (userPodcasts.length === 0) {
      return createErrorResponse('No podcasts found for user', 'NOT_FOUND', 404, path)
    }

    // Extract podcast IDs for batch lookup
    const podcastIds = userPodcasts.map(podcast => podcast.podcastId)

    // Use batch get to find the episode efficiently (prevents N+1 queries)
    const episode = await dynamoService.batchGetEpisodeById(podcastIds, episodeId)

    if (episode) {
      logger.debug(`Found episode: ${episode.title}`)
      return createSuccessResponse(episode, 200, path)
    }

    logger.error(`Episode ${episodeId} not found in any of the user's podcasts`)
    return createErrorResponse('Episode not found or access denied', 'NOT_FOUND', 404, path)
  } catch (error) {
    logger.error('Error getting episode:', error)
    return createErrorResponse('Failed to get episode', 'INTERNAL_ERROR', 500, path)
  }
}

async function getEpisodeByIdWithPodcast(
  podcastId: string,
  episodeId: string,
  userId: string,
  path: string,
): Promise<APIGatewayProxyResult> {
  logger.debug(`Getting episode by ID: ${episodeId} for user: ${userId} and podcast: ${podcastId}`)

  try {
    // First, verify the episode belongs to the user
    const userPodcasts = await dynamoService.getPodcastsByUser(userId)
    const podcast = userPodcasts.find(p => p.podcastId === podcastId)

    if (!podcast) {
      return createErrorResponse('Podcast not found or access denied', 'NOT_FOUND', 404, path)
    }

    // Try to find the episode in the specified podcast
    const episode = await dynamoService.getEpisodeById(podcastId, episodeId)

    if (episode) {
      logger.info('Found episode in podcast', {
        episodeId,
        title: episode.title,
        podcastId,
        podcastTitle: podcast.title,
      })
      return createSuccessResponse(episode, 200, path)
    }

    logger.warn('Episode not found in podcast', { episodeId, podcastId })
    return createErrorResponse('Episode not found or access denied', 'NOT_FOUND', 404, path)
  } catch (error) {
    logger.error('Error getting episode:', error)
    return createErrorResponse('Failed to get episode', 'INTERNAL_ERROR', 500, path)
  }
}

async function refreshEpisodeUrl(body: string | null, userId: string, path: string): Promise<APIGatewayProxyResult> {
  logger.info('refreshEpisodeUrl called with:', { body, userId, path })

  if (!body) {
    logger.error('No request body provided')
    return createErrorResponse('Request body is required', 'VALIDATION_ERROR', 400, path)
  }

  try {
    const requestData = JSON.parse(body)
    logger.info('Parsed request data:', requestData)

    const { episodeId, podcastId } = requestData

    if (!episodeId || !podcastId) {
      logger.error('Missing required fields:', { episodeId, podcastId })
      return createErrorResponse('Episode ID and Podcast ID are required', 'VALIDATION_ERROR', 400, path)
    }

    logger.info('Refreshing episode URL:', { episodeId, podcastId, userId })

    // First, verify the podcast belongs to the user
    const userPodcasts = await dynamoService.getPodcastsByUser(userId)
    const podcast = userPodcasts.find(p => p.podcastId === podcastId)

    if (!podcast) {
      return createErrorResponse('Podcast not found or access denied', 'NOT_FOUND', 404, path)
    }

    // Get the episode from the database first to find its naturalKey
    const existingEpisode = await dynamoService.getEpisodeById(podcastId, episodeId)

    if (!existingEpisode) {
      return createErrorResponse('Episode not found in database', 'NOT_FOUND', 404, path)
    }

    logger.info('Found episode in database:', {
      title: existingEpisode.title,
      naturalKey: existingEpisode.naturalKey,
      audioUrl: existingEpisode.audioUrl ? existingEpisode.audioUrl.substring(0, 50) + '...' : 'none',
    })

    // Fetch fresh RSS data
    const rssEpisodes = await rssService.parseEpisodesFromFeed(podcast.rssUrl, 200)

    if (!rssEpisodes || rssEpisodes.length === 0) {
      return createErrorResponse('Failed to fetch RSS feed', 'RSS_FETCH_ERROR', 500, path)
    }

    logger.info('Fetched RSS episodes:', {
      count: rssEpisodes.length,
      firstEpisode: rssEpisodes[0]
        ? {
            title: rssEpisodes[0].title,
            releaseDate: rssEpisodes[0].releaseDate,
            audioUrl: rssEpisodes[0].audioUrl ? rssEpisodes[0].audioUrl.substring(0, 50) + '...' : 'none',
          }
        : 'none',
    })

    // Find the episode in the RSS feed by naturalKey
    const rssEpisode = rssEpisodes.find(ep => {
      // Generate naturalKey for RSS episode to match against database episode
      // This mirrors the exact logic in DynamoService.generateNaturalKey()
      const normalizedTitle = (ep.title || 'untitled').toLowerCase().trim()

      // Process releaseDate the same way as in DynamoService with full fallback logic
      let releaseDate: string
      try {
        if (!ep.releaseDate || ep.releaseDate.trim() === '') {
          releaseDate = '1900-01-01'
        } else {
          const dateStr = ep.releaseDate.trim()
          const dateObj = new Date(dateStr)

          // Check for valid date
          if (isNaN(dateObj.getTime())) {
            // Try parsing as timestamp if it's a number
            const timestamp = parseInt(dateStr, 10)
            if (!isNaN(timestamp) && timestamp > 0) {
              const timestampDate = new Date(timestamp * 1000) // Assume seconds, convert to ms
              if (!isNaN(timestampDate.getTime())) {
                releaseDate = timestampDate.toISOString().split('T')[0]
              } else {
                releaseDate = '1900-01-01'
              }
            } else {
              // Try basic date parsing patterns
              const cleanDateStr = dateStr.replace(/[^\d-/]/g, '')
              const fallbackDate = new Date(cleanDateStr)
              if (!isNaN(fallbackDate.getTime())) {
                releaseDate = fallbackDate.toISOString().split('T')[0]
              } else {
                releaseDate = '1900-01-01'
              }
            }
          } else {
            // Valid date object
            releaseDate = dateObj.toISOString().split('T')[0]
          }
        }
      } catch (error) {
        logger.warn('Error parsing release date in refresh endpoint', { releaseDate: ep.releaseDate, error })
        releaseDate = '1900-01-01'
      }

      // Generate the same MD5 hash as DynamoService
      const keyData = `${normalizedTitle}:${releaseDate}`
      const naturalKey = crypto.createHash('md5').update(keyData).digest('hex')
      const matches = naturalKey === existingEpisode.naturalKey

      // Debug logging for the first few episodes
      if (rssEpisodes.indexOf(ep) < 3) {
        logger.info('RSS episode naturalKey comparison:', {
          episodeTitle: ep.title,
          normalizedTitle,
          releaseDate,
          keyData,
          naturalKey,
          targetNaturalKey: existingEpisode.naturalKey,
          matches,
        })
      }

      return matches
    })

    if (!rssEpisode) {
      return createErrorResponse('Episode not found in RSS feed', 'NOT_FOUND', 404, path)
    }

    // Update the episode in the database with fresh URL
    const updatedEpisode = await dynamoService.updateEpisodeAudioUrl(podcastId, episodeId, rssEpisode.audioUrl)

    if (!updatedEpisode) {
      return createErrorResponse('Failed to update episode URL', 'UPDATE_ERROR', 500, path)
    }

    logger.info('Episode URL refreshed successfully:', {
      episodeId,
      oldUrl: 'hidden',
      newUrl: 'hidden',
    })

    return createSuccessResponse(
      {
        episodeId,
        audioUrl: rssEpisode.audioUrl,
        refreshedAt: new Date().toISOString(),
      },
      200,
      path,
    )
  } catch (error) {
    logger.error('Error refreshing episode URL:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      path,
      userId,
    })
    return createErrorResponse('Failed to refresh episode URL', 'INTERNAL_ERROR', 500, path)
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

    logger.info(`Queuing ${episodesToProcess.length} episodes for guest extraction`)

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

    logger.info(`Successfully queued ${messages.length} episodes for guest extraction`)
  } catch (error) {
    logger.error('Error queuing guest extraction messages:', error)
    // Don't throw error to avoid blocking episode import
  }
}

export const handler = withLogging(episodeHandler)
