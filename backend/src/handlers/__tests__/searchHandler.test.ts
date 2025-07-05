import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { handler } from '../searchHandler'
import { searchService } from '../../services/searchService'

// Mock the search service
vi.mock('../../services/searchService', () => ({
  searchService: {
    searchEpisodes: vi.fn(),
  },
}))

const mockSearchService = searchService as any

describe('searchHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockEvent = (
    queryStringParameters: { [key: string]: string } | null = null,
    httpMethod: string = 'GET',
    userId: string = 'test-user-id',
  ): APIGatewayProxyEvent =>
    ({
      httpMethod,
      path: '/search',
      queryStringParameters,
      requestContext: {
        authorizer: {
          claims: {
            sub: userId,
          },
        },
      } as any,
    }) as APIGatewayProxyEvent

  describe('GET /search', () => {
    it('should handle OPTIONS request (CORS preflight)', async () => {
      const event = createMockEvent(null, 'OPTIONS')
      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(200)
      expect(result.headers).toMatchObject({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
      })
    })

    it('should return 401 when user is not authenticated', async () => {
      const event = createMockEvent({ q: 'test' }, 'GET', '')
      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(401)
      expect(JSON.parse(result.body)).toMatchObject({
        error: {
          message: 'Unauthorized',
          code: 'UNAUTHORIZED',
        },
      })
    })

    it('should return 405 for non-GET requests', async () => {
      const event = createMockEvent({ q: 'test' }, 'POST')
      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(405)
      expect(JSON.parse(result.body)).toMatchObject({
        error: {
          message: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED',
        },
      })
    })

    it('should return 400 when query parameter is missing', async () => {
      const event = createMockEvent({})
      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toMatchObject({
        error: {
          message: 'Query parameter "q" is required',
          code: 'VALIDATION_ERROR',
        },
      })
    })

    it('should return 400 when query is too short', async () => {
      const event = createMockEvent({ q: 'a' })
      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toMatchObject({
        error: {
          message: 'Query must be at least 2 characters long',
          code: 'VALIDATION_ERROR',
        },
      })
    })

    it('should return 400 when query is too long', async () => {
      const event = createMockEvent({ q: 'a'.repeat(201) })
      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toMatchObject({
        error: {
          message: 'Query must be less than 200 characters',
          code: 'VALIDATION_ERROR',
        },
      })
    })

    it('should return 400 for invalid limit parameter', async () => {
      const event = createMockEvent({ q: 'test', limit: '51' })
      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toMatchObject({
        error: {
          message: 'Limit must be between 1 and 50',
          code: 'VALIDATION_ERROR',
        },
      })
    })

    it('should return 400 for invalid type parameter', async () => {
      const event = createMockEvent({ q: 'test', type: 'invalid' })
      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toMatchObject({
        error: {
          message: 'Type must be one of: episodes, podcasts, all',
          code: 'VALIDATION_ERROR',
        },
      })
    })

    it('should successfully search episodes', async () => {
      const mockResults = {
        results: [
          {
            episodeId: 'ep1',
            title: 'Test Episode',
            description: 'Test Description',
            podcastName: 'Test Podcast',
            podcastId: 'pod1',
            releaseDate: '2023-01-01T00:00:00Z',
            duration: '30:00',
            audioUrl: 'https://example.com/audio.mp3',
            relevanceScore: 0.95,
            matchType: 'title' as const,
          },
        ],
        pagination: {
          total: 1,
          limit: 20,
          offset: 0,
          hasMore: false,
        },
      }

      mockSearchService.searchEpisodes.mockResolvedValue(mockResults)

      const event = createMockEvent({ q: 'test' })
      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(200)
      expect(mockSearchService.searchEpisodes).toHaveBeenCalledWith('test-user-id', 'test', 20, 0, 'episodes')

      const responseBody = JSON.parse(result.body)
      expect(responseBody.data).toMatchObject({
        query: 'test',
        type: 'episodes',
        results: mockResults.results,
        pagination: mockResults.pagination,
      })
      expect(responseBody.data.timestamp).toBeDefined()
    })

    it('should handle search with custom parameters', async () => {
      const mockResults = {
        results: [],
        pagination: {
          total: 0,
          limit: 10,
          offset: 5,
          hasMore: false,
        },
      }

      mockSearchService.searchEpisodes.mockResolvedValue(mockResults)

      const event = createMockEvent({
        q: 'custom search',
        limit: '10',
        offset: '5',
        type: 'all',
      })
      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(200)
      expect(mockSearchService.searchEpisodes).toHaveBeenCalledWith('test-user-id', 'custom search', 10, 5, 'all')
    })

    it('should handle search service errors', async () => {
      mockSearchService.searchEpisodes.mockRejectedValue(new Error('Search failed'))

      const event = createMockEvent({ q: 'test' })
      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(503)
      expect(JSON.parse(result.body)).toMatchObject({
        error: {
          message: 'Search service temporarily unavailable',
          code: 'SERVICE_ERROR',
        },
      })
    })

    it('should handle unexpected errors', async () => {
      mockSearchService.searchEpisodes.mockRejectedValue(new Error('Unexpected error'))

      const event = createMockEvent({ q: 'test' })
      const result: APIGatewayProxyResult = await handler(event)

      expect(result.statusCode).toBe(500)
      expect(JSON.parse(result.body)).toMatchObject({
        error: {
          message: 'Failed to perform search',
          code: 'INTERNAL_ERROR',
        },
      })
    })
  })
})
