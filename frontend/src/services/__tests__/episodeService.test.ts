import { describe, it, expect, vi, beforeEach } from 'vitest'
import { episodeService } from '../episodeService'
import { apiClient } from '../api'

// Mock the API client
vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('EpisodeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
            releaseDate: '2023-01-01T00:00:00Z',
            createdAt: '2023-01-01T00:00:00Z',
          },
        ],
        pagination: {
          hasMore: false,
          nextCursor: undefined,
          limit: 20,
        },
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await episodeService.getEpisodes('podcast-1', 20)

      expect(apiClient.get).toHaveBeenCalledWith('/episodes/podcast-1?limit=20')
      expect(result).toEqual(mockResponse)
    })

    it('should handle API errors gracefully', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'))

      await expect(episodeService.getEpisodes('podcast-1')).rejects.toThrow('Failed to fetch episodes')
    })

    it('should include cursor in API call when provided', async () => {
      const mockResponse = {
        episodes: [],
        pagination: {
          hasMore: false,
          nextCursor: undefined,
          limit: 20,
        },
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      await episodeService.getEpisodes('podcast-1', 20, 'cursor-123')

      expect(apiClient.get).toHaveBeenCalledWith('/episodes/podcast-1?limit=20&cursor=cursor-123')
    })
  })

  describe('syncEpisodes', () => {
    it('should sync episodes successfully', async () => {
      const mockResponse = {
        message: 'Episodes synced successfully',
        episodeCount: 5,
        episodes: [],
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await episodeService.syncEpisodes('podcast-1')

      expect(apiClient.post).toHaveBeenCalledWith('/episodes/podcast-1/sync')
      expect(result).toEqual(mockResponse)
    })

    it('should handle sync errors', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Sync failed'))

      await expect(episodeService.syncEpisodes('podcast-1')).rejects.toThrow('Failed to sync episodes')
    })
  })

  describe('saveProgress', () => {
    it('should save progress successfully', async () => {
      const mockResponse = {
        position: 150,
        duration: 300,
        progressPercentage: 50,
      }

      vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

      const result = await episodeService.saveProgress('episode-1', 150, 300, 'podcast-1')

      expect(apiClient.put).toHaveBeenCalledWith('/episodes/episode-1/progress', {
        position: 150,
        duration: 300,
        podcastId: 'podcast-1',
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle save progress errors', async () => {
      vi.mocked(apiClient.put).mockRejectedValue(new Error('Save failed'))

      await expect(episodeService.saveProgress('episode-1', 150, 300, 'podcast-1')).rejects.toThrow(
        'Failed to save progress',
      )
    })
  })

  describe('getProgress', () => {
    it('should get progress successfully', async () => {
      const mockResponse = {
        position: 150,
        duration: 300,
        progressPercentage: 50,
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await episodeService.getProgress('episode-1')

      expect(apiClient.get).toHaveBeenCalledWith('/episodes/episode-1/progress')
      expect(result).toEqual(mockResponse)
    })

    it('should return default progress on error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Not found'))

      const result = await episodeService.getProgress('episode-1')

      expect(result).toEqual({
        position: 0,
        duration: 0,
        progressPercentage: 0,
      })
    })
  })

  describe('utility methods', () => {
    it('should format duration correctly', () => {
      expect(episodeService.formatDuration(90)).toBe('1:30')
      expect(episodeService.formatDuration(3661)).toBe('61:01')
      expect(episodeService.formatDuration(0)).toBe('0:00')
    })

    it('should parse duration to seconds correctly', () => {
      expect(episodeService.parseDurationToSeconds('1:30')).toBe(90)
      expect(episodeService.parseDurationToSeconds('1:01:30')).toBe(3690)
      expect(episodeService.parseDurationToSeconds('0:00')).toBe(0)
      expect(episodeService.parseDurationToSeconds('invalid')).toBe(0)
    })

    it('should check if episode is recent', () => {
      const now = new Date()
      const recent = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
      const old = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) // 45 days ago

      expect(episodeService.isRecentEpisode(recent.toISOString())).toBe(true)
      expect(episodeService.isRecentEpisode(old.toISOString())).toBe(false)
    })

    it('should format release date correctly', () => {
      // Use a very old date to avoid timing edge cases
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

      const oneWeekResult = episodeService.formatReleaseDate(oneWeekAgo.toISOString())
      const twoWeeksResult = episodeService.formatReleaseDate(twoWeeksAgo.toISOString())

      // Test that it formats weeks correctly (more predictable than days)
      expect(oneWeekResult).toBe('1 week ago')
      expect(twoWeeksResult).toBe('2 weeks ago')
    })
  })
})
