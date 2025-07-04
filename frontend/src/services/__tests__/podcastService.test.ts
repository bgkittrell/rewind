import { describe, it, expect, vi, beforeEach } from 'vitest'
import { podcastService } from '../podcastService'
import { apiClient } from '../api'

// Mock the API client
vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('PodcastService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPodcasts', () => {
    it('should fetch podcasts successfully', async () => {
      const mockResponse = {
        podcasts: [
          {
            podcastId: 'test-id',
            title: 'Test Podcast',
            description: 'Test description',
            imageUrl: 'https://example.com/image.jpg',
            episodeCount: 5,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
            userId: 'user-123',
            rssUrl: 'https://example.com/rss',
          },
        ],
        total: 1,
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await podcastService.getPodcasts()

      expect(apiClient.get).toHaveBeenCalledWith('/podcasts')
      expect(result).toEqual(mockResponse)
    })

    it('should handle API errors gracefully', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'))

      await expect(podcastService.getPodcasts()).rejects.toThrow('Failed to fetch podcasts')
    })
  })

  describe('addPodcast', () => {
    it('should add a podcast successfully', async () => {
      const mockResponse = {
        podcastId: 'new-podcast-id',
        title: 'New Podcast',
        message: 'Podcast added successfully',
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await podcastService.addPodcast({ rssUrl: 'https://example.com/rss' })

      expect(apiClient.post).toHaveBeenCalledWith('/podcasts', {
        rssUrl: 'https://example.com/rss',
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle add podcast errors', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Invalid RSS URL'))

      await expect(podcastService.addPodcast({ rssUrl: 'invalid-url' })).rejects.toThrow('Failed to add podcast')
    })
  })

  describe('deletePodcast', () => {
    it('should delete a podcast successfully', async () => {
      const mockResponse = {
        message: 'Podcast deleted successfully',
      }

      vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

      const result = await podcastService.deletePodcast('test-podcast-id')

      expect(apiClient.delete).toHaveBeenCalledWith('/podcasts/test-podcast-id')
      expect(result).toEqual(mockResponse)
    })

    it('should handle delete podcast errors', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(new Error('Podcast not found'))

      await expect(podcastService.deletePodcast('nonexistent-id')).rejects.toThrow('Failed to delete podcast')
    })
  })
})