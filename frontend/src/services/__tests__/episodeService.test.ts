import { describe, it, expect, vi, beforeEach } from 'vitest'
import { episodeService, Episode } from '../episodeService'
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

const mockApiClient = vi.mocked(apiClient)

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

      const result = await episodeService.getEpisodes('podcast-1', 20)

      expect(result).toEqual(mockResponse)
      expect(mockApiClient.get).toHaveBeenCalledWith('/episodes/podcast-1?limit=20')
    })

    it('should include cursor in request when provided', async () => {
      const mockResponse = {
        episodes: [],
        pagination: {
          hasMore: false,
          limit: 20,
        },
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      await episodeService.getEpisodes('podcast-1', 20, 'cursor-123')

      expect(mockApiClient.get).toHaveBeenCalledWith('/episodes/podcast-1?limit=20&cursor=cursor-123')
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

  describe('fixEpisodeImages', () => {
    it('should fix episode images successfully', async () => {
      const mockResponse = {
        message: 'Episode image URLs fixed successfully',
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await episodeService.fixEpisodeImages('podcast-1')

      expect(result).toEqual(mockResponse)
      expect(mockApiClient.post).toHaveBeenCalledWith('/episodes/podcast-1/fix-images')
    })

    it('should handle fix images errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Fix failed'))

      await expect(episodeService.fixEpisodeImages('podcast-1')).rejects.toThrow('Failed to fix episode images')
    })

    it('should handle network errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Network timeout'))

      await expect(episodeService.fixEpisodeImages('podcast-1')).rejects.toThrow('Failed to fix episode images')
    })

    it('should handle API errors with specific messages', async () => {
      const apiError = new Error('Database connection failed')
      mockApiClient.post.mockRejectedValue(apiError)

      await expect(episodeService.fixEpisodeImages('podcast-1')).rejects.toThrow('Failed to fix episode images')
    })

    it('should handle empty podcast ID', async () => {
      await expect(episodeService.fixEpisodeImages('')).rejects.toThrow('Failed to fix episode images')
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

    it('should handle save progress errors', async () => {
      mockApiClient.put.mockRejectedValue(new Error('Save failed'))

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

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await episodeService.getProgress('episode-1')

      expect(result).toEqual(mockResponse)
      expect(mockApiClient.get).toHaveBeenCalledWith('/episodes/episode-1/progress')
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

  describe('getListeningHistory', () => {
    it('should get listening history successfully', async () => {
      const mockResponse = {
        history: [
          {
            userId: 'user-1',
            episodeId: 'episode-1',
            podcastId: 'podcast-1',
            playbackPosition: 150,
            duration: 300,
            isCompleted: false,
            lastPlayed: '2024-01-01T00:00:00Z',
            firstPlayed: '2024-01-01T00:00:00Z',
            playCount: 1,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await episodeService.getListeningHistory(20)

      expect(result).toEqual(mockResponse)
      expect(mockApiClient.get).toHaveBeenCalledWith('/listening-history?limit=20')
    })

    it('should handle listening history errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Fetch failed'))

      await expect(episodeService.getListeningHistory()).rejects.toThrow('Failed to fetch listening history')
    })
  })

  describe('deleteEpisodes', () => {
    it('should delete episodes successfully', async () => {
      const mockResponse = {
        message: 'Episodes deleted successfully',
      }

      mockApiClient.delete.mockResolvedValue(mockResponse)

      const result = await episodeService.deleteEpisodes('podcast-1')

      expect(result).toEqual(mockResponse)
      expect(mockApiClient.delete).toHaveBeenCalledWith('/episodes/podcast-1')
    })

    it('should handle delete errors', async () => {
      mockApiClient.delete.mockRejectedValue(new Error('Delete failed'))

      await expect(episodeService.deleteEpisodes('podcast-1')).rejects.toThrow('Failed to delete episodes')
    })
  })

  describe('Utility methods', () => {
    describe('formatDuration', () => {
      it('should format duration correctly', () => {
        expect(episodeService.formatDuration(90)).toBe('1:30')
        expect(episodeService.formatDuration(3600)).toBe('60:00')
        expect(episodeService.formatDuration(125)).toBe('2:05')
        expect(episodeService.formatDuration(0)).toBe('0:00')
      })
    })

    describe('parseDurationToSeconds', () => {
      it('should parse MM:SS format', () => {
        expect(episodeService.parseDurationToSeconds('1:30')).toBe(90)
        expect(episodeService.parseDurationToSeconds('60:00')).toBe(3600)
        expect(episodeService.parseDurationToSeconds('2:05')).toBe(125)
      })

      it('should parse HH:MM:SS format', () => {
        expect(episodeService.parseDurationToSeconds('1:30:00')).toBe(5400)
        expect(episodeService.parseDurationToSeconds('2:15:30')).toBe(8130)
      })

      it('should return 0 for invalid formats', () => {
        expect(episodeService.parseDurationToSeconds('invalid')).toBe(0)
        expect(episodeService.parseDurationToSeconds('')).toBe(0)
      })
    })

    describe('isRecentEpisode', () => {
      it('should identify recent episodes', () => {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        expect(episodeService.isRecentEpisode(yesterday.toISOString())).toBe(true)

        const twoWeeksAgo = new Date()
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
        expect(episodeService.isRecentEpisode(twoWeeksAgo.toISOString())).toBe(true)

        const twoMonthsAgo = new Date()
        twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60)
        expect(episodeService.isRecentEpisode(twoMonthsAgo.toISOString())).toBe(false)
      })
    })

    describe('formatReleaseDate', () => {
      it('should format release dates correctly', () => {
        // Use fixed time to avoid timing issues with Math.ceil
        vi.useFakeTimers()
        const mockDate = new Date('2024-01-15T12:00:00Z')
        vi.setSystemTime(mockDate)

        const yesterday = new Date('2024-01-14T12:00:00Z')
        const threeDaysAgo = new Date('2024-01-12T12:00:00Z')
        const twoWeeksAgo = new Date('2024-01-01T12:00:00Z')

        expect(episodeService.formatReleaseDate(yesterday.toISOString())).toBe('Yesterday')
        expect(episodeService.formatReleaseDate(threeDaysAgo.toISOString())).toBe('3 days ago')
        expect(episodeService.formatReleaseDate(twoWeeksAgo.toISOString())).toBe('2 weeks ago')

        // Restore real time
        vi.useRealTimers()
      })
    })
  })

  describe('getEpisodeByIdWithPodcast', () => {
    it('should fetch episode by podcastId and episodeId', async () => {
      const mockEpisode: Episode = {
        episodeId: 'ep123',
        podcastId: 'pod123',
        title: 'Test Episode',
        description: 'Test Description',
        audioUrl: 'http://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2024-01-01',
        imageUrl: 'http://example.com/image.jpg',
        guests: ['Guest 1'],
        tags: ['tag1'],
        createdAt: '2024-01-01T00:00:00Z',
        naturalKey: 'test-natural-key',
      }

      const get = vi.fn().mockResolvedValue(mockEpisode)
      vi.spyOn(apiClient, 'get').mockImplementation(get)

      const result = await episodeService.getEpisodeByIdWithPodcast('pod123', 'ep123')

      expect(get).toHaveBeenCalledWith('/episodes/pod123/ep123')
      expect(result).toEqual(mockEpisode)
    })

    it('should throw error when getEpisodeByIdWithPodcast fails', async () => {
      const get = vi.fn().mockRejectedValue(new Error('Network error'))
      vi.spyOn(apiClient, 'get').mockImplementation(get)

      await expect(episodeService.getEpisodeByIdWithPodcast('pod123', 'ep123')).rejects.toThrow(
        'Failed to fetch episode',
      )
    })
  })
})
