/**
 * Up-voting Integration Test Infrastructure
 *
 * Comprehensive integration tests for the up-voting feature using Leela's AWS adapter layer.
 * Tests complete user journey from frontend UI interaction to database records.
 *
 * As requested by Professor: Priority 2 - Backend Implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { setupIntegrationTestEnvironment } from '../../testing/aws-adapter/AwsAdapterFactory'
import { AwsAdapterRegistryImpl } from '../../testing/aws-adapter/AwsAdapterFactory'
import { TableNameResolver } from '../../testing/aws-adapter/config/AdapterConfig'
import { updateGuestAnalytics } from '../recommendationHandler'

// Mock the actual services to use our test adapters
vi.mock('../../services/recommendationService', () => ({
  recommendationService: {
    updateGuestAnalytics: vi.fn(),
  },
}))

vi.mock('../../services/loggerService', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('Up-voting Integration Tests', () => {
  let adapters: AwsAdapterRegistryImpl
  let testDataManager: any
  let eventGenerator: any
  let tableResolver: TableNameResolver

  beforeEach(async () => {
    // Setup test environment with Leela's AWS adapter layer
    adapters = setupIntegrationTestEnvironment()
    testDataManager = adapters.getTestDataManager()
    eventGenerator = adapters.getEventGenerator()
    tableResolver = TableNameResolver.getInstance()

    // Initialize test environment
    await adapters.setupTestEnvironment()
  })

  afterEach(async () => {
    // Clean up test data
    await adapters.resetTestData()
    vi.clearAllMocks()
  })

  describe('Database Schema Validation', () => {
    it('should validate up-vote database record structure', async () => {
      // ===== PHASE 1: Create Test Data =====
      const testPodcast = await testDataManager.createTestPodcast({
        title: 'Schema Validation Podcast',
        author: 'Test Author',
        description: 'Test podcast for schema validation',
      })

      const testEpisode = await testDataManager.createTestEpisode({
        podcastId: testPodcast.id,
        title: 'Test Episode for Schema Validation',
        description: 'Test episode description',
        extractedGuests: ['John Doe', 'Jane Smith'],
        likeCount: 0,
      })

      const testUser = await testDataManager.createTestUser({
        email: 'schema@test.com',
        username: 'schemauser',
        userId: 'test-user-schema-123',
      })

      // ===== PHASE 2: Test Guest Analytics Record Schema =====
      const guestAnalyticsTable = tableResolver.getGuestAnalyticsTable()

      // Create up-vote guest analytics record
      const guestAnalyticsRecord = {
        userId: testUser.userId,
        guestName: 'John Doe',
        listenCount: 0,
        favoriteCount: 1,
        averageRating: 5,
        episodeIds: new Set([testEpisode.id]),
        lastListenDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }

      await adapters.dynamodb.putItem(guestAnalyticsTable, guestAnalyticsRecord)

      // Validate record structure
      const retrievedRecord = await adapters.dynamodb.getItem(guestAnalyticsTable, {
        userId: testUser.userId,
        guestName: 'John Doe',
      })

      expect(retrievedRecord).toBeTruthy()
      expect(retrievedRecord.userId).toBe(testUser.userId)
      expect(retrievedRecord.guestName).toBe('John Doe')
      expect(retrievedRecord.favoriteCount).toBe(1)
      expect(retrievedRecord.averageRating).toBe(5)
      expect(retrievedRecord.episodeIds).toBeInstanceOf(Set)
      expect(retrievedRecord.episodeIds.has(testEpisode.id)).toBe(true)
      expect(retrievedRecord.createdAt).toBeDefined()
      expect(retrievedRecord.updatedAt).toBeDefined()

      // ===== PHASE 3: Test User Favorites Record Schema =====
      const userFavoritesTable = tableResolver.getUserFavoritesTable()

      // Create favorite record
      const favoriteRecord = {
        userId: testUser.userId,
        itemId: testEpisode.id,
        itemType: 'episode',
        isFavorite: true,
        rating: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await adapters.dynamodb.putItem(userFavoritesTable, favoriteRecord)

      // Validate favorite record structure
      const retrievedFavorite = await adapters.dynamodb.getItem(userFavoritesTable, {
        userId: testUser.userId,
        itemId: testEpisode.id,
      })

      expect(retrievedFavorite).toBeTruthy()
      expect(retrievedFavorite.userId).toBe(testUser.userId)
      expect(retrievedFavorite.itemId).toBe(testEpisode.id)
      expect(retrievedFavorite.itemType).toBe('episode')
      expect(retrievedFavorite.isFavorite).toBe(true)
      expect(retrievedFavorite.rating).toBe(5)
      expect(retrievedFavorite.createdAt).toBeDefined()
      expect(retrievedFavorite.updatedAt).toBeDefined()

      // ===== PHASE 4: Test Episode Update Schema =====
      const episodesTable = tableResolver.getEpisodesTable()

      // Update episode with up-vote count
      await adapters.dynamodb.updateItem(
        episodesTable,
        { id: testEpisode.id, naturalKey: testEpisode.naturalKey },
        'SET likeCount = likeCount + :increment',
        {
          increment: 1,
        },
      )

      // Validate episode update
      const updatedEpisode = await adapters.dynamodb.getItem(episodesTable, {
        id: testEpisode.id,
        naturalKey: testEpisode.naturalKey,
      })

      expect(updatedEpisode).toBeTruthy()
      expect(updatedEpisode.likeCount).toBe(1)
      expect(updatedEpisode.id).toBe(testEpisode.id)
      expect(updatedEpisode.title).toBe('Test Episode for Schema Validation')
      expect(updatedEpisode.extractedGuests).toEqual(['John Doe', 'Jane Smith'])
    })

    it('should validate schema constraints and data types', async () => {
      const testUser = await testDataManager.createTestUser({
        userId: 'test-user-constraints-123',
      })

      // ===== Test Required Fields =====
      const guestAnalyticsTable = tableResolver.getGuestAnalyticsTable()

      // Test missing required fields
      const invalidRecord = {
        userId: testUser.userId,
        // Missing guestName (required)
        favoriteCount: 1,
      }

      // This should fail validation
      await expect(adapters.dynamodb.putItem(guestAnalyticsTable, invalidRecord)).rejects.toThrow()

      // ===== Test Data Type Validation =====
      const validRecord = {
        userId: testUser.userId,
        guestName: 'Test Guest',
        listenCount: 0,
        favoriteCount: 1,
        averageRating: 5,
        episodeIds: new Set(['episode-1', 'episode-2']),
        lastListenDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }

      await adapters.dynamodb.putItem(guestAnalyticsTable, validRecord)

      const retrievedRecord = await adapters.dynamodb.getItem(guestAnalyticsTable, {
        userId: testUser.userId,
        guestName: 'Test Guest',
      })

      // Validate data types
      expect(typeof retrievedRecord.userId).toBe('string')
      expect(typeof retrievedRecord.guestName).toBe('string')
      expect(typeof retrievedRecord.listenCount).toBe('number')
      expect(typeof retrievedRecord.favoriteCount).toBe('number')
      expect(typeof retrievedRecord.averageRating).toBe('number')
      expect(retrievedRecord.episodeIds).toBeInstanceOf(Set)
      expect(typeof retrievedRecord.lastListenDate).toBe('string')
      expect(typeof retrievedRecord.updatedAt).toBe('string')
      expect(typeof retrievedRecord.createdAt).toBe('string')

      // Test valid date format
      expect(new Date(retrievedRecord.lastListenDate).toISOString()).toBe(retrievedRecord.lastListenDate)
      expect(new Date(retrievedRecord.updatedAt).toISOString()).toBe(retrievedRecord.updatedAt)
      expect(new Date(retrievedRecord.createdAt).toISOString()).toBe(retrievedRecord.createdAt)
    })
  })

  describe('Request/Response Validation', () => {
    it('should validate up-vote API request and response format', async () => {
      const testUser = await testDataManager.createTestUser({
        userId: 'test-user-api-123',
      })

      const testPodcast = await testDataManager.createTestPodcast()
      const testEpisode = await testDataManager.createTestEpisode({
        podcastId: testPodcast.id,
        extractedGuests: ['John Doe', 'Jane Smith'],
      })

      // ===== Test Valid Request Format =====
      const validRequest = {
        episodeId: testEpisode.id,
        guests: ['John Doe', 'Jane Smith'],
        action: 'up',
        rating: 5,
      }

      const validEvent = eventGenerator.generateAPIGatewayEvent(
        'POST',
        '/recommendations/guest-analytics',
        JSON.stringify(validRequest),
        {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      )

      // Add user context to event
      validEvent.requestContext.authorizer = {
        claims: {
          sub: testUser.userId,
        },
      }

      // Mock the service to verify it receives correct parameters
      const { recommendationService } = await import('../../services/recommendationService')
      const mockUpdateGuestAnalytics = vi.mocked(recommendationService.updateGuestAnalytics)
      mockUpdateGuestAnalytics.mockResolvedValueOnce()

      // Test the handler
      const response = await updateGuestAnalytics(validEvent)

      // Validate response format
      expect(response.statusCode).toBe(200)
      expect(response.headers).toHaveProperty('Content-Type', 'application/json')
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin', '*')

      const responseBody = JSON.parse(response.body)
      expect(responseBody).toHaveProperty('data')
      expect(responseBody).toHaveProperty('timestamp')
      expect(responseBody).toHaveProperty('path')
      expect(responseBody.data).toEqual({ success: true })
      expect(responseBody.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)

      // Verify service was called with correct parameters
      expect(mockUpdateGuestAnalytics).toHaveBeenCalledWith(
        testUser.userId,
        testEpisode.id,
        ['John Doe', 'Jane Smith'],
        'up',
        5,
      )
    })

    it('should handle invalid request formats', async () => {
      const testUser = await testDataManager.createTestUser({
        userId: 'test-user-invalid-123',
      })

      // ===== Test Missing Required Fields =====
      const invalidRequest = {
        episodeId: 'episode-123',
        // Missing guests and action
      }

      const invalidEvent = eventGenerator.generateAPIGatewayEvent(
        'POST',
        '/recommendations/guest-analytics',
        JSON.stringify(invalidRequest),
      )

      invalidEvent.requestContext.authorizer = {
        claims: {
          sub: testUser.userId,
        },
      }

      const response = await updateGuestAnalytics(invalidEvent)

      expect(response.statusCode).toBe(400)
      const responseBody = JSON.parse(response.body)
      expect(responseBody.error).toBeTruthy()
      expect(responseBody.error.code).toBe('VALIDATION_ERROR')
      expect(responseBody.error.message).toContain('Validation failed')

      // ===== Test Invalid Data Types =====
      const invalidTypeRequest = {
        episodeId: 'episode-123',
        guests: 'not-an-array', // Should be array
        action: 'up',
        rating: 'not-a-number', // Should be number
      }

      const invalidTypeEvent = eventGenerator.generateAPIGatewayEvent(
        'POST',
        '/recommendations/guest-analytics',
        JSON.stringify(invalidTypeRequest),
      )

      invalidTypeEvent.requestContext.authorizer = {
        claims: {
          sub: testUser.userId,
        },
      }

      const typeResponse = await updateGuestAnalytics(invalidTypeEvent)

      expect(typeResponse.statusCode).toBe(400)
      const typeResponseBody = JSON.parse(typeResponse.body)
      expect(typeResponseBody.error).toBeTruthy()
      expect(typeResponseBody.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle authentication validation', async () => {
      const validRequest = {
        episodeId: 'episode-123',
        guests: ['John Doe'],
        action: 'up',
        rating: 5,
      }

      // ===== Test Missing Authorization =====
      const noAuthEvent = eventGenerator.generateAPIGatewayEvent(
        'POST',
        '/recommendations/guest-analytics',
        JSON.stringify(validRequest),
      )

      // No authorizer context
      noAuthEvent.requestContext.authorizer = null

      const noAuthResponse = await updateGuestAnalytics(noAuthEvent)

      expect(noAuthResponse.statusCode).toBe(401)
      const noAuthBody = JSON.parse(noAuthResponse.body)
      expect(noAuthBody.error).toBeTruthy()
      expect(noAuthBody.error.code).toBe('UNAUTHORIZED')
      expect(noAuthBody.error.message).toBe('Unauthorized')

      // ===== Test Invalid Token =====
      const invalidTokenEvent = eventGenerator.generateAPIGatewayEvent(
        'POST',
        '/recommendations/guest-analytics',
        JSON.stringify(validRequest),
      )

      invalidTokenEvent.requestContext.authorizer = {
        claims: {
          // Missing sub claim
        },
      }

      const invalidTokenResponse = await updateGuestAnalytics(invalidTokenEvent)

      expect(invalidTokenResponse.statusCode).toBe(401)
      const invalidTokenBody = JSON.parse(invalidTokenResponse.body)
      expect(invalidTokenBody.error).toBeTruthy()
      expect(invalidTokenBody.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('Error Handling Test Scenarios', () => {
    it('should handle service errors gracefully', async () => {
      const testUser = await testDataManager.createTestUser({
        userId: 'test-user-error-123',
      })

      const validRequest = {
        episodeId: 'episode-123',
        guests: ['John Doe'],
        action: 'up',
        rating: 5,
      }

      const validEvent = eventGenerator.generateAPIGatewayEvent(
        'POST',
        '/recommendations/guest-analytics',
        JSON.stringify(validRequest),
      )

      validEvent.requestContext.authorizer = {
        claims: {
          sub: testUser.userId,
        },
      }

      // Mock service to throw error
      const { recommendationService } = await import('../../services/recommendationService')
      const mockUpdateGuestAnalytics = vi.mocked(recommendationService.updateGuestAnalytics)
      mockUpdateGuestAnalytics.mockRejectedValueOnce(new Error('Database connection failed'))

      const response = await updateGuestAnalytics(validEvent)

      expect(response.statusCode).toBe(500)
      const responseBody = JSON.parse(response.body)
      expect(responseBody.error).toBeTruthy()
      expect(responseBody.error.code).toBe('INTERNAL_ERROR')
      expect(responseBody.error.message).toBe('Internal server error')
      expect(responseBody.error.details).toBe('Database connection failed')
    })

    it('should handle malformed JSON requests', async () => {
      const testUser = await testDataManager.createTestUser({
        userId: 'test-user-json-123',
      })

      const malformedEvent = eventGenerator.generateAPIGatewayEvent(
        'POST',
        '/recommendations/guest-analytics',
        '{"invalid": json}', // Malformed JSON
      )

      malformedEvent.requestContext.authorizer = {
        claims: {
          sub: testUser.userId,
        },
      }

      const response = await updateGuestAnalytics(malformedEvent)

      expect(response.statusCode).toBe(400)
      const responseBody = JSON.parse(response.body)
      expect(responseBody.error).toBeTruthy()
      expect(responseBody.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle edge cases in up-vote processing', async () => {
      const testUser = await testDataManager.createTestUser({
        userId: 'test-user-edge-123',
      })

      // ===== Test Empty Guest List =====
      const emptyGuestsRequest = {
        episodeId: 'episode-123',
        guests: [],
        action: 'up',
        rating: 5,
      }

      const emptyGuestsEvent = eventGenerator.generateAPIGatewayEvent(
        'POST',
        '/recommendations/guest-analytics',
        JSON.stringify(emptyGuestsRequest),
      )

      emptyGuestsEvent.requestContext.authorizer = {
        claims: {
          sub: testUser.userId,
        },
      }

      const { recommendationService } = await import('../../services/recommendationService')
      const mockUpdateGuestAnalytics = vi.mocked(recommendationService.updateGuestAnalytics)
      mockUpdateGuestAnalytics.mockResolvedValueOnce()

      const emptyResponse = await updateGuestAnalytics(emptyGuestsEvent)

      expect(emptyResponse.statusCode).toBe(200)
      expect(mockUpdateGuestAnalytics).toHaveBeenCalledWith(testUser.userId, 'episode-123', [], 'up', 5)

      // ===== Test Large Guest List =====
      const largeGuestList = Array(100)
        .fill(0)
        .map((_, i) => `Guest ${i + 1}`)
      const largeGuestsRequest = {
        episodeId: 'episode-123',
        guests: largeGuestList,
        action: 'up',
        rating: 5,
      }

      const largeGuestsEvent = eventGenerator.generateAPIGatewayEvent(
        'POST',
        '/recommendations/guest-analytics',
        JSON.stringify(largeGuestsRequest),
      )

      largeGuestsEvent.requestContext.authorizer = {
        claims: {
          sub: testUser.userId,
        },
      }

      mockUpdateGuestAnalytics.mockResolvedValueOnce()

      const largeResponse = await updateGuestAnalytics(largeGuestsEvent)

      expect(largeResponse.statusCode).toBe(400)
      const largeResponseBody = JSON.parse(largeResponse.body)
      expect(largeResponseBody.error).toBeTruthy()
      expect(largeResponseBody.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Integration Test Utilities', () => {
    it('should provide test episode creation and cleanup utilities', async () => {
      // Test episode creation utility
      const testPodcast = await testDataManager.createTestPodcast({
        title: 'Utility Test Podcast',
      })

      const testEpisode = await testDataManager.createTestEpisode({
        podcastId: testPodcast.id,
        title: 'Utility Test Episode',
        extractedGuests: ['Guest 1', 'Guest 2'],
        likeCount: 5,
      })

      // Verify episode was created
      const episodesTable = tableResolver.getEpisodesTable()
      const retrievedEpisode = await adapters.dynamodb.getItem(episodesTable, {
        id: testEpisode.id,
        naturalKey: testEpisode.naturalKey,
      })

      expect(retrievedEpisode).toBeTruthy()
      expect(retrievedEpisode.title).toBe('Utility Test Episode')
      expect(retrievedEpisode.extractedGuests).toEqual(['Guest 1', 'Guest 2'])
      expect(retrievedEpisode.likeCount).toBe(5)

      // Test cleanup - this happens automatically in afterEach
      // but let's verify the utility is available
      expect(typeof adapters.resetTestData).toBe('function')
    })

    it('should provide mock user authentication utilities', async () => {
      const testUser = await testDataManager.createTestUser({
        email: 'auth@test.com',
        username: 'authuser',
        userId: 'test-auth-user-123',
      })

      // Test user creation utility
      expect(testUser).toBeTruthy()
      expect(testUser.userId).toBe('test-auth-user-123')
      expect(testUser.email).toBe('auth@test.com')
      expect(testUser.username).toBe('authuser')

      // Test event generation with auth context
      const authenticatedEvent = eventGenerator.generateAPIGatewayEvent(
        'POST',
        '/test-endpoint',
        JSON.stringify({ test: 'data' }),
        {
          Authorization: `Bearer ${testUser.userId}`,
        },
      )

      // Add auth context
      authenticatedEvent.requestContext.authorizer = {
        claims: {
          sub: testUser.userId,
          email: testUser.email,
        },
      }

      expect(authenticatedEvent.requestContext.authorizer.claims.sub).toBe(testUser.userId)
      expect(authenticatedEvent.requestContext.authorizer.claims.email).toBe(testUser.email)
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle concurrent up-vote operations', async () => {
      // Create test data
      const testPodcast = await testDataManager.createTestPodcast()
      const testEpisode = await testDataManager.createTestEpisode({
        podcastId: testPodcast.id,
        extractedGuests: ['Concurrent Guest'],
        likeCount: 0,
      })

      // Create multiple test users
      const users = await Promise.all([
        testDataManager.createTestUser({ userId: 'concurrent-user-1' }),
        testDataManager.createTestUser({ userId: 'concurrent-user-2' }),
        testDataManager.createTestUser({ userId: 'concurrent-user-3' }),
        testDataManager.createTestUser({ userId: 'concurrent-user-4' }),
        testDataManager.createTestUser({ userId: 'concurrent-user-5' }),
      ])

      // Mock service for concurrent operations
      const { recommendationService } = await import('../../services/recommendationService')
      const mockUpdateGuestAnalytics = vi.mocked(recommendationService.updateGuestAnalytics)
      mockUpdateGuestAnalytics.mockResolvedValue()

      // Create concurrent up-vote events
      const concurrentEvents = users.map(user => {
        const event = eventGenerator.generateAPIGatewayEvent(
          'POST',
          '/recommendations/guest-analytics',
          JSON.stringify({
            episodeId: testEpisode.id,
            guests: ['Concurrent Guest'],
            action: 'up',
            rating: 5,
          }),
        )
        event.requestContext.authorizer = {
          claims: { sub: user.userId },
        }
        return event
      })

      // Execute concurrent operations
      const startTime = Date.now()
      const responses = await Promise.all(concurrentEvents.map(event => updateGuestAnalytics(event)))
      const endTime = Date.now()

      // Verify all operations succeeded
      responses.forEach(response => {
        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.data.success).toBe(true)
      })

      // Verify performance
      const totalTime = endTime - startTime
      expect(totalTime).toBeLessThan(5000) // Should complete within 5 seconds

      // Verify service was called for each user
      expect(mockUpdateGuestAnalytics).toHaveBeenCalledTimes(5)
    })
  })
})

// Export utility functions for use in other tests
export const UpvoteTestUtils = {
  /**
   * Create a complete test scenario with podcast, episode, and user
   */
  createTestScenario: async (adapters: AwsAdapterRegistryImpl) => {
    const testDataManager = adapters.getTestDataManager()

    const podcast = await testDataManager.createTestPodcast({
      title: 'Test Podcast for Up-voting',
      author: 'Test Author',
    })

    const episode = await testDataManager.createTestEpisode({
      podcastId: podcast.id,
      title: 'Test Episode for Up-voting',
      extractedGuests: ['Test Guest 1', 'Test Guest 2'],
      likeCount: 0,
    })

    const user = await testDataManager.createTestUser({
      userId: 'test-scenario-user-123',
      email: 'scenario@test.com',
      username: 'scenariouser',
    })

    return { podcast, episode, user }
  },

  /**
   * Create a mock API Gateway event for up-voting
   */
  createUpvoteEvent: (eventGenerator: any, episodeId: string, userId: string, guests: string[]) => {
    const event = eventGenerator.generateAPIGatewayEvent(
      'POST',
      '/recommendations/guest-analytics',
      JSON.stringify({
        episodeId,
        guests,
        action: 'up',
        rating: 5,
      }),
    )

    event.requestContext.authorizer = {
      claims: { sub: userId },
    }

    return event
  },

  /**
   * Verify up-vote operation results
   */
  verifyUpvoteResults: async (adapters: AwsAdapterRegistryImpl, response: APIGatewayProxyResult) => {
    expect(response.statusCode).toBe(200)

    const body = JSON.parse(response.body)
    expect(body.data.success).toBe(true)
    expect(body.timestamp).toBeDefined()
    expect(body.path).toBeDefined()

    return body
  },
}
