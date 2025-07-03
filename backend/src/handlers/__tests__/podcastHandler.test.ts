import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIGatewayProxyEvent } from 'aws-lambda'
import { handler } from '../podcastHandler'

// Mock the services
vi.mock('../../services/rssService', () => ({
  rssService: {
    validateAndParseFeed: vi.fn(),
  },
}))

vi.mock('../../services/dynamoService', () => ({
  dynamoService: {
    getPodcastsByUser: vi.fn(),
    savePodcast: vi.fn(),
    deletePodcast: vi.fn(),
    podcastExists: vi.fn(),
  },
}))

vi.mock('../../utils/response', () => ({
  createSuccessResponse: vi.fn((data, statusCode) => ({
    statusCode,
    body: JSON.stringify({ data, timestamp: '2024-01-01T00:00:00.000Z' }),
  })),
  createErrorResponse: vi.fn((message, code, statusCode) => ({
    statusCode,
    body: JSON.stringify({
      error: { message, code },
      timestamp: '2024-01-01T00:00:00.000Z',
    }),
  })),
  createCorsHeaders: vi.fn(() => ({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json',
  })),
}))

const { rssService } = await import('../../services/rssService')
const { dynamoService } = await import('../../services/dynamoService')

// Helper to create mock API Gateway event
const createMockEvent = (
  httpMethod: string,
  path: string,
  body?: any,
  pathParameters?: Record<string, string>,
  userId = 'test-user-123',
): APIGatewayProxyEvent =>
  ({
    httpMethod,
    path,
    body: body ? JSON.stringify(body) : null,
    pathParameters,
    requestContext: {
      authorizer: {
        claims: {
          sub: userId,
        },
      },
    },
    headers: {},
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    isBase64Encoded: false,
    resource: path,
  }) as any

