import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../episodeHandler'
import { rssService } from '../../services/rssService'
import { dynamoService } from '../../services/dynamoService'
import { sqsService } from '../../services/sqsService'

// Mock dependencies
vi.mock('../../services/rssService')
vi.mock('../../services/dynamoService')
vi.mock('../../services/sqsService')
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

const mockRssService = vi.mocked(rssService)
const mockDynamoService = vi.mocked(dynamoService)
const mockSqsService = vi.mocked(sqsService)

describe('EpisodeHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockEvent = (method: string, path: string, pathParams?: any, body?: string) => ({
    httpMethod: method,
    path,
    pathParameters: pathParams,
    body,
    requestContext: {
      authorizer: {
        claims: {
          sub: 'test-user-id',
        },
      },
    },
    queryStringParameters: null,
  })

  describe('CORS preflight', () => {
    it('should handle OPTIONS request', async () => {
      const event = createMockEvent('OPTIONS', '/episodes/test-podcast-id')
      const result = await handler(event as any)

      expect(result.statusCode).toBe(200)
      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin')
    })
  })

  describe('Authentication', () => {
    it('should return 401 when user ID is missing', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/episodes/test-podcast-id',
        requestContext: {
          authorizer: {
            claims: {},
          },
        },
      }

      const result = await handler(event as any)
      expect(result.statusCode).toBe(401)
    })
  })

  describe('GET /episodes/{podcastId}', () => {
    it('should return episodes successfully', async () => {
      const mockEpisodes = {
        episodes: [
          {
            episodeId: 'episode-1',
            podcastId: 'test-podcast-id',
            title: 'Test Episode',
            description: 'Test description',
            audioUrl: 'https://example.com/episode.mp3',
            duration: '30:00',
            releaseDate: '2024-01-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        lastEvaluatedKey: undefined,
      }

      mockDynamoService.getEpisodesByPodcast.mockResolvedValue(mockEpisodes)

      const event = createMockEvent('GET', '/episodes/test-podcast-id', { podcastId: 'test-podcast-id' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(200)
      expect(mockDynamoService.getEpisodesByPodcast).toHaveBeenCalledWith('test-podcast-id', 20, undefined)
    })

    it('should return 404 when podcast ID is missing', async () => {
      const event = createMockEvent('GET', '/episodes/', {})
      const result = await handler(event as any)

      expect(result.statusCode).toBe(404)
    })
  })

  describe('POST /episodes/{podcastId}/sync', () => {
    it('should queue episode sync successfully', async () => {
      const mockPodcasts = [
        {
          podcastId: 'test-podcast-id',
          userId: 'test-user-id',
          title: 'Test Podcast',
          description: 'Test podcast description',
          rssUrl: 'https://example.com/feed.xml',
          imageUrl: 'https://example.com/image.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:00:00Z',
          episodeCount: 1,
        },
      ]

      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.updatePodcastSyncStatus.mockResolvedValue(undefined)
      mockSqsService.sendEpisodeSyncMessage.mockResolvedValue(undefined)

      const event = createMockEvent('POST', '/episodes/test-podcast-id/sync', { podcastId: 'test-podcast-id' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(202)
      expect(mockDynamoService.updatePodcastSyncStatus).toHaveBeenCalledWith(
        'test-user-id',
        'test-podcast-id',
        'queued',
      )
      expect(mockSqsService.sendEpisodeSyncMessage).toHaveBeenCalledWith({
        podcastId: 'test-podcast-id',
        userId: 'test-user-id',
        rssUrl: 'https://example.com/feed.xml',
        timestamp: expect.any(String),
      })

      const responseBody = JSON.parse(result.body)
      expect(responseBody.data.message).toBe('Episode sync has been queued for processing')
      expect(responseBody.data.status).toBe('queued')
    })

    it('should return 404 when podcast not found', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue([])

      const event = createMockEvent('POST', '/episodes/test-podcast-id/sync', { podcastId: 'test-podcast-id' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(404)
    })
  })

  describe('POST /episodes/{podcastId}/sync-status', () => {
    it('should get sync status successfully', async () => {
      const mockPodcasts = [
        {
          podcastId: 'test-podcast-id',
          userId: 'test-user-id',
          title: 'Test Podcast',
          description: 'Test podcast description',
          rssUrl: 'https://example.com/feed.xml',
          imageUrl: 'https://example.com/image.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:00:00Z',
          episodeCount: 1,
        },
      ]

      const mockSyncStatus = {
        podcastId: 'test-podcast-id',
        userId: 'test-user-id',
        episodeSyncStatus: 'completed',
        episodeSyncStartedAt: '2024-01-01T11:00:00Z',
        episodeSyncCompletedAt: '2024-01-01T12:00:00Z',
        lastEpisodeCount: 25,
        episodeCount: 25,
      }

      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getPodcastSyncStatus.mockResolvedValue(mockSyncStatus)

      const event = createMockEvent('POST', '/episodes/test-podcast-id/sync-status', { podcastId: 'test-podcast-id' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(200)
      expect(mockDynamoService.getPodcastSyncStatus).toHaveBeenCalledWith('test-user-id', 'test-podcast-id')

      const responseBody = JSON.parse(result.body)
      expect(responseBody.data.podcastId).toBe('test-podcast-id')
      expect(responseBody.data.syncStatus).toBe('completed')
      expect(responseBody.data.startedAt).toBe('2024-01-01T11:00:00Z')
      expect(responseBody.data.completedAt).toBe('2024-01-01T12:00:00Z')
      expect(responseBody.data.episodeCount).toBe(25)
    })

    it('should return 404 when podcast not found', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue([])

      const event = createMockEvent('POST', '/episodes/test-podcast-id/sync-status', { podcastId: 'test-podcast-id' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(404)
    })

    it('should return 404 when sync status not found', async () => {
      const mockPodcasts = [
        {
          podcastId: 'test-podcast-id',
          userId: 'test-user-id',
          title: 'Test Podcast',
          description: 'Test podcast description',
          rssUrl: 'https://example.com/feed.xml',
          imageUrl: 'https://example.com/image.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:00:00Z',
          episodeCount: 1,
        },
      ]

      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getPodcastSyncStatus.mockResolvedValue(null)

      const event = createMockEvent('POST', '/episodes/test-podcast-id/sync-status', { podcastId: 'test-podcast-id' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(404)
    })

    it('should return 400 when podcast ID is missing', async () => {
      const event = createMockEvent('POST', '/episodes//sync-status', {})
      const result = await handler(event as any)

      expect(result.statusCode).toBe(400)
      const responseBody = JSON.parse(result.body)
      expect(responseBody.error.message).toBe('Podcast ID is required')
    })
  })

  describe('POST /episodes/{podcastId}/fix-images', () => {
    it('should fix episode images successfully', async () => {
      const mockPodcasts = [
        {
          podcastId: 'test-podcast-id',
          userId: 'test-user-id',
          title: 'Test Podcast',
          description: 'Test podcast description',
          rssUrl: 'https://example.com/feed.xml',
          imageUrl: 'https://example.com/image.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:00:00Z',
          episodeCount: 1,
        },
      ]

      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.fixEpisodeImageUrls.mockResolvedValue(undefined)

      const event = createMockEvent('POST', '/episodes/test-podcast-id/fix-images', { podcastId: 'test-podcast-id' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(200)
      expect(mockDynamoService.getPodcastsByUser).toHaveBeenCalledWith('test-user-id')
      expect(mockDynamoService.fixEpisodeImageUrls).toHaveBeenCalledWith('test-podcast-id')

      const responseBody = JSON.parse(result.body)
      expect(responseBody.data.message).toBe('Episode image URLs fixed successfully')
    })

    it('should return 400 when podcast ID is missing', async () => {
      const event = createMockEvent('POST', '/episodes//fix-images', {})
      const result = await handler(event as any)

      expect(result.statusCode).toBe(400)
      const responseBody = JSON.parse(result.body)
      expect(responseBody.error.message).toBe('Podcast ID is required')
    })

    it('should return 404 when podcast not found', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue([])

      const event = createMockEvent('POST', '/episodes/test-podcast-id/fix-images', { podcastId: 'test-podcast-id' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(404)
      const responseBody = JSON.parse(result.body)
      expect(responseBody.error.message).toBe('Podcast not found or access denied')
    })

    it('should return 404 when podcast does not belong to user', async () => {
      const mockPodcasts = [
        {
          podcastId: 'other-podcast-id',
          userId: 'test-user-id',
          title: 'Other Podcast',
          description: 'Other podcast description',
          rssUrl: 'https://example.com/other-feed.xml',
          imageUrl: 'https://example.com/other-image.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:00:00Z',
          episodeCount: 1,
        },
      ]

      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)

      const event = createMockEvent('POST', '/episodes/test-podcast-id/fix-images', { podcastId: 'test-podcast-id' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(404)
      const responseBody = JSON.parse(result.body)
      expect(responseBody.error.message).toBe('Podcast not found or access denied')
    })

    it('should return 500 when DynamoDB operation fails', async () => {
      const mockPodcasts = [
        {
          podcastId: 'test-podcast-id',
          userId: 'test-user-id',
          title: 'Test Podcast',
          description: 'Test podcast description',
          rssUrl: 'https://example.com/feed.xml',
          imageUrl: 'https://example.com/image.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:00:00Z',
          episodeCount: 1,
        },
      ]

      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.fixEpisodeImageUrls.mockRejectedValue(new Error('Database error'))

      const event = createMockEvent('POST', '/episodes/test-podcast-id/fix-images', { podcastId: 'test-podcast-id' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(500)
      const responseBody = JSON.parse(result.body)
      expect(responseBody.error.message).toBe('Failed to fix episode image URLs')
    })

    it('should handle authorization errors', async () => {
      mockDynamoService.getPodcastsByUser.mockRejectedValue(new Error('Access denied'))

      const event = createMockEvent('POST', '/episodes/test-podcast-id/fix-images', { podcastId: 'test-podcast-id' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(500)
      const responseBody = JSON.parse(result.body)
      expect(responseBody.error.message).toBe('Failed to fix episode image URLs')
    })
  })

  describe('PUT /episodes/{episodeId}/progress', () => {
    it('should save progress successfully', async () => {
      const progressData = {
        position: 150,
        duration: 300,
        podcastId: 'test-podcast-id',
      }

      mockDynamoService.savePlaybackProgress.mockResolvedValue(undefined)

      const event = createMockEvent(
        'PUT',
        '/episodes/episode-1/progress',
        { episodeId: 'episode-1' },
        JSON.stringify(progressData),
      )
      const result = await handler(event as any)

      expect(result.statusCode).toBe(200)
      expect(mockDynamoService.savePlaybackProgress).toHaveBeenCalledWith(
        'test-user-id',
        'episode-1',
        'test-podcast-id',
        150,
        300,
      )
    })

    it('should return 400 for invalid data', async () => {
      const event = createMockEvent(
        'PUT',
        '/episodes/episode-1/progress',
        { episodeId: 'episode-1' },
        JSON.stringify({ position: 'invalid' }),
      )
      const result = await handler(event as any)

      expect(result.statusCode).toBe(400)
    })
  })

  describe('GET /episodes/{episodeId}/progress', () => {
    it('should return progress successfully', async () => {
      const mockProgress = {
        position: 150,
        duration: 300,
      }

      mockDynamoService.getPlaybackProgress.mockResolvedValue(mockProgress)

      const event = createMockEvent('GET', '/episodes/episode-1/progress', { episodeId: 'episode-1' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(200)
      expect(mockDynamoService.getPlaybackProgress).toHaveBeenCalledWith('test-user-id', 'episode-1')
    })

    it('should return default progress when none exists', async () => {
      mockDynamoService.getPlaybackProgress.mockResolvedValue(null)

      const event = createMockEvent('GET', '/episodes/episode-1/progress', { episodeId: 'episode-1' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(200)
      const responseBody = JSON.parse(result.body)
      expect(responseBody.data.position).toBe(0)
    })
  })

  describe('GET /resume', () => {
    it('should return resume data when available', async () => {
      const mockResumeData = {
        episodeId: 'episode-1',
        podcastId: 'podcast-1',
        title: 'Test Episode',
        podcastTitle: 'Test Podcast',
        playbackPosition: 150,
        duration: 300,
        lastPlayed: '2024-01-15T10:30:00Z',
        progressPercentage: 50,
        audioUrl: 'https://example.com/audio.mp3',
        imageUrl: 'https://example.com/image.jpg',
        podcastImageUrl: 'https://example.com/podcast-image.jpg',
      }

      mockDynamoService.getLastPlayedEpisode.mockResolvedValue(mockResumeData)

      const event = createMockEvent('GET', '/resume')
      const result = await handler(event as any)

      expect(result.statusCode).toBe(200)
      expect(mockDynamoService.getLastPlayedEpisode).toHaveBeenCalledWith('test-user-id')

      const responseBody = JSON.parse(result.body)
      expect(responseBody.data).toEqual(mockResumeData)
    })

    it('should return null when no resume data available', async () => {
      mockDynamoService.getLastPlayedEpisode.mockResolvedValue(null)

      const event = createMockEvent('GET', '/resume')
      const result = await handler(event as any)

      expect(result.statusCode).toBe(200)
      expect(mockDynamoService.getLastPlayedEpisode).toHaveBeenCalledWith('test-user-id')

      const responseBody = JSON.parse(result.body)
      expect(responseBody.data).toBeNull()
    })

    it('should handle errors gracefully', async () => {
      mockDynamoService.getLastPlayedEpisode.mockRejectedValue(new Error('Database error'))

      const event = createMockEvent('GET', '/resume')
      const result = await handler(event as any)

      expect(result.statusCode).toBe(500)
      const responseBody = JSON.parse(result.body)
      expect(responseBody.error.message).toBe('Failed to get resume data')
    })

    it('should require authentication', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/resume',
        requestContext: {
          authorizer: {
            claims: {},
          },
        },
      }

      const result = await handler(event as any)
      expect(result.statusCode).toBe(401)
    })
  })

  describe('Error handling', () => {
    it('should handle unexpected errors', async () => {
      mockDynamoService.getEpisodesByPodcast.mockRejectedValue(new Error('Database error'))

      const event = createMockEvent('GET', '/episodes/test-podcast-id', { podcastId: 'test-podcast-id' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(500)
    })
  })

  describe('Unsupported methods', () => {
    it('should return 405 for unsupported HTTP methods', async () => {
      const event = createMockEvent('PATCH', '/episodes/test-podcast-id')
      const result = await handler(event as any)

      expect(result.statusCode).toBe(405)
    })
  })

  describe('GET /episodes/{episodeId} - Individual episode', () => {
    it('should find episode by searching through all user podcasts', async () => {
      const mockPodcasts = [
        {
          podcastId: 'podcast1',
          userId: 'test-user-id',
          title: 'Test Podcast 1',
          description: 'Test podcast description',
          rssUrl: 'https://example.com/feed1.xml',
          imageUrl: 'https://example.com/image1.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:00:00Z',
          episodeCount: 5,
        },
        {
          podcastId: 'podcast2',
          userId: 'test-user-id',
          title: 'Test Podcast 2',
          description: 'Another podcast description',
          rssUrl: 'https://example.com/feed2.xml',
          imageUrl: 'https://example.com/image2.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:00:00Z',
          episodeCount: 3,
        },
      ]

      const mockEpisode = {
        episodeId: 'episode123',
        podcastId: 'podcast2',
        title: 'Test Episode',
        description: 'Test Description',
        audioUrl: 'http://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z',
        naturalKey: 'test-natural-key',
      }

      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      // batchGetEpisodeById returns the episode
      mockDynamoService.batchGetEpisodeById = vi.fn().mockResolvedValue(mockEpisode)

      const event = createMockEvent('GET', '/episodes/episode123', { episodeId: 'episode123' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body.data).toEqual(mockEpisode)
      expect(mockDynamoService.getPodcastsByUser).toHaveBeenCalledWith('test-user-id')
      expect(mockDynamoService.batchGetEpisodeById).toHaveBeenCalledWith(['podcast1', 'podcast2'], 'episode123')
    })

    it('should return 404 when episode not found in any podcast', async () => {
      const mockPodcasts = [
        {
          podcastId: 'podcast1',
          userId: 'test-user-id',
          title: 'Test Podcast',
          description: 'Test podcast description',
          rssUrl: 'https://example.com/feed.xml',
          imageUrl: 'https://example.com/image.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:00:00Z',
          episodeCount: 5,
        },
      ]

      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.batchGetEpisodeById = vi.fn().mockResolvedValue(null)

      const event = createMockEvent('GET', '/episodes/episode123', { episodeId: 'episode123' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(404)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Episode not found or access denied')
    })
  })

  describe('GET /episodes/{podcastId}/{episodeId} - Direct episode lookup', () => {
    it('should get episode by podcast and episode ID when user owns podcast', async () => {
      const mockPodcasts = [
        {
          podcastId: 'podcast1',
          userId: 'test-user-id',
          title: 'Test Podcast',
          description: 'Test podcast description',
          rssUrl: 'https://example.com/feed1.xml',
          imageUrl: 'https://example.com/image1.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:00:00Z',
          episodeCount: 5,
        },
        {
          podcastId: 'podcast2',
          userId: 'test-user-id',
          title: 'Another Podcast',
          description: 'Another podcast description',
          rssUrl: 'https://example.com/feed2.xml',
          imageUrl: 'https://example.com/image2.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:00:00Z',
          episodeCount: 3,
        },
      ]

      const mockEpisode = {
        episodeId: 'episode123',
        podcastId: 'podcast1',
        title: 'Test Episode',
        description: 'Test Description',
        audioUrl: 'http://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z',
        naturalKey: 'test-natural-key',
      }

      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodeById.mockResolvedValue(mockEpisode)

      const event = createMockEvent('GET', '/episodes/podcast1/episode123', {
        podcastId: 'podcast1',
        episodeId: 'episode123',
      })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body.data).toEqual(mockEpisode)
      expect(mockDynamoService.getPodcastsByUser).toHaveBeenCalledWith('test-user-id')
      expect(mockDynamoService.getEpisodeById).toHaveBeenCalledWith('podcast1', 'episode123')
    })

    it('should return 404 when user does not own the podcast', async () => {
      const mockPodcasts = [
        {
          podcastId: 'podcast2',
          userId: 'test-user-id',
          title: 'Another Podcast',
          description: 'Another podcast description',
          rssUrl: 'https://example.com/feed2.xml',
          imageUrl: 'https://example.com/image2.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:00:00Z',
          episodeCount: 3,
        },
      ]

      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)

      const event = createMockEvent('GET', '/episodes/podcast1/episode123', {
        podcastId: 'podcast1',
        episodeId: 'episode123',
      })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(404)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Podcast not found or access denied')
      expect(mockDynamoService.getEpisodeById).not.toHaveBeenCalled()
    })

    it('should return 404 when episode not found in podcast', async () => {
      const mockPodcasts = [
        {
          podcastId: 'podcast1',
          userId: 'test-user-id',
          title: 'Test Podcast',
          description: 'Test podcast description',
          rssUrl: 'https://example.com/feed1.xml',
          imageUrl: 'https://example.com/image1.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:00:00Z',
          episodeCount: 5,
        },
      ]

      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodeById.mockResolvedValue(null)

      const event = createMockEvent('GET', '/episodes/podcast1/episode123', {
        podcastId: 'podcast1',
        episodeId: 'episode123',
      })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(404)
      const body = JSON.parse(result.body)
      expect(body.error.message).toBe('Episode not found or access denied')
    })
  })
})
