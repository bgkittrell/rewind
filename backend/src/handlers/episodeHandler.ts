import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { createSuccessResponse, createErrorResponse, createCorsHeaders } from '../utils/response'
import { rssService } from '../services/rssService'
import { dynamoService } from '../services/dynamoService'

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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
        if (path.includes('/listening-history')) {
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
    console.error('Episode handler error:', error)
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
    console.error('Error getting episodes:', error)
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
  } catch (error: any) {
    console.error('Error syncing episodes:', error)

    if (error.message.includes('Failed to parse episodes from RSS feed')) {
      return createErrorResponse(error.message, 'RSS_PARSE_ERROR', 400, path)
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
  } catch (error: any) {
    console.error('Error saving progress:', error)

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
    console.error('Error getting progress:', error)
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
    console.error('Error getting listening history:', error)
    return createErrorResponse('Failed to get listening history', 'INTERNAL_ERROR', 500, path)
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
    console.error('Error deleting episodes:', error)
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
    console.error('Error fixing episode image URLs:', error)
    return createErrorResponse('Failed to fix episode image URLs', 'INTERNAL_ERROR', 500, path)
  }
}

async function getEpisodeById(episodeId: string, userId: string, path: string): Promise<APIGatewayProxyResult> {
  console.log(`Getting episode by ID: ${episodeId} for user: ${userId}`)

  try {
    // First, get all user podcasts to find which podcast this episode belongs to
    const userPodcasts = await dynamoService.getPodcastsByUser(userId)
    console.log(`Found ${userPodcasts.length} podcasts for user`)

    // Try to find the episode in each podcast
    for (const podcast of userPodcasts) {
      console.log(`Checking podcast: ${podcast.podcastId} - ${podcast.title}`)
      try {
        const episode = await dynamoService.getEpisodeById(podcast.podcastId, episodeId)
        if (episode) {
          console.log(`Found episode: ${episode.title} in podcast: ${podcast.title}`)
          return createSuccessResponse(episode, 200, path)
        }
      } catch (error) {
        console.log(`Episode not found in podcast ${podcast.podcastId}:`, error)
        // Continue to next podcast if episode not found in this one
        continue
      }
    }

    console.error(`Episode ${episodeId} not found in any of the user's podcasts`)
    return createErrorResponse('Episode not found or access denied', 'NOT_FOUND', 404, path)
  } catch (error) {
    console.error('Error getting episode:', error)
    return createErrorResponse('Failed to get episode', 'INTERNAL_ERROR', 500, path)
  }
}

async function getEpisodeByIdWithPodcast(
  podcastId: string,
  episodeId: string,
  userId: string,
  path: string,
): Promise<APIGatewayProxyResult> {
  console.log(`Getting episode by ID: ${episodeId} for user: ${userId} and podcast: ${podcastId}`)

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
      console.log(`Found episode: ${episode.title} in podcast: ${podcast.title}`)
      return createSuccessResponse(episode, 200, path)
    }

    console.error(`Episode ${episodeId} not found in podcast ${podcastId}`)
    return createErrorResponse('Episode not found or access denied', 'NOT_FOUND', 404, path)
  } catch (error) {
    console.error('Error getting episode:', error)
    return createErrorResponse('Failed to get episode', 'INTERNAL_ERROR', 500, path)
  }
}
