import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EpisodeService } from '../episodeService'

// Mock the API client
vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

// Import the mocked module after mocking
import { apiClient } from '../api'
const mockApiClient = vi.mocked(apiClient)

describe('EpisodeService', () => {
  let episodeService: EpisodeService

  beforeEach(() => {
    vi.clearAllMocks()
    episodeService = new EpisodeService()
  })

  describe('getEpisodes', () => {
    it('should fetch episodes successfully', async () => {
      const mockResponse = {
        episodes: [
          {
            episodeId: 'episode-1',
            title: 'Test Episode',
            duration: '30:00',
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

    it('should handle API errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'))

      await expect(episodeService.getEpisodes('podcast-1')).rejects.toThrow('Failed to fetch episodes')
    })
  })

  describe('syncEpisodes', () => {
    it('should sync episodes successfully', async () => {
      const mockResponse = {
        message: 'Episodes synced successfully',
        episodeCount: 5,
        episodes: [],
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await episodeService.syncEpisodes('podcast-1')

      expect(result).toEqual(mockResponse)
      expect(mockApiClient.post).toHaveBeenCalledWith('/episodes/podcast-1/sync')
    })

    it('should handle sync errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Sync failed'))

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

      mockApiClient.put.mockResolvedValue(mockResponse)

      const result = await episodeService.saveProgress('episode-1', 150, 300, 'podcast-1')

      expect(result).toEqual(mockResponse)
      expect(mockApiClient.put).toHaveBeenCalledWith('/episodes/episode-1/progress', {
        position: 150,
        duration: 300,
        podcastId: 'podcast-1',
      })
    })
  })

  describe('getProgress', () => {
    it('should get progress successfully', async () => {
      const mockResponse = {
        position: 150,
        duration: 300,
        progressPercentage: 50,
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await episodeService.getProgress('episode-1')

      expect(result).toEqual(mockResponse)
    })

    it('should return default progress on error', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Not found'))

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
      expect(episodeService.formatDuration(150)).toBe('2:30')
      expect(episodeService.formatDuration(3661)).toBe('61:01')
    })

    it('should parse duration to seconds correctly', () => {
      expect(episodeService.parseDurationToSeconds('2:30')).toBe(150)
      expect(episodeService.parseDurationToSeconds('1:01:01')).toBe(3661)
      expect(episodeService.parseDurationToSeconds('invalid')).toBe(0)
    })

    it('should check if episode is recent', () => {
      const today = new Date().toISOString()
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString() // 31 days ago

      expect(episodeService.isRecentEpisode(today)).toBe(true)
      expect(episodeService.isRecentEpisode(oldDate)).toBe(false)
    })

    it('should format release date correctly', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const result = episodeService.formatReleaseDate(yesterday)

      expect(result).toBe('Yesterday')
    })
  })
})
