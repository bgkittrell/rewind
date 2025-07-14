import { describe, it, expect, vi, beforeEach, afterEach, MockedFunction } from 'vitest'
import { APIGatewayProxyEvent } from 'aws-lambda'

// Mock services first before any imports
vi.mock('../../services/recommendationService', () => ({
  recommendationService: {
    getRecommendations: vi.fn(),
    updateGuestAnalytics: vi.fn(),
  },
}))

vi.mock('../../services/bedrockService', () => ({
  bedrockService: {
    extractGuests: vi.fn(),
    batchExtractGuests: vi.fn(),
  },
}))

vi.mock('../../services/loggerService', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    logRequest: vi.fn(),
    logResponse: vi.fn(),
    setCorrelationId: vi.fn(),
    generateCorrelationId: vi.fn().mockReturnValue('test-correlation-id'),
    setDefaultContext: vi.fn(),
    extractRequestContext: vi.fn().mockReturnValue({}),
  },
}))

// Import handlers and services after mocks are set
import { getRecommendations, extractGuests, batchExtractGuests, updateGuestAnalytics } from '../recommendationHandler'
import { recommendationService } from '../../services/recommendationService'
import { bedrockService } from '../../services/bedrockService'

// Get mocked functions
const mockGetRecommendations = vi.mocked(recommendationService.getRecommendations)
const mockUpdateGuestAnalytics = vi.mocked(recommendationService.updateGuestAnalytics)
const mockExtractGuests = vi.mocked(bedrockService.extractGuests)
const mockBatchExtractGuests = vi.mocked(bedrockService.batchExtractGuests)

// Helper to create mock API Gateway event
const createMockEvent = (
  path: string,
  httpMethod = 'GET',
  body?: any,
  queryStringParameters?: Record<string, string>,
  userId = 'test-user-123',
): APIGatewayProxyEvent => ({
  body: body ? JSON.stringify(body) : null,
  headers: {},
  multiValueHeaders: {},
  httpMethod,
  isBase64Encoded: false,
  path,
  pathParameters: null,
  queryStringParameters,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {
    accountId: 'test-account',
    apiId: 'test-api',
    authorizer: userId ? { claims: { sub: userId } } : null,
    protocol: 'HTTP/1.1',
    httpMethod,
    identity: {
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      clientCert: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      sourceIp: '127.0.0.1',
      user: null,
      userAgent: null,
      userArn: null,
    },
    path,
    stage: 'test',
    requestId: 'test-request-id',
    requestTime: '01/Jan/2024:00:00:00 +0000',
    requestTimeEpoch: 1704067200000,
    resourceId: 'test-resource',
    resourcePath: path,
  },
  resource: path,
})

