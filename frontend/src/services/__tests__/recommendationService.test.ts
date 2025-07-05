import { describe, it, expect, vi, beforeEach } from 'vitest'
import { recommendationService } from '../recommendationService'
import { apiClient } from '../api'

// Mock the API client
vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('RecommendationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRecommendations', () => {
    it('should fetch recommendations successfully', async () => {
      const mockRecommendations = [
        {
          episodeId: 'ep-123',
          episode: {
            episodeId: 'ep-123',
            podcastId: 'pod-456',
            title: 'Test Episode',
            description: 'Test description',
            audioUrl: 'https://example.com/audio.mp3',
            duration: '45:30',
            releaseDate: '2023-01-15T08:00:00Z',
            podcastName: 'Test Podcast',
            extractedGuests: ['John Doe'],
          },
          score: 0.85,
          reasons: ["You've been listening to this show recently"],
          factors: {
            recentShowListening: 0.8,
            newEpisodeBonus: 0.0,
            rediscoveryBonus: 0.6,
            guestMatchBonus: 0.9,
            favoriteBonus: 0.7,
          },
        },
      ]

      vi.mocked(apiClient.get).mockResolvedValue(mockRecommendations)

      const result = await recommendationService.getRecommendations({ limit: 10 })

      expect(apiClient.get).toHaveBeenCalledWith('/recommendations', { limit: 10 })
      expect(result).toEqual(mockRecommendations)
    })

    it('should handle filters correctly', async () => {
      vi.mocked(apiClient.get).mockResolvedValue([])

      await recommendationService.getRecommendations({
        limit: 20,
        not_recent: true,
        favorites: true,
      })

      expect(apiClient.get).toHaveBeenCalledWith('/recommendations', {
        limit: 20,
        not_recent: 'true',
        favorites: 'true',
      })
    })

    it('should handle API errors gracefully', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'))

      await expect(recommendationService.getRecommendations()).rejects.toThrow('Network error')
    })
  })

  describe('extractGuests', () => {
    it('should extract guests successfully', async () => {
      const mockResponse = {
        episodeId: 'ep-123',
        extractedGuests: ['John Doe', 'Jane Smith'],
        confidence: 0.95,
        extractedAt: '2024-01-15T10:30:00Z',
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const request = {
        episodeId: 'ep-123',
        title: 'Episode with John Doe',
        description: 'A great conversation with comedian John Doe',
      }

      const result = await recommendationService.extractGuests(request)

      expect(apiClient.post).toHaveBeenCalledWith('/recommendations/extract-guests', request)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('batchExtractGuests', () => {
    it('should batch extract guests successfully', async () => {
      const mockResponse = {
        results: [
          {
            episodeId: 'ep-123',
            extractedGuests: ['John Doe'],
            confidence: 0.95,
            extractedAt: '2024-01-15T10:30:00Z',
          },
        ],
        processed: 1,
        failed: 0,
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const request = {
        episodes: [
          {
            episodeId: 'ep-123',
            title: 'Episode with John Doe',
            description: 'A great conversation',
          },
        ],
      }

      const result = await recommendationService.batchExtractGuests(request)

      expect(apiClient.post).toHaveBeenCalledWith('/recommendations/batch-extract-guests', request)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('feedback methods', () => {
    beforeEach(() => {
      // Mock the private getEpisodeDetails method
      vi.spyOn(recommendationService as any, 'getEpisodeDetails').mockResolvedValue({
        episodeId: 'ep-123',
        extractedGuests: ['John Doe'],
      })
    })

    it('should submit thumbs up feedback', async () => {
      const mockResponse = { message: 'Feedback recorded', updated: true }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await recommendationService.thumbsUp('ep-123', { source: 'test' })

      expect(apiClient.post).toHaveBeenCalledWith('/recommendations/guest-analytics', {
        episodeId: 'ep-123',
        guests: ['John Doe'],
        action: 'up',
        rating: 5,
        contextData: { source: 'test' },
      })
      expect(result).toEqual(mockResponse)
    })

    it('should submit thumbs down feedback', async () => {
      const mockResponse = { message: 'Feedback recorded', updated: true }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await recommendationService.thumbsDown('ep-123')

      expect(apiClient.post).toHaveBeenCalledWith('/recommendations/guest-analytics', {
        episodeId: 'ep-123',
        guests: ['John Doe'],
        action: 'down',
        rating: 1,
        contextData: undefined,
      })
      expect(result).toEqual(mockResponse)
    })

    it('should track play events', async () => {
      const mockResponse = { message: 'Event tracked', updated: true }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await recommendationService.trackPlay('ep-123', { filter: 'comedy' })

      expect(apiClient.post).toHaveBeenCalledWith('/recommendations/guest-analytics', {
        episodeId: 'ep-123',
        guests: ['John Doe'],
        action: 'played',
        rating: undefined,
        contextData: { filter: 'comedy' },
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle feedback submission errors', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Server error'))

      await expect(recommendationService.thumbsUp('ep-123')).rejects.toThrow('Server error')
    })
  })

  describe('service instantiation', () => {
    it('should export a service instance', () => {
      expect(recommendationService).toBeDefined()
      expect(typeof recommendationService.getRecommendations).toBe('function')
      expect(typeof recommendationService.thumbsUp).toBe('function')
      expect(typeof recommendationService.thumbsDown).toBe('function')
    })
  })
})
