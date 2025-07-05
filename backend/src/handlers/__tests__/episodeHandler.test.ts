import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../episodeHandler'
import { rssService } from '../../services/rssService'
import { dynamoService } from '../../services/dynamoService'

// Mock dependencies
vi.mock('../../services/rssService')
vi.mock('../../services/dynamoService')

const mockRssService = vi.mocked(rssService)
const mockDynamoService = vi.mocked(dynamoService)

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
    it('should sync episodes successfully', async () => {
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

      const mockEpisodeData = [
        {
          title: 'Test Episode',
          audioUrl: 'https://example.com/episode.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
          description: 'Test description',
        },
      ]

      const mockSavedEpisodes = [
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
      ]

      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockRssService.parseEpisodesFromFeed.mockResolvedValue(mockEpisodeData)
      mockDynamoService.saveEpisodes.mockResolvedValue(mockSavedEpisodes)

      const event = createMockEvent('POST', '/episodes/test-podcast-id/sync', { podcastId: 'test-podcast-id' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(201)
      expect(mockRssService.parseEpisodesFromFeed).toHaveBeenCalled()
      expect(mockDynamoService.saveEpisodes).toHaveBeenCalled()
    })

    it('should return 404 when podcast not found', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue([])

      const event = createMockEvent('POST', '/episodes/test-podcast-id/sync', { podcastId: 'test-podcast-id' })
      const result = await handler(event as any)

      expect(result.statusCode).toBe(404)
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
})
