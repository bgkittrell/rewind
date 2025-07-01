import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { DatabaseService, Tables } from '../services/database.js'
import { PodcastService } from '../services/podcastService.js'
import { UserService } from '../services/userService.js'
import { extractUserFromEvent } from '../utils/auth.js'
import { validateRequestBody, shareLibrarySchema } from '../utils/validation.js'
import {
  createSuccessResponse,
  createErrorResponse,
  createUnauthorizedResponse,
  createNotFoundResponse,
  createValidationErrorResponse,
  createOptionsResponse,
} from '../utils/response.js'

const shareService = new DatabaseService(Tables.SHARES)
const podcastService = new PodcastService()
const userService = new UserService()

interface Share {
  shareId: string
  userId: string
  podcastIds: string[]
  expiresAt: string
  createdAt: string
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Share handler called:', {
    httpMethod: event.httpMethod,
    path: event.path,
    pathParameters: event.pathParameters,
  })

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createOptionsResponse()
    }

    const httpMethod = event.httpMethod
    const pathParameters = event.pathParameters || {}
    const path = event.path

    if (path.includes('/share/') && path.includes('/add')) {
      // /share/{shareId}/add - requires authentication
      const user = extractUserFromEvent(event)
      if (!user) {
        return createUnauthorizedResponse('Authentication required')
      }

      await userService.updateLastActive(user.userId)

      const shareId = pathParameters.shareId
      if (!shareId) {
        return createErrorResponse('Share ID required', 400, 'BAD_REQUEST')
      }

      if (httpMethod === 'POST') {
        return await addPodcastsFromShare(user.userId, shareId)
      }
    } else if (path.includes('/share/') && pathParameters.shareId) {
      // /share/{shareId} - public endpoint, no auth required
      const shareId = pathParameters.shareId

      if (httpMethod === 'GET') {
        return await getSharedLibrary(shareId)
      }
    } else if (path === '/share' || path.endsWith('/share')) {
      // /share - requires authentication
      const user = extractUserFromEvent(event)
      if (!user) {
        return createUnauthorizedResponse('Authentication required')
      }

      await userService.updateLastActive(user.userId)

      if (httpMethod === 'POST') {
        return await generateShareLink(user.userId, event.body)
      }
    }

    return createErrorResponse(`Route not found: ${path}`, 404, 'NOT_FOUND')
  } catch (error) {
    console.error('Error in share handler:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      'INTERNAL_SERVER_ERROR',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}

async function generateShareLink(
  userId: string,
  body: string | null
): Promise<APIGatewayProxyResult> {
  try {
    if (!body) {
      return createValidationErrorResponse(['Request body is required'])
    }

    const validation = validateRequestBody(body, shareLibrarySchema)
    if (!validation.success) {
      return createValidationErrorResponse(validation.errors)
    }

    const { podcastIds } = validation.data

    // Verify user owns all podcasts
    for (const podcastId of podcastIds) {
      const podcast = await podcastService.getPodcast(userId, podcastId)
      if (!podcast) {
        return createErrorResponse(
          `Podcast ${podcastId} not found or not owned by user`,
          400,
          'BAD_REQUEST'
        )
      }
    }

    // Generate share
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
    const shareId = generateShareId()

    const share: Share = {
      shareId,
      userId,
      podcastIds,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    }

    await shareService.put(share)

    return createSuccessResponse(
      {
        shareId,
        url: `https://rewindpodcast.com/share/${shareId}`,
        expiresAt: share.expiresAt,
      },
      201
    )
  } catch (error) {
    console.error('Error generating share link:', error)
    return createErrorResponse('Failed to generate share link', 500)
  }
}

async function getSharedLibrary(shareId: string): Promise<APIGatewayProxyResult> {
  try {
    const share = await shareService.get({ shareId })
    
    if (!share) {
      return createNotFoundResponse('Share not found')
    }

    // Check if share has expired
    const now = new Date()
    const expiresAt = new Date(share.expiresAt)
    if (now > expiresAt) {
      return createNotFoundResponse('Share has expired')
    }

    // Get podcast details for each shared podcast
    const podcasts = []
    for (const podcastId of share.podcastIds) {
      const podcast = await podcastService.getPodcast(share.userId, podcastId)
      if (podcast) {
        podcasts.push({
          podcastId: podcast.podcastId,
          title: podcast.title,
          imageUrl: podcast.imageUrl,
          description: podcast.description,
        })
      }
    }

    return createSuccessResponse({
      podcasts,
      shareId,
      createdAt: share.createdAt,
    })
  } catch (error) {
    console.error('Error getting shared library:', error)
    return createErrorResponse('Failed to retrieve shared library', 500)
  }
}

async function addPodcastsFromShare(
  userId: string,
  shareId: string
): Promise<APIGatewayProxyResult> {
  try {
    const share = await shareService.get({ shareId })
    
    if (!share) {
      return createNotFoundResponse('Share not found')
    }

    // Check if share has expired
    const now = new Date()
    const expiresAt = new Date(share.expiresAt)
    if (now > expiresAt) {
      return createNotFoundResponse('Share has expired')
    }

    const addedPodcastIds: string[] = []
    const skippedPodcastIds: string[] = []

    // Process each podcast in the share
    for (const sharedPodcastId of share.podcastIds) {
      // Get original podcast details
      const originalPodcast = await podcastService.getPodcast(share.userId, sharedPodcastId)
      if (!originalPodcast) {
        skippedPodcastIds.push(sharedPodcastId)
        continue
      }

      // Check if user already has this podcast (by RSS URL)
      const exists = await podcastService.checkPodcastExists(originalPodcast.rssUrl)
      if (exists) {
        skippedPodcastIds.push(sharedPodcastId)
        continue
      }

      // Add podcast to user's library
      try {
        await podcastService.addPodcast(userId, {
          title: originalPodcast.title,
          rssUrl: originalPodcast.rssUrl,
          imageUrl: originalPodcast.imageUrl,
          description: originalPodcast.description,
          episodeCount: originalPodcast.episodeCount,
        })
        addedPodcastIds.push(sharedPodcastId)
      } catch (error) {
        console.error(`Error adding podcast ${sharedPodcastId}:`, error)
        skippedPodcastIds.push(sharedPodcastId)
      }
    }

    return createSuccessResponse({
      message: 'Podcasts added to library',
      addedPodcastIds,
      skippedPodcastIds,
      addedCount: addedPodcastIds.length,
    })
  } catch (error) {
    console.error('Error adding podcasts from share:', error)
    return createErrorResponse('Failed to add podcasts from share', 500)
  }
}

function generateShareId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}