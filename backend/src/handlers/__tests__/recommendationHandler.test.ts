import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIGatewayProxyEvent } from 'aws-lambda'
import { getRecommendations, extractGuests, batchExtractGuests, updateGuestAnalytics } from '../recommendationHandler'
import { recommendationService } from '../../services/recommendationService'
import { bedrockService } from '../../services/bedrockService'
import { rateLimitService } from '../../services/rateLimitService'

// Mock dependencies
vi.mock('../../services/recommendationService')
vi.mock('../../services/bedrockService')
vi.mock('../../services/rateLimitService')

const mockRecommendationService = vi.mocked(recommendationService)
const mockBedrockService = vi.mocked(bedrockService)
const mockRateLimitService = vi.mocked(rateLimitService)

describe('RecommendationHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRateLimitService.checkRateLimit.mockResolvedValue(true)
  })

  const createMockEvent = (
    method: string,
    path: string,
    pathParams?: any,
    body?: string | null,
    queryParams?: any,
    userId = 'test-user-123'
  ): APIGatewayProxyEvent => ({
    httpMethod: method,
    path,
    pathParameters: pathParams,
    body,
    queryStringParameters: queryParams,
    requestContext: {
      authorizer: {
        claims: {
          sub: userId,
        },
      },
    } as any,
  } as APIGatewayProxyEvent)

  describe('getRecommendations', () => {
    it('should return recommendations successfully', async () => {
      const mockRecommendations = [
        {
          episodeId: 'ep-123',
          episode: {
            episodeId: 'ep-123',
            title: 'Test Episode',
            podcastName: 'Test Podcast',
            podcastId: 'pod-456',
            releaseDate: '2023-01-15T08:00:00Z',
            duration: '45:30',
            audioUrl: 'http://example.com/episode.mp3',
            imageUrl: 'http://example.com/image.jpg',
            description: 'Test description',
            extractedGuests: ['John Doe'],
          },
          score: 0.85,
          reasons: ['Test reason'],
          factors: {
            recentShowListening: 0.8,
            newEpisodeBonus: 0.0,
            rediscoveryBonus: 0.6,
            guestMatchBonus: 0.9,
            favoriteBonus: 0.7,
          },
        },
      ]

      mockRecommendationService.getRecommendations.mockResolvedValue(mockRecommendations)

      const event = createMockEvent('GET', '/recommendations', null, null, { limit: '10' })
      const result = await getRecommendations(event)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body)).toEqual({
        data: mockRecommendations,
        timestamp: expect.any(String),
        path: '/recommendations',
      })
      expect(mockRecommendationService.getRecommendations).toHaveBeenCalledWith('test-user-123', 10, {})
    })

    it('should handle query parameters correctly', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue([])

      const event = createMockEvent('GET', '/recommendations', null, null, {
        limit: '5',
        not_recent: 'true',
        favorites: 'true',
        guests: 'true',
        new: 'true',
      })

      const result = await getRecommendations(event)

      expect(result.statusCode).toBe(200)
      expect(mockRecommendationService.getRecommendations).toHaveBeenCalledWith('test-user-123', 5, {
        not_recent: true,
        favorites: true,
        guests: true,
        new: true,
      })
    })

    it('should return 401 when user is not authenticated', async () => {
      const event = createMockEvent('GET', '/recommendations', null, null, null, '')

      const result = await getRecommendations(event)

      expect(result.statusCode).toBe(401)
      expect(JSON.parse(result.body)).toEqual({
        error: {
          message: 'Unauthorized',
          code: 'UNAUTHORIZED',
        },
        timestamp: expect.any(String),
      })
    })

    it('should handle rate limiting', async () => {
      mockRateLimitService.checkRateLimit.mockResolvedValue(false)

      const event = createMockEvent('GET', '/recommendations')
      const result = await getRecommendations(event)

      expect(result.statusCode).toBe(429)
      expect(JSON.parse(result.body)).toEqual({
        error: {
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        timestamp: expect.any(String),
      })
    })

    it('should handle service errors gracefully', async () => {
      mockRecommendationService.getRecommendations.mockRejectedValue(new Error('Database error'))

      const event = createMockEvent('GET', '/recommendations')
      const result = await getRecommendations(event)

      expect(result.statusCode).toBe(500)
      expect(JSON.parse(result.body)).toEqual({
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        },
        timestamp: expect.any(String),
      })
    })

    it('should include CORS headers', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue([])

      const event = createMockEvent('GET', '/recommendations')
      const result = await getRecommendations(event)

      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      })
    })
  })

  describe('extractGuests', () => {
    it('should extract guests successfully', async () => {
      const mockExtractedGuests = {
        episodeId: 'ep-123',
        extractedGuests: ['John Doe', 'Jane Smith'],
        confidence: 0.95,
        extractedAt: '2024-01-15T10:30:00Z',
      }

      mockBedrockService.extractGuests.mockResolvedValue(mockExtractedGuests)

      const requestBody = {
        episodeId: 'ep-123',
        title: 'Test Episode',
        description: 'Episode with John Doe and Jane Smith',
      }

      const event = createMockEvent('POST', '/recommendations/extract-guests', null, JSON.stringify(requestBody))
      const result = await extractGuests(event)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body)).toEqual({
        data: mockExtractedGuests,
        timestamp: expect.any(String),
        path: '/recommendations/extract-guests',
      })
      expect(mockBedrockService.extractGuests).toHaveBeenCalledWith(requestBody)
    })

    it('should validate request body', async () => {
      const invalidBody = {
        episodeId: 'ep-123',
        // Missing required fields
      }

      const event = createMockEvent('POST', '/recommendations/extract-guests', null, JSON.stringify(invalidBody))
      const result = await extractGuests(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error: {
          message: expect.stringContaining('Validation error'),
          code: 'VALIDATION_ERROR',
        },
        timestamp: expect.any(String),
      })
    })

    it('should handle malformed JSON', async () => {
      const event = createMockEvent('POST', '/recommendations/extract-guests', null, 'invalid-json')
      const result = await extractGuests(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error: {
          message: 'Invalid JSON in request body',
          code: 'INVALID_JSON',
        },
        timestamp: expect.any(String),
      })
    })
  })

  describe('batchExtractGuests', () => {
    it('should extract guests for multiple episodes', async () => {
      const mockBatchResult = [
        {
          episodeId: 'ep-123',
          extractedGuests: ['John Doe'],
          confidence: 0.95,
          extractedAt: '2024-01-15T10:30:00Z',
        },
        {
          episodeId: 'ep-456',
          extractedGuests: ['Jane Smith'],
          confidence: 0.92,
          extractedAt: '2024-01-15T10:30:00Z',
        },
      ]

      mockBedrockService.batchExtractGuests.mockResolvedValue(mockBatchResult)

      const requestBody = [
        {
          episodeId: 'ep-123',
          title: 'Episode 1',
          description: 'Episode with John Doe',
        },
        {
          episodeId: 'ep-456',
          title: 'Episode 2',
          description: 'Episode with Jane Smith',
        },
      ]

      const event = createMockEvent('POST', '/recommendations/batch-extract-guests', null, JSON.stringify(requestBody))
      const result = await batchExtractGuests(event)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body)).toEqual({
        data: mockBatchResult,
        timestamp: expect.any(String),
        path: '/recommendations/batch-extract-guests',
      })
    })

    it('should handle empty batch request', async () => {
      const event = createMockEvent('POST', '/recommendations/batch-extract-guests', null, JSON.stringify([]))
      const result = await batchExtractGuests(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error: {
          message: expect.stringContaining('Batch request cannot be empty'),
          code: 'VALIDATION_ERROR',
        },
        timestamp: expect.any(String),
      })
    })

    it('should handle batch size limits', async () => {
      const largeBatch = Array.from({ length: 101 }, (_, i) => ({
        episodeId: `ep-${i}`,
        title: `Episode ${i}`,
        description: `Description ${i}`,
      }))

      const event = createMockEvent('POST', '/recommendations/batch-extract-guests', null, JSON.stringify(largeBatch))
      const result = await batchExtractGuests(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error: {
          message: expect.stringContaining('Batch size exceeds limit'),
          code: 'VALIDATION_ERROR',
        },
        timestamp: expect.any(String),
      })
    })
  })

  describe('updateGuestAnalytics', () => {
    it('should update guest analytics successfully', async () => {
      mockRecommendationService.updateGuestAnalytics.mockResolvedValue()

      const requestBody = {
        episodeId: 'ep-123',
        guests: ['John Doe', 'Jane Smith'],
        action: 'listen' as const,
        rating: 4,
      }

      const event = createMockEvent('POST', '/recommendations/guest-analytics', null, JSON.stringify(requestBody))
      const result = await updateGuestAnalytics(event)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body)).toEqual({
        data: {
          message: 'Guest analytics updated successfully',
        },
        timestamp: expect.any(String),
        path: '/recommendations/guest-analytics',
      })
      expect(mockRecommendationService.updateGuestAnalytics).toHaveBeenCalledWith(
        'test-user-123',
        'ep-123',
        ['John Doe', 'Jane Smith'],
        'listen',
        4
      )
    })

    it('should validate action parameter', async () => {
      const requestBody = {
        episodeId: 'ep-123',
        guests: ['John Doe'],
        action: 'invalid-action',
        rating: 4,
      }

      const event = createMockEvent('POST', '/recommendations/guest-analytics', null, JSON.stringify(requestBody))
      const result = await updateGuestAnalytics(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error: {
          message: expect.stringContaining('Validation error'),
          code: 'VALIDATION_ERROR',
        },
        timestamp: expect.any(String),
      })
    })

    it('should validate rating range', async () => {
      const requestBody = {
        episodeId: 'ep-123',
        guests: ['John Doe'],
        action: 'listen' as const,
        rating: 6, // Invalid rating (should be 1-5)
      }

      const event = createMockEvent('POST', '/recommendations/guest-analytics', null, JSON.stringify(requestBody))
      const result = await updateGuestAnalytics(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error: {
          message: expect.stringContaining('Validation error'),
          code: 'VALIDATION_ERROR',
        },
        timestamp: expect.any(String),
      })
    })
  })

  describe('Common handler behavior', () => {
    it('should handle OPTIONS requests (CORS preflight)', async () => {
      const event = createMockEvent('OPTIONS', '/recommendations')
      const result = await getRecommendations(event)

      expect(result.statusCode).toBe(200)
      expect(result.headers).toEqual({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      })
    })

    it('should handle missing request body for POST requests', async () => {
      const event = createMockEvent('POST', '/recommendations/extract-guests', null, null)
      const result = await extractGuests(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error: {
          message: 'Request body is required',
          code: 'MISSING_BODY',
        },
        timestamp: expect.any(String),
      })
    })

    it('should sanitize error messages in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        mockRecommendationService.getRecommendations.mockRejectedValue(new Error('Database connection failed'))

        const event = createMockEvent('GET', '/recommendations')
        const result = await getRecommendations(event)

        expect(result.statusCode).toBe(500)
        expect(JSON.parse(result.body)).toEqual({
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_SERVER_ERROR',
          },
          timestamp: expect.any(String),
        })
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should log errors for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockRecommendationService.getRecommendations.mockRejectedValue(new Error('Test error'))

      const event = createMockEvent('GET', '/recommendations')
      await getRecommendations(event)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in getRecommendations:',
        expect.objectContaining({
          message: 'Test error',
        })
      )

      consoleSpy.mockRestore()
    })
  })
})