describe('PodcastHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CORS preflight', () => {
    it('should handle OPTIONS request', async () => {
      const event = createMockEvent('OPTIONS', '/podcasts')

      const result = await handler(event)

      expect(result.statusCode).toBe(200)
      expect(result.body).toBe('')
    })
  })

  describe('Authentication', () => {
    it('should return 401 when user ID is missing', async () => {
      const event = createMockEvent('GET', '/podcasts')
      event.requestContext.authorizer = undefined

      const result = await handler(event)

      expect(result.statusCode).toBe(401)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Unauthorized')
      expect(body.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('GET /podcasts', () => {
    it('should return user podcasts successfully', async () => {
      const mockPodcasts = [
        {
          podcastId: 'podcast-1',
          userId: 'test-user-123',
          title: 'Test Podcast',
          description: 'A test podcast',
          rssUrl: 'https://example.com/rss',
          imageUrl: 'https://example.com/image.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:00:00Z',
          episodeCount: 10,
        },
      ]

      vi.mocked(dynamoService.getPodcastsByUser).mockResolvedValue(mockPodcasts)

      const event = createMockEvent('GET', '/podcasts')
      const result = await handler(event)

      expect(result.statusCode).toBe(200)
      expect(dynamoService.getPodcastsByUser).toHaveBeenCalledWith('test-user-123')

      const body = JSON.parse(result.body)
      expect(body.data.podcasts).toEqual(mockPodcasts)
      expect(body.data.total).toBe(1)
      expect(body.data.hasMore).toBe(false)
    })

    it('should handle database error when getting podcasts', async () => {
      vi.mocked(dynamoService.getPodcastsByUser).mockRejectedValue(new Error('Database error'))

      const event = createMockEvent('GET', '/podcasts')
      const result = await handler(event)

      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Failed to get podcasts')
      expect(body.error.code).toBe('DATABASE_ERROR')
    })
  })

  describe('POST /podcasts', () => {
    it('should add podcast successfully', async () => {
      const rssUrl = 'https://example.com/rss'
      const mockFeedData = {
        title: 'New Podcast',
        description: 'A new podcast',
        image: 'https://example.com/image.jpg',
        episodeCount: 5,
        lastUpdated: '2024-01-01T00:00:00Z',
      }
      const mockPodcast = {
        podcastId: 'new-podcast-123',
        userId: 'test-user-123',
        title: mockFeedData.title,
        description: mockFeedData.description,
        rssUrl,
        imageUrl: mockFeedData.image || '',
        createdAt: '2024-01-01T00:00:00Z',
        lastUpdated: mockFeedData.lastUpdated,
        episodeCount: mockFeedData.episodeCount,
      }

      vi.mocked(dynamoService.podcastExists).mockResolvedValue(false)
      vi.mocked(rssService.validateAndParseFeed).mockResolvedValue(mockFeedData)
      vi.mocked(dynamoService.savePodcast).mockResolvedValue(mockPodcast)

      const event = createMockEvent('POST', '/podcasts', { rssUrl })
      const result = await handler(event)

      expect(result.statusCode).toBe(201)
      expect(dynamoService.podcastExists).toHaveBeenCalledWith('test-user-123', rssUrl)
      expect(rssService.validateAndParseFeed).toHaveBeenCalledWith(rssUrl)
      expect(dynamoService.savePodcast).toHaveBeenCalled()

      const body = JSON.parse(result.body)
      expect(body.data.podcastId).toBe('new-podcast-123')
      expect(body.data.title).toBe('New Podcast')
      expect(body.data.message).toBe('Podcast added successfully')
    })

    it('should return 400 when RSS URL is missing', async () => {
      const event = createMockEvent('POST', '/podcasts', {})
      const result = await handler(event)

      expect(result.statusCode).toBe(400)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('RSS URL is required')
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 409 when podcast already exists', async () => {
      const rssUrl = 'https://example.com/rss'
      vi.mocked(dynamoService.podcastExists).mockResolvedValue(true)

      const event = createMockEvent('POST', '/podcasts', { rssUrl })
      const result = await handler(event)

      expect(result.statusCode).toBe(409)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Podcast already exists')
      expect(body.error.code).toBe('DUPLICATE_PODCAST')
    })

    it('should return 400 when RSS feed is invalid', async () => {
      const rssUrl = 'https://example.com/invalid-rss'
      vi.mocked(dynamoService.podcastExists).mockResolvedValue(false)
      vi.mocked(rssService.validateAndParseFeed).mockRejectedValue(
        new Error('Failed to parse RSS feed: Invalid format'),
      )

      const event = createMockEvent('POST', '/podcasts', { rssUrl })
      const result = await handler(event)

      expect(result.statusCode).toBe(400)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Failed to parse RSS feed: Invalid format')
      expect(body.error.code).toBe('INVALID_RSS_FEED')
    })

    it('should handle invalid JSON in request body', async () => {
      const event = createMockEvent('POST', '/podcasts')
      event.body = 'invalid json'

      const result = await handler(event)

      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Failed to add podcast')
      expect(body.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('DELETE /podcasts/:podcastId', () => {
    it('should delete podcast successfully', async () => {
      const podcastId = 'podcast-123'
      vi.mocked(dynamoService.deletePodcast).mockResolvedValue()

      const event = createMockEvent('DELETE', `/podcasts/${podcastId}`, null, { podcastId })
      const result = await handler(event)

      expect(result.statusCode).toBe(200)
      expect(dynamoService.deletePodcast).toHaveBeenCalledWith('test-user-123', podcastId)

      const body = JSON.parse(result.body)
      expect(body.data.message).toBe('Podcast deleted successfully')
    })

    it('should return 400 when podcast ID is missing', async () => {
      const event = createMockEvent('DELETE', '/podcasts/', null, {})
      const result = await handler(event)

      expect(result.statusCode).toBe(400)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Podcast ID is required')
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 404 when podcast is not found', async () => {
      const podcastId = 'nonexistent-podcast'
      vi.mocked(dynamoService.deletePodcast).mockRejectedValue(new Error('Podcast not found'))

      const event = createMockEvent('DELETE', `/podcasts/${podcastId}`, null, { podcastId })
      const result = await handler(event)

      expect(result.statusCode).toBe(404)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Podcast not found')
      expect(body.error.code).toBe('NOT_FOUND')
    })

    it('should handle database error when deleting podcast', async () => {
      const podcastId = 'podcast-123'
      vi.mocked(dynamoService.deletePodcast).mockRejectedValue(new Error('Database error'))

      const event = createMockEvent('DELETE', `/podcasts/${podcastId}`, null, { podcastId })
      const result = await handler(event)

      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Failed to delete podcast')
      expect(body.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('Unsupported methods', () => {
    it('should return 405 for unsupported HTTP methods', async () => {
      const event = createMockEvent('PATCH', '/podcasts')
      const result = await handler(event)

      expect(result.statusCode).toBe(405)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Method not allowed')
      expect(body.error.code).toBe('METHOD_NOT_ALLOWED')
    })
  })

  describe('Error handling', () => {
    it('should handle unexpected errors', async () => {
      // Mock an unexpected error in the handler
      vi.mocked(dynamoService.getPodcastsByUser).mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const event = createMockEvent('GET', '/podcasts')
      const result = await handler(event)

      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Failed to get podcasts')
      expect(body.error.code).toBe('DATABASE_ERROR')
    })
  })
})
