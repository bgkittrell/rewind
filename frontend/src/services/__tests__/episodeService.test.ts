import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EpisodeService } from '../episodeService'
import { APIError } from '../api'

// Mock the API client
vi.mock('../api', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  APIError: vi.fn(),
}))

const mockApiClient = vi.mocked(await import('../api')).apiClient

describe('EpisodeService', () => {
  let episodeService: EpisodeService

  beforeEach(() => {
    vi.clearAllMocks()
    episodeService = new EpisodeService()
  })

  describe('syncEpisodes', () => {
    it('should sync episodes successfully', async () => {
      const mockResponse = {
        message: 'Episodes synced successfully',
        episodeCount: 5,
        episodes: [
          {
            episodeId: 'episode-1',
            podcastId: 'podcast-1',
            title: 'Test Episode',
            description: 'Test description',
            audioUrl: 'https://example.com/audio.mp3',
            duration: '30:00',
            releaseDate: '2024-01-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await episodeService.syncEpisodes('podcast-1')

      expect(result).toEqual(mockResponse)
      expect(mockApiClient.post).toHaveBeenCalledWith('/episodes/podcast-1/sync')
    })

    it('should handle network errors during sync', async () => {
      const networkError = new Error('Network error')
      mockApiClient.post.mockRejectedValue(networkError)

      await expect(episodeService.syncEpisodes('podcast-1')).rejects.toThrow('Failed to sync episodes')
    })

    it('should handle authentication errors during sync', async () => {
      const authError = new APIError('Unauthorized', 'UNAUTHORIZED', 401)
      mockApiClient.post.mockRejectedValue(authError)

      await expect(episodeService.syncEpisodes('podcast-1')).rejects.toThrow('Failed to sync episodes')
    })

    it('should handle invalid podcast ID', async () => {
      const notFoundError = new APIError('Podcast not found', 'NOT_FOUND', 404)
      mockApiClient.post.mockRejectedValue(notFoundError)

      await expect(episodeService.syncEpisodes('invalid-podcast')).rejects.toThrow('Failed to sync episodes')
    })

    it('should handle RSS parsing errors', async () => {
      const rssError = new APIError('Failed to parse RSS feed', 'RSS_PARSE_ERROR', 400)
      mockApiClient.post.mockRejectedValue(rssError)

      await expect(episodeService.syncEpisodes('podcast-1')).rejects.toThrow('Failed to sync episodes')
    })

    it('should handle server errors during sync', async () => {
      const serverError = new APIError('Internal server error', 'INTERNAL_ERROR', 500)
      mockApiClient.post.mockRejectedValue(serverError)

      await expect(episodeService.syncEpisodes('podcast-1')).rejects.toThrow('Failed to sync episodes')
    })

    it('should handle missing podcast ID', async () => {
      await expect(episodeService.syncEpisodes('')).rejects.toThrow('Failed to sync episodes')
    })

    it('should handle empty response', async () => {
      const emptyResponse = {
        message: 'No episodes found in RSS feed',
        episodeCount: 0,
        episodes: [],
      }

      mockApiClient.post.mockResolvedValue(emptyResponse)

      const result = await episodeService.syncEpisodes('podcast-1')

      expect(result).toEqual(emptyResponse)
      expect(result.episodeCount).toBe(0)
    })

    it('should handle malformed API response', async () => {
      const malformedResponse = {
        // Missing required fields
        message: 'Episodes synced successfully',
      }

      mockApiClient.post.mockResolvedValue(malformedResponse)

      const result = await episodeService.syncEpisodes('podcast-1')

      expect(result).toEqual(malformedResponse)
    })
  })

  describe('getEpisodes', () => {
    it('should fetch episodes successfully', async () => {
      const mockResponse = {
        episodes: [
          {
            episodeId: 'episode-1',
            podcastId: 'podcast-1',
            title: 'Test Episode',
            description: 'Test description',
            audioUrl: 'https://example.com/audio.mp3',
            duration: '30:00',
            releaseDate: '2024-01-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        pagination: {
          hasMore: false,
          limit: 20,
        },
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await episodeService.getEpisodes('podcast-1')

      expect(result).toEqual(mockResponse)
      expect(mockApiClient.get).toHaveBeenCalledWith('/episodes/podcast-1?limit=20')
    })

    it('should handle pagination correctly', async () => {
      const mockResponse = {
        episodes: [],
        pagination: {
          hasMore: true,
          nextCursor: 'cursor-123',
          limit: 10,
        },
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await episodeService.getEpisodes('podcast-1', 10, 'cursor-123')

      expect(result).toEqual(mockResponse)
      expect(mockApiClient.get).toHaveBeenCalledWith('/episodes/podcast-1?limit=10&cursor=cursor-123')
    })
  })

  describe('Utility methods', () => {
    it('should format duration correctly', () => {
      expect(episodeService.formatDuration(125)).toBe('2:05')
      expect(episodeService.formatDuration(3665)).toBe('61:05')
      expect(episodeService.formatDuration(0)).toBe('0:00')
    })

    it('should parse duration to seconds correctly', () => {
      expect(episodeService.parseDurationToSeconds('2:05')).toBe(125)
      expect(episodeService.parseDurationToSeconds('1:30:45')).toBe(5445)
      expect(episodeService.parseDurationToSeconds('invalid')).toBe(0)
    })

    it('should identify recent episodes', () => {
      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 10)
      
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 50)

      expect(episodeService.isRecentEpisode(recentDate.toISOString())).toBe(true)
      expect(episodeService.isRecentEpisode(oldDate.toISOString())).toBe(false)
    })
  })
})
