import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { createSuccessResponse, createErrorResponse, createCorsHeaders } from '../utils/response'
import { Podcast } from '../types'

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

    // Extract user ID from JWT claims (API Gateway populates this)
    const userId = event.requestContext.authorizer?.claims?.sub
    if (!userId) {
      return {
        ...createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401, event.path),
        headers,
      }
    }

    const method = event.httpMethod
    const path = event.path

    switch (method) {
    case 'GET':
      return await getPodcasts(userId, headers, path)
    case 'POST':
      return await addPodcast(event, userId, headers, path)
    case 'DELETE':
      return await deletePodcast(event, userId, headers, path)
    default:
      return {
        ...createErrorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405, path),
        headers,
      }
    }
  } catch (error) {
    console.error('Handler error:', error)
    return {
      ...createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500, event.path),
      headers,
    }
  }
}

async function getPodcasts(
  userId: string,
  headers: Record<string, string>,
  path: string,
): Promise<APIGatewayProxyResult> {
  // TODO: Implement DynamoDB query to get user's podcasts
  // For now, return mock data
  const mockPodcasts: Podcast[] = [
    {
      podcastId: 'podcast-1',
      userId,
      title: 'Comedy Podcast',
      description: 'A hilarious comedy podcast',
      rssUrl: 'https://example.com/comedy-podcast/rss',
      imageUrl: 'https://example.com/comedy-podcast/image.jpg',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      episodeCount: 42,
    },
  ]

  return {
    ...createSuccessResponse(mockPodcasts, 200, path),
    headers,
  }
}

async function addPodcast(
  event: APIGatewayProxyEvent,
  userId: string,
  headers: Record<string, string>,
  path: string,
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}')
    const { rssUrl } = body

    if (!rssUrl) {
      return {
        ...createErrorResponse('RSS URL is required', 'VALIDATION_ERROR', 400, path),
        headers,
      }
    }

    // TODO: Implement RSS feed validation and podcast creation
    // For now, return mock response
    const podcastId = `podcast-${Date.now()}`

    return {
      ...createSuccessResponse({ podcastId, message: 'Podcast added successfully' }, 201, path),
      headers,
    }
  } catch (error) {
    return {
      ...createErrorResponse('Invalid JSON', 'VALIDATION_ERROR', 400, path),
      headers,
    }
  }
}

async function deletePodcast(
  event: APIGatewayProxyEvent,
  userId: string,
  headers: Record<string, string>,
  path: string,
): Promise<APIGatewayProxyResult> {
  const podcastId = event.pathParameters?.podcastId

  if (!podcastId) {
    return {
      ...createErrorResponse('Podcast ID is required', 'VALIDATION_ERROR', 400, path),
      headers,
    }
  }

  // TODO: Implement DynamoDB delete operation
  // For now, return mock response

  return {
    ...createSuccessResponse({ message: 'Podcast deleted successfully' }, 200, path),
    headers,
  }
}
