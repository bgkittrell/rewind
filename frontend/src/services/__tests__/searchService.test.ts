import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SearchService } from '../searchService'
import apiClient from '../api'

// Mock the API client - need to mock both named and default exports
vi.mock('../api', () => {
  const mockApiClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
  return {
    apiClient: mockApiClient,
    default: mockApiClient,
  }
})

const mockApiClient = vi.mocked(apiClient)

describe('SearchService', () => {
  let searchService: SearchService

  beforeEach(() => {
    vi.clearAllMocks()
    searchService = new SearchService()
  })

  describe('searchEpisodes', () => {
    it('should search episodes successfully', async () => {
      const mockResponse = {
        results: [
          {
            episode: {
              episodeId: 'episode-1',
              podcastId: 'podcast-1',
              title: 'Test Episode',
              description: 'Test description',
              audioUrl: 'https://example.com/audio.mp3',
              duration: '30:00',
              releaseDate: '2024-01-01T00:00:00Z',
              imageUrl: 'https://example.com/image.jpg',
              extractedGuests: ['Guest 1'],
            },
            podcast: {
              podcastId: 'podcast-1',
              title: 'Test Podcast',
              imageUrl: 'https://example.com/podcast.jpg',
            },
            relevance: {
              score: 0.95,
              matchedFields: ['title'],
              highlights: {
                title: 'Test <mark>Episode</mark>',
              },
            },
          },
        ],
        total: 1,
        hasMore: false,
        searchTime: 0.123,
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await searchService.searchEpisodes('episode')

      expect(result).toEqual(mockResponse)
      expect(mockApiClient.get).toHaveBeenCalledWith('/search', {
        q: 'episode',
        limit: 20,
        offset: 0,
      })
    })

    it('should handle search with filters and pagination', async () => {
      const mockResponse = {
        results: [],
        total: 0,
        hasMore: false,
        searchTime: 0.05,
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const filters = { podcastId: 'podcast-1' }
      const pagination = { limit: 10, offset: 20 }

      await searchService.searchEpisodes('test', filters, pagination)

      expect(mockApiClient.get).toHaveBeenCalledWith('/search', {
        q: 'test',
        limit: 10,
        offset: 20,
        podcastId: 'podcast-1',
      })
    })

    it('should return empty results for short queries', async () => {
      const result = await searchService.searchEpisodes('a')

      expect(result).toEqual({
        results: [],
        total: 0,
        hasMore: false,
        searchTime: 0,
      })
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should return empty results for empty queries', async () => {
      const result = await searchService.searchEpisodes('')

      expect(result).toEqual({
        results: [],
        total: 0,
        hasMore: false,
        searchTime: 0,
      })
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should handle API errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'))

      await expect(searchService.searchEpisodes('test')).rejects.toThrow('Network error')
    })

    it('should trim search queries', async () => {
      const mockResponse = {
        results: [],
        total: 0,
        hasMore: false,
        searchTime: 0.05,
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      await searchService.searchEpisodes('  test query  ')

      expect(mockApiClient.get).toHaveBeenCalledWith('/search', {
        q: 'test query',
        limit: 20,
        offset: 0,
      })
    })
  })

  describe('searchWithDebounce', () => {
    it('should debounce search calls', async () => {
      const mockResponse = {
        results: [],
        total: 0,
        hasMore: false,
        searchTime: 0.05,
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      // Test with minimal debounce time
      const promise = searchService.searchWithDebounce('test', {}, {}, 10)

      // Should not be called immediately
      expect(mockApiClient.get).not.toHaveBeenCalled()

      // Wait for debounce
      await promise

      expect(mockApiClient.get).toHaveBeenCalledWith('/search', {
        q: 'test',
        limit: 20,
        offset: 0,
      })
    })
  })

  describe('convertToEpisodeCard', () => {
    it('should convert search result to episode card format', () => {
      const searchResult = {
        episode: {
          episodeId: 'episode-1',
          podcastId: 'podcast-1',
          title: 'Test Episode',
          description: 'Test description',
          audioUrl: 'https://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
          imageUrl: 'https://example.com/episode.jpg',
          extractedGuests: ['Guest 1'],
        },
        podcast: {
          podcastId: 'podcast-1',
          title: 'Test Podcast',
          imageUrl: 'https://example.com/podcast.jpg',
        },
        relevance: {
          score: 0.95,
          matchedFields: ['title'],
          highlights: {
            title: 'Test <mark>Episode</mark>',
          },
        },
      }

      const result = searchService.convertToEpisodeCard(searchResult)

      expect(result).toEqual({
        id: 'episode-1',
        title: 'Test Episode',
        podcastName: 'Test Podcast',
        releaseDate: '2024-01-01T00:00:00Z',
        duration: '30:00',
        audioUrl: 'https://example.com/audio.mp3',
        imageUrl: 'https://example.com/episode.jpg',
        description: 'Test description',
        podcastId: 'podcast-1',
        relevanceScore: 0.95,
        matchedFields: ['title'],
        highlights: {
          title: 'Test <mark>Episode</mark>',
        },
      })
    })

    it('should use podcast image when episode image is not available', () => {
      const searchResult = {
        episode: {
          episodeId: 'episode-1',
          podcastId: 'podcast-1',
          title: 'Test Episode',
          description: 'Test description',
          audioUrl: 'https://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
          extractedGuests: [],
        },
        podcast: {
          podcastId: 'podcast-1',
          title: 'Test Podcast',
          imageUrl: 'https://example.com/podcast.jpg',
        },
        relevance: {
          score: 0.95,
          matchedFields: ['title'],
          highlights: {},
        },
      }

      const result = searchService.convertToEpisodeCard(searchResult)

      expect(result.imageUrl).toBe('https://example.com/podcast.jpg')
    })
  })

  describe('formatHighlights', () => {
    it('should format highlights correctly', () => {
      const highlights = {
        title: 'Test <mark>Episode</mark>',
        description: 'A <mark>test</mark> description',
      }

      const result = searchService.formatHighlights(highlights)

      expect(result).toEqual([
        { field: 'title', text: 'Test <mark>Episode</mark>' },
        { field: 'description', text: 'A <mark>test</mark> description' },
      ])
    })

    it('should handle empty highlights', () => {
      const result = searchService.formatHighlights({})

      expect(result).toEqual([])
    })
  })
})
