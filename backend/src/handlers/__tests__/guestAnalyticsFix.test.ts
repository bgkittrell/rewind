/**
 * Test for GuestAnalytics fix - validates that episodes without guests
 * still create analytics records when users interact with them
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { recommendationService } from '../../services/recommendationService'
import { logger } from '../../services/loggerService'

// Mock the DynamoDB client
const mockSend = vi.fn()
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: mockSend,
    })),
  },
  GetCommand: vi.fn(),
  UpdateCommand: vi.fn(),
  QueryCommand: vi.fn(),
  PutCommand: vi.fn(),
}))

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(),
}))

vi.mock('../../services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('GuestAnalytics Fix - Empty Guests Array', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create analytics record for episode without guests', async () => {
    // Mock episode fetch to return episode with empty guests
    mockSend.mockResolvedValueOnce({
      Item: {
        episodeId: 'test-episode-123',
        title: 'Test Episode',
        guests: [], // Empty guests array
        extractedGuests: [], // Empty extracted guests
      },
    })

    // Mock the analytics update
    mockSend.mockResolvedValueOnce({})

    await recommendationService.updateGuestAnalytics(
      'user-123',
      'test-episode-123',
      [], // Empty guests from request
      'up',
      5,
    )

    // Verify episode was fetched
    expect(mockSend).toHaveBeenCalledTimes(2)

    // Verify analytics record was created with special episode key
    const updateCall = mockSend.mock.calls[1][0]
    expect(updateCall.input.Key).toEqual({
      userId: 'user-123',
      guestName: '_episode_test-episode-123',
    })

    expect(updateCall.input.UpdateExpression).toContain('favoriteCount')
    expect(updateCall.input.ExpressionAttributeValues[':rating']).toBe(5)
  })

  it('should use extractedGuests if available', async () => {
    // Mock episode fetch to return episode with extractedGuests
    mockSend.mockResolvedValueOnce({
      Item: {
        episodeId: 'test-episode-456',
        title: 'Test Episode with Extracted Guests',
        guests: [], // Empty manual guests
        extractedGuests: ['John Doe', 'Jane Smith'], // AI extracted guests
      },
    })

    // Mock the analytics updates (one for each guest)
    mockSend.mockResolvedValueOnce({})
    mockSend.mockResolvedValueOnce({})

    await recommendationService.updateGuestAnalytics(
      'user-456',
      'test-episode-456',
      [], // Empty guests from request
      'up',
      5,
    )

    // Verify episode was fetched + 2 guest updates
    expect(mockSend).toHaveBeenCalledTimes(3)

    // Verify analytics records were created for each extracted guest
    const johnUpdate = mockSend.mock.calls[1][0]
    const janeUpdate = mockSend.mock.calls[2][0]

    expect(johnUpdate.input.Key.guestName).toBe('John Doe')
    expect(janeUpdate.input.Key.guestName).toBe('Jane Smith')
  })

  it('should fallback to request guests if episode fetch fails', async () => {
    // Mock episode fetch to fail
    mockSend.mockRejectedValueOnce(new Error('Episode not found'))

    // Mock the analytics update
    mockSend.mockResolvedValueOnce({})

    await recommendationService.updateGuestAnalytics(
      'user-789',
      'missing-episode',
      ['Fallback Guest'], // Guests from request
      'up',
      5,
    )

    // Verify episode fetch failed, then analytics update succeeded
    expect(mockSend).toHaveBeenCalledTimes(2)

    // Verify fallback guest was used
    const updateCall = mockSend.mock.calls[1][0]
    expect(updateCall.input.Key.guestName).toBe('Fallback Guest')

    // Verify warning was logged
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch episode missing-episode'),
      expect.any(Error),
    )
  })

  it('should create episode record when fallback guests are also empty', async () => {
    // Mock episode fetch to fail
    mockSend.mockRejectedValueOnce(new Error('Episode not found'))

    // Mock the analytics update
    mockSend.mockResolvedValueOnce({})

    await recommendationService.updateGuestAnalytics(
      'user-999',
      'missing-episode-no-guests',
      [], // Empty fallback guests
      'up',
      5,
    )

    // Verify episode fetch failed, then analytics update succeeded
    expect(mockSend).toHaveBeenCalledTimes(2)

    // Verify special episode key was used
    const updateCall = mockSend.mock.calls[1][0]
    expect(updateCall.input.Key).toEqual({
      userId: 'user-999',
      guestName: '_episode_missing-episode-no-guests',
    })
  })
})
