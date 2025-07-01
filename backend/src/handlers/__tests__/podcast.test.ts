import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIGatewayProxyEvent } from 'aws-lambda'
import { handler } from '../podcast.js'

// Mock the services
vi.mock('../../services/podcastService.js', () => ({
  PodcastService: vi.fn().mockImplementation(() => ({
    getUserPodcasts: vi.fn().mockResolvedValue({
      podcasts: [],
      hasMore: false,
      total: 0,
    }),
    getPodcast: vi.fn().mockResolvedValue({
      podcastId: 'test-podcast',
      title: 'Test Podcast',
      userId: 'test-user',
    }),
    addPodcast: vi.fn().mockResolvedValue({
      podcastId: 'new-podcast',
      title: 'New Podcast',
      rssUrl: 'https://example.com/rss',
    }),
    removePodcast: vi.fn().mockResolvedValue(undefined),
    checkPodcastExists: vi.fn().mockResolvedValue(false),
  })),
}))

vi.mock('../../services/userService.js', () => ({
  UserService: vi.fn().mockImplementation(() => ({
    updateLastActive: vi.fn().mockResolvedValue(undefined),
  })),
}))

// Mock auth
vi.mock('../../utils/auth.js', () => ({
  extractUserFromEvent: vi.fn().mockReturnValue({
    userId: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    sub: 'test-user',
  }),
}))

describe('Podcast Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockEvent = (
    httpMethod: string,
    pathParameters?: Record<string, string>,
    body?: string,
    queryStringParameters?: Record<string, string>
  ): APIGatewayProxyEvent => ({
    httpMethod,
    path: '/api/podcasts',
    pathParameters: pathParameters || null,
    body: body || null,
    queryStringParameters: queryStringParameters || null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    requestContext: {
      accountId: 'test',
      apiId: 'test',
      authorizer: {
        claims: {
          sub: 'test-user',
          email: 'test@example.com',
          name: 'Test User',
        },
      },
      httpMethod,
      identity: {} as any,
      path: '/api/podcasts',
      protocol: 'HTTP/1.1',
      requestId: 'test',
      requestTime: '',
      requestTimeEpoch: 0,
      resourceId: 'test',
      resourcePath: '/api/podcasts',
      stage: 'test',
    },
    resource: '/api/podcasts',
    stageVariables: null,
    multiValueQueryStringParameters: null,
  })

  it('should handle OPTIONS request for CORS', async () => {
    const event = createMockEvent('OPTIONS')
    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*')
  })

  it('should get user podcasts', async () => {
    const event = createMockEvent('GET')
    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body).toHaveProperty('items')
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('hasMore')
  })

  it('should get specific podcast', async () => {
    const event = createMockEvent('GET', { podcastId: 'test-podcast' })
    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body.podcastId).toBe('test-podcast')
  })

  it('should add new podcast', async () => {
    const event = createMockEvent('POST', {}, JSON.stringify({
      rssUrl: 'https://example.com/rss'
    }))
    const result = await handler(event)

    expect(result.statusCode).toBe(201)
    const body = JSON.parse(result.body)
    expect(body).toHaveProperty('podcastId')
    expect(body).toHaveProperty('message', 'Podcast added successfully')
  })

  it('should delete podcast', async () => {
    const event = createMockEvent('DELETE', { podcastId: 'test-podcast' })
    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body).toHaveProperty('message', 'Podcast removed successfully')
  })

  it('should return 405 for unsupported methods', async () => {
    const event = createMockEvent('PATCH')
    const result = await handler(event)

    expect(result.statusCode).toBe(405)
  })
})