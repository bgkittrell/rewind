import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { EpisodeService } from '../services/episodeService.js'
import { PodcastService } from '../services/podcastService.js'
import { UserService } from '../services/userService.js'
import { extractUserFromEvent } from '../utils/auth.js'
import { validateRequestBody, validateQueryParams, playbackPositionSchema, episodeFeedbackSchema } from '../utils/validation.js'
import {
  createSuccessResponse,
  createErrorResponse,
  createUnauthorizedResponse,
  createNotFoundResponse,
  createValidationErrorResponse,
  createOptionsResponse,
  createPaginatedResponse,
} from '../utils/response.js'

const episodeService = new EpisodeService()
const podcastService = new PodcastService()
const userService = new UserService()

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Episode handler called:', {
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
    const path = event.path

    // Route to appropriate handler based on path pattern
    if (path.includes('/episodes/') && path.includes('/playback')) {
      // /episodes/{episodeId}/playback
      const episodeId = pathParameters.episodeId
      if (!episodeId) {
        return createErrorResponse('Episode ID required', 400, 'BAD_REQUEST')
      }

      if (httpMethod === 'GET') {
        return await getPlaybackPosition(user.userId, episodeId)
      } else if (httpMethod === 'PUT') {
        return await savePlaybackPosition(user.userId, episodeId, event.body)
      }
    } else if (path.includes('/episodes/') && path.includes('/feedback')) {
      // /episodes/{episodeId}/feedback
      const episodeId = pathParameters.episodeId
      if (!episodeId) {
        return createErrorResponse('Episode ID required', 400, 'BAD_REQUEST')
      }

      if (httpMethod === 'POST') {
        return await submitFeedback(user.userId, episodeId, event.body)
      }
    } else if (path.includes('/podcasts/') && path.includes('/episodes')) {
      // /podcasts/{podcastId}/episodes
      const podcastId = pathParameters.podcastId
      if (!podcastId) {
        return createErrorResponse('Podcast ID required', 400, 'BAD_REQUEST')
      }

      if (httpMethod === 'GET') {
        return await getPodcastEpisodes(user.userId, podcastId, event.queryStringParameters || {})
      }
    }

    return createErrorResponse(`Route not found: ${path}`, 404, 'NOT_FOUND')
  } catch (error) {
    console.error('Error in episode handler:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      'INTERNAL_SERVER_ERROR',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}

async function getPodcastEpisodes(
  userId: string,
  podcastId: string,
  queryStringParameters: Record<string, string | undefined>
): Promise<APIGatewayProxyResult> {
  try {
    // Verify user owns this podcast
    const podcast = await podcastService.getPodcast(userId, podcastId)
    if (!podcast) {
      return createNotFoundResponse('Podcast not found')
    }

    const { limit, offset, sort } = validateQueryParams(queryStringParameters)

    const result = await episodeService.getEpisodes(podcastId, limit, offset, sort)

    return createSuccessResponse(
      createPaginatedResponse(
        result.episodes,
        result.total,
        result.hasMore,
        result.hasMore ? result.episodes[result.episodes.length - 1]?.episodeId : undefined
      )
    )
  } catch (error) {
    console.error('Error getting podcast episodes:', error)
    return createErrorResponse('Failed to retrieve episodes', 500)
  }
}

async function savePlaybackPosition(
  userId: string,
  episodeId: string,
  body: string | null
): Promise<APIGatewayProxyResult> {
  try {
    if (!body) {
      return createValidationErrorResponse(['Request body is required'])
    }

    const validation = validateRequestBody(body, playbackPositionSchema)
    if (!validation.success) {
      return createValidationErrorResponse(validation.errors)
    }

    const { position, duration, isCompleted } = validation.data

    // TODO: Verify episode exists and get podcastId
    // For now, using a placeholder podcastId
    const podcastId = 'podcast_placeholder'

    const playback = await episodeService.savePlaybackPosition(
      userId,
      episodeId,
      podcastId,
      position,
      duration,
      isCompleted
    )

    return createSuccessResponse({
      message: 'Playback position saved',
      playback: {
        position: playback.playbackPosition,
        duration: playback.duration,
        isCompleted: playback.isCompleted,
        lastPlayed: playback.lastPlayed,
      },
    })
  } catch (error) {
    console.error('Error saving playback position:', error)
    return createErrorResponse('Failed to save playback position', 500)
  }
}

async function getPlaybackPosition(
  userId: string,
  episodeId: string
): Promise<APIGatewayProxyResult> {
  try {
    const playback = await episodeService.getPlaybackPosition(userId, episodeId)

    if (!playback) {
      return createNotFoundResponse('No playback history found for this episode')
    }

    return createSuccessResponse({
      position: playback.playbackPosition,
      duration: playback.duration,
      isCompleted: playback.isCompleted,
      lastPlayed: playback.lastPlayed,
    })
  } catch (error) {
    console.error('Error getting playback position:', error)
    return createErrorResponse('Failed to retrieve playback position', 500)
  }
}

async function submitFeedback(
  userId: string,
  episodeId: string,
  body: string | null
): Promise<APIGatewayProxyResult> {
  try {
    if (!body) {
      return createValidationErrorResponse(['Request body is required'])
    }

    const validation = validateRequestBody(body, episodeFeedbackSchema)
    if (!validation.success) {
      return createValidationErrorResponse(validation.errors)
    }

    const { type, rating, comment } = validation.data

    // TODO: Implement feedback storage in UserFeedback table
    // For now, returning a placeholder response
    const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    console.log('Feedback submitted:', {
      userId,
      episodeId,
      type,
      rating,
      comment,
      feedbackId,
    })

    return createSuccessResponse(
      {
        message: 'Feedback submitted successfully',
        feedbackId,
      },
      201
    )
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return createErrorResponse('Failed to submit feedback', 500)
  }
}