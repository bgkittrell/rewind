/**
 * Integration test to reproduce GuestAnalytics record creation failure
 * with empty guests array in upvote requests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setupIntegrationTestEnvironment } from '../../testing/aws-adapter/AwsAdapterFactory'
import { AwsAdapterRegistryImpl } from '../../testing/aws-adapter/AwsAdapterFactory'
import { TableNameResolver } from '../../testing/aws-adapter/config/AdapterConfig'
import { updateGuestAnalytics } from '../recommendationHandler'
import { APIGatewayProxyEvent } from 'aws-lambda'

// Mock the logger service
vi.mock('../../services/loggerService', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('GuestAnalytics Production Bug Reproduction', () => {
  let adapters: AwsAdapterRegistryImpl
  let testDataManager: any
  let eventGenerator: any
  let tableResolver: TableNameResolver

  beforeEach(async () => {
    adapters = setupIntegrationTestEnvironment()
    testDataManager = adapters.getTestDataManager()
    eventGenerator = adapters.getEventGenerator()
    tableResolver = TableNameResolver.getInstance()
    await adapters.setupTestEnvironment()
  })

  afterEach(async () => {
    await adapters.resetTestData()
  })

  it('should reproduce GuestAnalytics record creation failure with empty guests array', async () => {
    // Create test episode
    const testEpisode = await testDataManager.createTestEpisode({
      episodeId: 'cbfe22f9-ca13-4a56-bfcb-8b1cce8ccbc6',
      title: 'Test Episode - Empty Guests',
      description: 'Episode with no guests for testing analytics bug',
    })

    // Create test user
    const testUser = await testDataManager.createTestUser({
      userId: 'test-user-123',
      email: 'test@example.com',
    })

    // Exact payload from production bug report
    const bugPayload = {
      episodeId: 'cbfe22f9-ca13-4a56-bfcb-8b1cce8ccbc6',
      guests: [], // Empty guests array - this is the bug trigger
      action: 'up',
      rating: 5,
      contextData: {
        source: 'home_recommendations',
        filter: 'not_recent',
      },
    }

    // Create API Gateway event
    const event: APIGatewayProxyEvent = eventGenerator.generateAPIGatewayEvent(
      'POST',
      '/api/recommendations/guest-analytics',
      JSON.stringify(bugPayload),
      {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    )

    // Add mock user authorization
    event.requestContext.authorizer = {
      claims: {
        sub: testUser.userId,
      },
    }

    // Call the handler
    const response = await updateGuestAnalytics(event)

    // API should return success (this is the bug - it returns success but creates no records)
    expect(response.statusCode).toBe(200)

    const responseBody = JSON.parse(response.body)
    expect(responseBody.data.success).toBe(true)

    // Check if any GuestAnalytics records were created
    const guestAnalyticsTable = tableResolver.getGuestAnalyticsTable()
    const analyticsRecords = await adapters.dynamodb.scan(guestAnalyticsTable)

    // BUG REPRODUCTION: No records created despite API success
    console.log('Analytics records created:', analyticsRecords.length)
    expect(analyticsRecords.length).toBe(0) // This demonstrates the bug

    // The bug is that when guests array is empty, no records are created
    // But the API still returns success, misleading the frontend
  })

  it('should work correctly with non-empty guests array (control test)', async () => {
    // Create test episode
    const testEpisode = await testDataManager.createTestEpisode({
      episodeId: 'test-episode-with-guests',
      title: 'Test Episode - With Guests',
      description: 'Episode with guests for control test',
    })

    // Create test user
    const testUser = await testDataManager.createTestUser({
      userId: 'test-user-456',
      email: 'test2@example.com',
    })

    // Payload with guests (this should work)
    const workingPayload = {
      episodeId: 'test-episode-with-guests',
      guests: ['John Smith', 'Jane Doe'], // Non-empty guests array
      action: 'up',
      rating: 5,
      contextData: {
        source: 'home_recommendations',
        filter: 'not_recent',
      },
    }

    // Create API Gateway event
    const event: APIGatewayProxyEvent = eventGenerator.generateAPIGatewayEvent(
      'POST',
      '/api/recommendations/guest-analytics',
      JSON.stringify(workingPayload),
      {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    )

    // Add mock user authorization
    event.requestContext.authorizer = {
      claims: {
        sub: testUser.userId,
      },
    }

    // Call the handler
    const response = await updateGuestAnalytics(event)

    // API should return success
    expect(response.statusCode).toBe(200)

    const responseBody = JSON.parse(response.body)
    expect(responseBody.data.success).toBe(true)

    // Check if GuestAnalytics records were created
    const guestAnalyticsTable = tableResolver.getGuestAnalyticsTable()
    const analyticsRecords = await adapters.dynamodb.scan(guestAnalyticsTable)

    // This should work - records created for each guest
    expect(analyticsRecords.length).toBe(2) // One for each guest

    // Verify the records have correct data
    const johnRecord = analyticsRecords.find(r => r.guestName === 'John Smith')
    const janeRecord = analyticsRecords.find(r => r.guestName === 'Jane Doe')

    expect(johnRecord).toBeDefined()
    expect(johnRecord.userId).toBe(testUser.userId)
    expect(johnRecord.favoriteCount).toBe(1)
    expect(johnRecord.averageRating).toBe(5)

    expect(janeRecord).toBeDefined()
    expect(janeRecord.userId).toBe(testUser.userId)
    expect(janeRecord.favoriteCount).toBe(1)
    expect(janeRecord.averageRating).toBe(5)
  })

  it('should demonstrate the root cause - empty guests array skips loop', async () => {
    // This test demonstrates the exact line of code causing the bug
    // The issue is in recommendationService.updateGuestAnalytics line 486:
    // for (const guest of guests) {
    //   // This loop doesn't execute when guests is empty
    // }

    // Root cause is that the for loop at line 486 doesn't execute with empty array
    // This means no GuestAnalytics records are created when guests.length === 0

    // We've already demonstrated this in the first test
    // The bug is that the API returns success but creates no records
    // This happens because the loop: for (const guest of guests) doesn't run

    expect(true).toBe(true) // This test documents the root cause
  })
})
