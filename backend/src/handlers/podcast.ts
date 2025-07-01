import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { PodcastService } from '../services/podcastService.js'
import { UserService } from '../services/userService.js'
import { extractUserFromEvent } from '../utils/auth.js'
import { validateRequestBody, validateQueryParams, addPodcastSchema } from '../utils/validation.js'
import {
  createSuccessResponse,
  createErrorResponse,
  createUnauthorizedResponse,
  createNotFoundResponse,
  createConflictResponse,
  createValidationErrorResponse,
  createOptionsResponse,
  createPaginatedResponse,
} from '../utils/response.js'

const podcastService = new PodcastService()
const userService = new UserService()

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Podcast handler called:', {
    httpMethod: event.httpMethod,
    path: event.path,
    pathParameters: event.pathParameters,
  })

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createOptionsResponse()
    }

    // Extract user from Cognito JWT
    const user = extractUserFromEvent(event)
    if (!user) {
      return createUnauthorizedResponse('Authentication required')
    }

    // Update user's last active timestamp
    await userService.updateLastActive(user.userId)

    const httpMethod = event.httpMethod
    const pathParameters = event.pathParameters || {}

    switch (httpMethod) {
      case 'GET':
        if (pathParameters.podcastId) {
          return await getPodcast(user.userId, pathParameters.podcastId)
        } else {
          return await getUserPodcasts(user.userId, event.queryStringParameters || {})
        }

      case 'POST':
        return await addPodcast(user.userId, event.body)

      case 'DELETE':
        if (pathParameters.podcastId) {
          return await removePodcast(user.userId, pathParameters.podcastId)
        } else {
          return createErrorResponse('Podcast ID required for deletion', 400, 'BAD_REQUEST')
        }

      default:
        return createErrorResponse(`Method ${httpMethod} not allowed`, 405, 'METHOD_NOT_ALLOWED')
    }
  } catch (error) {
    console.error('Error in podcast handler:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      'INTERNAL_SERVER_ERROR',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}

async function getUserPodcasts(
  userId: string,
  queryStringParameters: Record<string, string | undefined>
): Promise<APIGatewayProxyResult> {
  try {
    const { limit, offset } = validateQueryParams(queryStringParameters)

    const result = await podcastService.getUserPodcasts(userId, limit, offset)

    return createSuccessResponse(
      createPaginatedResponse(
        result.podcasts,
        result.total,
        result.hasMore,
        result.hasMore ? result.podcasts[result.podcasts.length - 1]?.podcastId : undefined
      )
    )
  } catch (error) {
    console.error('Error getting user podcasts:', error)
    return createErrorResponse('Failed to retrieve podcasts', 500)
  }
}

async function getPodcast(
  userId: string,
  podcastId: string
): Promise<APIGatewayProxyResult> {
  try {
    const podcast = await podcastService.getPodcast(userId, podcastId)

    if (!podcast) {
      return createNotFoundResponse('Podcast not found')
    }

    return createSuccessResponse(podcast)
  } catch (error) {
    console.error('Error getting podcast:', error)
    return createErrorResponse('Failed to retrieve podcast', 500)
  }
}

async function addPodcast(
  userId: string,
  body: string | null
): Promise<APIGatewayProxyResult> {
  try {
    if (!body) {
      return createValidationErrorResponse(['Request body is required'])
    }

    const validation = validateRequestBody(body, addPodcastSchema)
    if (!validation.success) {
      return createValidationErrorResponse(validation.errors)
    }

    const { rssUrl } = validation.data

    // Check if podcast already exists
    const exists = await podcastService.checkPodcastExists(rssUrl)
    if (exists) {
      return createConflictResponse('Podcast with this RSS URL already exists')
    }

    // TODO: Parse RSS feed to get podcast metadata
    // For now, using placeholder data
    const podcastData = {
      title: 'Sample Podcast',
      rssUrl,
      imageUrl: 'https://via.placeholder.com/300x300',
      description: 'Podcast description will be parsed from RSS feed',
      episodeCount: 0,
    }

    const podcast = await podcastService.addPodcast(userId, podcastData)

    return createSuccessResponse(
      {
        podcastId: podcast.podcastId,
        title: podcast.title,
        rssUrl: podcast.rssUrl,
        message: 'Podcast added successfully',
      },
      201
    )
  } catch (error) {
    console.error('Error adding podcast:', error)
    return createErrorResponse('Failed to add podcast', 500)
  }
}

async function removePodcast(
  userId: string,
  podcastId: string
): Promise<APIGatewayProxyResult> {
  try {
    // Check if podcast exists and belongs to user
    const podcast = await podcastService.getPodcast(userId, podcastId)
    if (!podcast) {
      return createNotFoundResponse('Podcast not found')
    }

    await podcastService.removePodcast(userId, podcastId)

    return createSuccessResponse({
      message: 'Podcast removed successfully',
    })
  } catch (error) {
    console.error('Error removing podcast:', error)
    return createErrorResponse('Failed to remove podcast', 500)
  }
}