describe('recommendationHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRecommendations', () => {
    const mockRecommendations = [
      {
        episodeId: 'episode-1',
        podcastId: 'podcast-1',
        title: 'Test Episode 1',
        description: 'Test description 1',
        score: 0.9,
        reason: 'Based on your listening history',
      },
      {
        episodeId: 'episode-2',
        podcastId: 'podcast-2',
        title: 'Test Episode 2',
        description: 'Test description 2',
        score: 0.8,
        reason: 'Similar to episodes you liked',
      },
    ]

    it('should get recommendations successfully', async () => {
      mockGetRecommendations.mockResolvedValueOnce(mockRecommendations)

      const event = createMockEvent('/recommendations')
      const result = await getRecommendations(event)

      expect(result.statusCode).toBe(200)
      expect(mockGetRecommendations).toHaveBeenCalledWith('test-user-123', 20, undefined)

      const body = JSON.parse(result.body)
      expect(body.data).toEqual(mockRecommendations)
      expect(body.timestamp).toBeDefined()
    })

    it('should handle query parameters correctly', async () => {
      mockGetRecommendations.mockResolvedValueOnce(mockRecommendations)

      const event = createMockEvent('/recommendations', 'GET', null, {
        limit: '10',
        not_recent: 'true',
        favorites: 'true',
        guests: 'true',
        new: 'true',
      })

      const result = await getRecommendations(event)

      expect(result.statusCode).toBe(200)
      expect(mockGetRecommendations).toHaveBeenCalledWith('test-user-123', 10, {
        not_recent: true,
        favorites: true,
        guests: true,
        new: true,
      })
    })

    it('should cap limit at 50', async () => {
      mockGetRecommendations.mockResolvedValueOnce(mockRecommendations)

      const event = createMockEvent('/recommendations', 'GET', null, {
        limit: '100',
      })

      const result = await getRecommendations(event)

      expect(result.statusCode).toBe(200)
      expect(mockGetRecommendations).toHaveBeenCalledWith('test-user-123', 50, undefined)
    })

    it('should return 401 when user is not authenticated', async () => {
      const event = createMockEvent('/recommendations', 'GET', null, null, null)

      const result = await getRecommendations(event)

      expect(result.statusCode).toBe(401)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Unauthorized')
      expect(body.error.code).toBe('UNAUTHORIZED')
    })

    it('should handle service errors', async () => {
      mockGetRecommendations.mockRejectedValueOnce(new Error('Service error'))

      const event = createMockEvent('/recommendations')
      const result = await getRecommendations(event)

      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Internal server error')
      expect(body.error.code).toBe('INTERNAL_ERROR')
      expect(body.error.details).toBe('Service error')
    })
  })

  describe('extractGuests', () => {
    const mockExtractionRequest = {
      episodeId: 'episode-123',
      title: 'Interview with John Doe',
      description: 'A fascinating conversation with tech entrepreneur John Doe',
    }

    const mockExtractionResult = {
      episodeId: 'episode-123',
      guests: ['John Doe'],
      confidence: 0.95,
    }

    it('should extract guests successfully', async () => {
      mockExtractGuests.mockResolvedValueOnce(mockExtractionResult)

      const event = createMockEvent('/recommendations/extract-guests', 'POST', mockExtractionRequest)
      const result = await extractGuests(event)

      expect(result.statusCode).toBe(200)
      expect(mockExtractGuests).toHaveBeenCalledWith(mockExtractionRequest)

      const body = JSON.parse(result.body)
      expect(body.data).toEqual(mockExtractionResult)
    })

    it('should return 401 when user is not authenticated', async () => {
      const event = createMockEvent('/recommendations/extract-guests', 'POST', mockExtractionRequest, null, null)

      const result = await extractGuests(event)

      expect(result.statusCode).toBe(401)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Unauthorized')
    })

    it('should return 400 when body is missing', async () => {
      const event = createMockEvent('/recommendations/extract-guests', 'POST')

      const result = await extractGuests(event)

      expect(result.statusCode).toBe(400)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Request body is required')
      expect(body.error.code).toBe('MISSING_BODY')
    })

    it('should return 400 when required fields are missing', async () => {
      const event = createMockEvent('/recommendations/extract-guests', 'POST', {
        episodeId: 'episode-123',
        // missing title and description
      })

      const result = await extractGuests(event)

      expect(result.statusCode).toBe(400)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Missing required fields: episodeId, title, description')
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle malformed JSON', async () => {
      const event = createMockEvent('/recommendations/extract-guests', 'POST')
      event.body = '{"invalid json'

      const result = await extractGuests(event)

      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Internal server error')
    })

    it('should handle service errors', async () => {
      mockExtractGuests.mockRejectedValueOnce(new Error('AI service error'))

      const event = createMockEvent('/recommendations/extract-guests', 'POST', mockExtractionRequest)
      const result = await extractGuests(event)

      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Internal server error')
      expect(body.error.details).toBe('AI service error')
    })
  })

  describe('batchExtractGuests', () => {
    const mockBatchRequest = [
      {
        episodeId: 'episode-1',
        title: 'Episode 1',
        description: 'Description 1',
      },
      {
        episodeId: 'episode-2',
        title: 'Episode 2',
        description: 'Description 2',
      },
    ]

    const mockBatchResult = [
      {
        episodeId: 'episode-1',
        guests: ['Guest 1'],
        confidence: 0.9,
      },
      {
        episodeId: 'episode-2',
        guests: ['Guest 2', 'Guest 3'],
        confidence: 0.85,
      },
    ]

    it('should batch extract guests successfully', async () => {
      mockBatchExtractGuests.mockResolvedValueOnce(mockBatchResult)

      const event = createMockEvent('/recommendations/batch-extract-guests', 'POST', mockBatchRequest)
      const result = await batchExtractGuests(event)

      expect(result.statusCode).toBe(200)
      expect(mockBatchExtractGuests).toHaveBeenCalledWith(mockBatchRequest)

      const body = JSON.parse(result.body)
      expect(body.data).toEqual(mockBatchResult)
    })

    it('should return 400 when body is not an array', async () => {
      const event = createMockEvent('/recommendations/batch-extract-guests', 'POST', {
        notAnArray: true,
      })

      const result = await batchExtractGuests(event)

      expect(result.statusCode).toBe(400)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Request body must be an array of extraction requests')
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 when batch size exceeds limit', async () => {
      const largeBatch = Array(11).fill({
        episodeId: 'episode',
        title: 'Title',
        description: 'Description',
      })

      const event = createMockEvent('/recommendations/batch-extract-guests', 'POST', largeBatch)
      const result = await batchExtractGuests(event)

      expect(result.statusCode).toBe(400)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Batch size cannot exceed 10 requests')
      expect(body.error.code).toBe('BATCH_TOO_LARGE')
    })

    it('should return 400 when any request is invalid', async () => {
      const invalidBatch = [
        {
          episodeId: 'episode-1',
          title: 'Episode 1',
          description: 'Description 1',
        },
        {
          episodeId: 'episode-2',
          // missing title and description
        },
      ]

      const event = createMockEvent('/recommendations/batch-extract-guests', 'POST', invalidBatch)
      const result = await batchExtractGuests(event)

      expect(result.statusCode).toBe(400)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('All requests must have episodeId, title, and description')
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle service errors', async () => {
      mockBatchExtractGuests.mockRejectedValueOnce(new Error('Batch processing error'))

      const event = createMockEvent('/recommendations/batch-extract-guests', 'POST', mockBatchRequest)
      const result = await batchExtractGuests(event)

      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Internal server error')
      expect(body.error.details).toBe('Batch processing error')
    })
  })

  describe('updateGuestAnalytics', () => {
    const mockAnalyticsRequest = {
      episodeId: 'episode-123',
      guests: ['John Doe', 'Jane Smith'],
      action: 'listen',
      rating: 4.5,
    }

    it('should update guest analytics successfully', async () => {
      mockUpdateGuestAnalytics.mockResolvedValueOnce(undefined)

      const event = createMockEvent('/recommendations/guest-analytics', 'POST', mockAnalyticsRequest)
      const result = await updateGuestAnalytics(event)

      expect(result.statusCode).toBe(200)
      expect(mockUpdateGuestAnalytics).toHaveBeenCalledWith(
        'test-user-123',
        'episode-123',
        ['John Doe', 'Jane Smith'],
        'listen',
        4.5,
      )

      const body = JSON.parse(result.body)
      expect(body.data).toEqual({ success: true })
    })

    it('should handle favorite action', async () => {
      mockUpdateGuestAnalytics.mockResolvedValueOnce(undefined)

      const request = { ...mockAnalyticsRequest, action: 'favorite' }
      const event = createMockEvent('/recommendations/guest-analytics', 'POST', request)
      const result = await updateGuestAnalytics(event)

      expect(result.statusCode).toBe(200)
      expect(mockUpdateGuestAnalytics).toHaveBeenCalledWith(
        'test-user-123',
        'episode-123',
        ['John Doe', 'Jane Smith'],
        'favorite',
        4.5,
      )
    })

    it('should return 400 when required fields are missing', async () => {
      const event = createMockEvent('/recommendations/guest-analytics', 'POST', {
        episodeId: 'episode-123',
        // missing guests and action
      })

      const result = await updateGuestAnalytics(event)

      expect(result.statusCode).toBe(400)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Missing required fields: episodeId, guests, action')
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for invalid action', async () => {
      const request = { ...mockAnalyticsRequest, action: 'invalid' }
      const event = createMockEvent('/recommendations/guest-analytics', 'POST', request)
      const result = await updateGuestAnalytics(event)

      expect(result.statusCode).toBe(400)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Action must be either "listen" or "favorite"')
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 when guests is not an array', async () => {
      const request = { ...mockAnalyticsRequest, guests: 'not an array' }
      const event = createMockEvent('/recommendations/guest-analytics', 'POST', request)
      const result = await updateGuestAnalytics(event)

      expect(result.statusCode).toBe(400)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Guests must be an array of strings')
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle service errors', async () => {
      mockUpdateGuestAnalytics.mockRejectedValueOnce(new Error('Analytics update failed'))

      const event = createMockEvent('/recommendations/guest-analytics', 'POST', mockAnalyticsRequest)
      const result = await updateGuestAnalytics(event)

      expect(result.statusCode).toBe(500)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Internal server error')
      expect(body.error.details).toBe('Analytics update failed')
    })
  })
})
