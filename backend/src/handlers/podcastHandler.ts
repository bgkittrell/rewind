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

    // Handle test endpoint without authorization
    if (path === '/test' && method === 'GET') {
      return createSuccessResponse(
        {
          message: 'Test endpoint working',
          path: path,
          method: method,
          authorizer: event.requestContext.authorizer || 'none',
        },
        200,
        path,
      )
    }

    // Extract user ID from JWT claims (API Gateway populates this)
    const userId = event.requestContext.authorizer?.claims?.sub
    if (!userId) {
      return createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401, event.path)
    }

    switch (method) {
      case 'GET':
        return await getPodcasts(userId, path)
      case 'POST':
        return await addPodcast(event, userId, path)
      case 'DELETE':
        return await deletePodcast(event, userId, path)
      default:
        return createErrorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405, path)
    }
  } catch (error) {
    console.error('Handler error:', error)
    return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500, event.path)
  }
}

async function getPodcasts(userId: string, path: string): Promise<APIGatewayProxyResult> {
  try {
    const podcasts = await dynamoService.getPodcastsByUser(userId)

    const response = {
      podcasts,
      total: podcasts.length,
      hasMore: false,
    }

    return createSuccessResponse(response, 200, path)
  } catch (error) {
    console.error('Error getting podcasts:', error)
    return createErrorResponse('Failed to get podcasts', 'DATABASE_ERROR', 500, path)
  }
}

async function addPodcast(event: APIGatewayProxyEvent, userId: string, path: string): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}')
    const { rssUrl } = body

    if (!rssUrl) {
      return createErrorResponse('RSS URL is required', 'VALIDATION_ERROR', 400, path)
    }

    // Check if podcast already exists
    const exists = await dynamoService.podcastExists(userId, rssUrl)
    if (exists) {
      return createErrorResponse('Podcast already exists', 'DUPLICATE_PODCAST', 409, path)
    }

    // Parse RSS feed
    const feedData = await rssService.validateAndParseFeed(rssUrl)

    // Create podcast record
    const podcastData = {
      title: feedData.title,
      description: feedData.description,
      rssUrl,
      imageUrl: feedData.image || '',
      createdAt: new Date().toISOString(),
      lastUpdated: feedData.lastUpdated,
      episodeCount: feedData.episodeCount,
    }

    const podcast = await dynamoService.savePodcast(userId, podcastData)

    const response = {
      podcastId: podcast.podcastId,
      title: podcast.title,
      rssUrl: podcast.rssUrl,
      message: 'Podcast added successfully',
    }

    return createSuccessResponse(response, 201, path)
  } catch (error: any) {
    console.error('Error adding podcast:', error)

    if (error.message.includes('Failed to parse RSS feed')) {
      return createErrorResponse(error.message, 'INVALID_RSS_FEED', 400, path)
    }

    return createErrorResponse('Failed to add podcast', 'INTERNAL_ERROR', 500, path)
  }
}

async function deletePodcast(
  event: APIGatewayProxyEvent,
  userId: string,
  path: string,
): Promise<APIGatewayProxyResult> {
  const podcastId = event.pathParameters?.podcastId

  if (!podcastId) {
    return createErrorResponse('Podcast ID is required', 'VALIDATION_ERROR', 400, path)
  }

  try {
    await dynamoService.deletePodcast(userId, podcastId)

    return createSuccessResponse({ message: 'Podcast deleted successfully' }, 200, path)
  } catch (error: any) {
    console.error('Error deleting podcast:', error)

    if (error.message === 'Podcast not found') {
      return createErrorResponse('Podcast not found', 'NOT_FOUND', 404, path)
    }

    return createErrorResponse('Failed to delete podcast', 'INTERNAL_ERROR', 500, path)
  }
}
