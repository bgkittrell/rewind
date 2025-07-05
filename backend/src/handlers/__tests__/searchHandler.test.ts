import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIGatewayProxyEvent } from 'aws-lambda'
import { handler } from '../searchHandler'
import * as searchService from '../../services/searchService'

vi.mock('../../services/searchService')

describe('searchHandler', () => {
  const mockSearchService = searchService.searchService as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    httpMethod: 'GET',
    path: '/search',
    queryStringParameters: { q: 'test' },
    headers: {},
    body: null,
    isBase64Encoded: false,
    pathParameters: null,
    stageVariables: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    requestContext: {
      accountId: '123',
      apiId: 'api123',
      authorizer: {
        claims: {
          sub: 'user123',
        },
      },
      domainName: 'test.com',
      domainPrefix: 'test',
      extendedRequestId: 'req123',
      httpMethod: 'GET',
      identity: {} as any,
      path: '/search',
      protocol: 'HTTP/1.1',
      requestId: 'req123',
      requestTime: '01/Jan/2024:00:00:00 +0000',
      requestTimeEpoch: 1704067200000,
      resourceId: 'res123',
      resourcePath: '/search',
      stage: 'test',
    },
    resource: '/search',
    ...overrides,
  })

  describe('OPTIONS request', () => {
    it('should handle CORS preflight', async () => {
      const event = createMockEvent({ httpMethod: 'OPTIONS' })
      const response = await handler(event)

      expect(response.statusCode).toBe(200)
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin')
      expect(response.body).toBe('')
    })
  })

  describe('GET request', () => {
    it('should return 401 if user is not authenticated', async () => {
      const event = createMockEvent({
        requestContext: {
          ...createMockEvent().requestContext,
          authorizer: undefined,
        } as any,
      })

      const response = await handler(event)
      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error.message).toBe('Unauthorized')
    })

    it('should return 400 if search query is missing', async () => {
      const event = createMockEvent({
        queryStringParameters: {},
      })

      const response = await handler(event)
      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error.message).toBe('Search query is required')
    })

    it('should return 400 if limit is invalid', async () => {
      const event = createMockEvent({
        queryStringParameters: { q: 'test', limit: 'invalid' },
      })

      const response = await handler(event)
      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error.message).toBe('Invalid limit parameter')
    })

    it('should return 400 if offset is invalid', async () => {
      const event = createMockEvent({
        queryStringParameters: { q: 'test', offset: '-1' },
      })

      const response = await handler(event)
      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error.message).toBe('Invalid offset parameter')
    })

    it('should successfully search episodes', async () => {
      const mockSearchResponse = {
        results: [
          {
            episode: {
              episodeId: 'ep1',
              title: 'Test Episode',
            },
            podcast: {
              podcastId: 'pod1',
              title: 'Test Podcast',
            },
            relevance: {
              score: 0.95,
              matchedFields: ['title'],
              highlights: {
                title: '<mark>Test</mark> Episode',
              },
            },
          },
        ],
        total: 1,
        hasMore: false,
        searchTime: 0.123,
      }

      mockSearchService.searchEpisodes = vi.fn().mockResolvedValue(mockSearchResponse)

      const event = createMockEvent({
        queryStringParameters: { q: 'test' },
      })

      const response = await handler(event)
      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data).toEqual(mockSearchResponse)

      expect(mockSearchService.searchEpisodes).toHaveBeenCalledWith('user123', {
        query: 'test',
        limit: undefined,
        offset: undefined,
        podcastId: undefined,
      })
    })

    it('should pass all query parameters to search service', async () => {
      mockSearchService.searchEpisodes = vi.fn().mockResolvedValue({
        results: [],
        total: 0,
        hasMore: false,
        searchTime: 0.1,
      })

      const event = createMockEvent({
        queryStringParameters: {
          q: 'machine learning',
          limit: '50',
          offset: '20',
          podcastId: 'pod123',
        },
      })

      await handler(event)

      expect(mockSearchService.searchEpisodes).toHaveBeenCalledWith('user123', {
        query: 'machine learning',
        limit: 50,
        offset: 20,
        podcastId: 'pod123',
      })
    })
  })

  describe('error handling', () => {
    it('should return 400 for query too long error', async () => {
      mockSearchService.searchEpisodes = vi
        .fn()
        .mockRejectedValue(new Error('Search query too long. Maximum length is 100 characters.'))

      const event = createMockEvent()
      const response = await handler(event)

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error.message).toContain('Search query too long')
    })

    it('should return 500 for unexpected errors', async () => {
      mockSearchService.searchEpisodes = vi.fn().mockRejectedValue(new Error('Database connection failed'))

      const event = createMockEvent()
      const response = await handler(event)

      expect(response.statusCode).toBe(500)
      const body = JSON.parse(response.body)
      expect(body.error.message).toBe('Internal server error')
    })
  })

  describe('non-GET requests', () => {
    it('should return 405 for POST request', async () => {
      const event = createMockEvent({ httpMethod: 'POST' })
      const response = await handler(event)

      expect(response.statusCode).toBe(405)
      const body = JSON.parse(response.body)
      expect(body.error.message).toBe('Method not allowed')
    })
  })
})
