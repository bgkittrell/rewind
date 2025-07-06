import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resumeService, ResumeService } from '../resumeService'
import { apiClient } from '../api'

// Mock the API client
vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

const mockApiClient = vi.mocked(apiClient)

describe('ResumeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the service state
    resumeService.clearResumeData()
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ResumeService.getInstance()
      const instance2 = ResumeService.getInstance()
      expect(instance1).toBe(instance2)
      expect(instance1).toBe(resumeService)
    })
  })

  describe('getResumeData', () => {
    it('should fetch and return resume data successfully', async () => {
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

      mockApiClient.get.mockResolvedValue(mockResumeData)

      const result = await resumeService.getResumeData()

      expect(mockApiClient.get).toHaveBeenCalledWith('/resume')
      expect(result).toEqual(mockResumeData)
      expect(resumeService.getCurrentResumeData()).toEqual(mockResumeData)
      expect(resumeService.hasResumeData()).toBe(true)
    })

    it('should handle null response from API', async () => {
      mockApiClient.get.mockResolvedValue(null)

      const result = await resumeService.getResumeData()

      expect(result).toBeNull()
      expect(resumeService.getCurrentResumeData()).toBeNull()
      expect(resumeService.hasResumeData()).toBe(false)
    })

    it('should handle API errors gracefully', async () => {
      mockApiClient.get.mockRejectedValue(new Error('API Error'))

      const result = await resumeService.getResumeData()

      expect(result).toBeNull()
      expect(resumeService.getCurrentResumeData()).toBeNull()
      expect(resumeService.hasResumeData()).toBe(false)
    })
  })

  describe('clearResumeData', () => {
    it('should clear resume data', async () => {
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
      }

      mockApiClient.get.mockResolvedValue(mockResumeData)
      await resumeService.getResumeData()

      expect(resumeService.hasResumeData()).toBe(true)

      await resumeService.clearResumeData()

      expect(resumeService.hasResumeData()).toBe(false)
      expect(resumeService.getCurrentResumeData()).toBeNull()
    })
  })

  describe('listeners and notifications', () => {
    it('should notify listeners when data changes', async () => {
      const listener = vi.fn()
      const unsubscribe = resumeService.subscribe(listener)

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
      }

      mockApiClient.get.mockResolvedValue(mockResumeData)

      await resumeService.getResumeData()

      expect(listener).toHaveBeenCalledTimes(2) // Loading state + success state
      expect(listener).toHaveBeenCalledWith({
        data: null,
        isLoading: true,
        error: null,
      })
      expect(listener).toHaveBeenCalledWith({
        data: mockResumeData,
        isLoading: false,
        error: null,
      })

      unsubscribe()
    })

    it('should notify listeners on error', async () => {
      const listener = vi.fn()
      const unsubscribe = resumeService.subscribe(listener)

      mockApiClient.get.mockRejectedValue(new Error('API Error'))

      await resumeService.getResumeData()

      expect(listener).toHaveBeenCalledWith({
        data: null,
        isLoading: false,
        error: 'Failed to fetch resume data',
      })

      unsubscribe()
    })

    it('should remove listener when unsubscribed', async () => {
      const listener = vi.fn()
      const unsubscribe = resumeService.subscribe(listener)

      unsubscribe()

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
      }

      mockApiClient.get.mockResolvedValue(mockResumeData)
      await resumeService.getResumeData()

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('state management', () => {
    it('should correctly track has resume data state', async () => {
      expect(resumeService.hasResumeData()).toBe(false)

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
      }

      mockApiClient.get.mockResolvedValue(mockResumeData)
      await resumeService.getResumeData()

      expect(resumeService.hasResumeData()).toBe(true)

      await resumeService.clearResumeData()

      expect(resumeService.hasResumeData()).toBe(false)
    })

    it('should return current resume data correctly', async () => {
      expect(resumeService.getCurrentResumeData()).toBeNull()

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
      }

      mockApiClient.get.mockResolvedValue(mockResumeData)
      await resumeService.getResumeData()

      expect(resumeService.getCurrentResumeData()).toEqual(mockResumeData)
    })
  })
})
