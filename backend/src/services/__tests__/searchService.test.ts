import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SearchService } from '../searchService'
import { DynamoService } from '../dynamoService'
import { Episode, Podcast } from '../../types'
import { SearchQuery } from '../../types/search'

// Mock the dependencies
vi.mock('../dynamoService')
vi.mock('../../utils/searchUtils', async () => {
  const actual = await vi.importActual('../../utils/searchUtils')
  return {
    ...actual,
    createSearchContext: vi.fn((query: string) => ({
      query,
      terms: query.toLowerCase().split(' '),
      normalizedTerms: query.toLowerCase().split(' '),
    })),
  }
})

describe('SearchService', () => {
  let searchService: SearchService
  let mockDynamoService: any

  // Mock data
  const mockPodcasts: Podcast[] = [
    {
      podcastId: 'pod1',
      userId: 'user1',
      title: 'Tech Podcast',
      description: 'A podcast about technology',
      rssUrl: 'http://example.com/tech.rss',
      imageUrl: 'http://example.com/tech.jpg',
      createdAt: '2024-01-01T00:00:00Z',
      lastUpdated: '2024-01-15T00:00:00Z',
      episodeCount: 10,
    },
    {
      podcastId: 'pod2',
      userId: 'user1',
      title: 'Science Show',
      description: 'Exploring science topics',
      rssUrl: 'http://example.com/science.rss',
      imageUrl: 'http://example.com/science.jpg',
      createdAt: '2024-01-01T00:00:00Z',
      lastUpdated: '2024-01-15T00:00:00Z',
      episodeCount: 5,
    },
  ]

  const mockEpisodes: Episode[] = [
    {
      episodeId: 'ep1',
      podcastId: 'pod1',
      title: 'Machine Learning Basics',
      description: 'An introduction to machine learning concepts and algorithms',
      audioUrl: 'http://example.com/ep1.mp3',
      duration: '45:00',
      releaseDate: new Date().toISOString(),
      imageUrl: 'http://example.com/ep1.jpg',
      extractedGuests: ['Dr. John Smith'],
      tags: ['technology', 'AI'],
      createdAt: '2024-01-10T00:00:00Z',
      naturalKey: 'key1',
    },
    {
      episodeId: 'ep2',
      podcastId: 'pod1',
      title: 'Deep Learning Deep Dive',
      description: 'Advanced topics in deep learning and neural networks',
      audioUrl: 'http://example.com/ep2.mp3',
      duration: '60:00',
      releaseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      imageUrl: 'http://example.com/ep2.jpg',
      extractedGuests: ['Prof. Jane Doe'],
      createdAt: '2024-01-05T00:00:00Z',
      naturalKey: 'key2',
    },
    {
      episodeId: 'ep3',
      podcastId: 'pod2',
      title: 'Quantum Physics Explained',
      description: 'Understanding quantum mechanics in simple terms',
      audioUrl: 'http://example.com/ep3.mp3',
      duration: '30:00',
      releaseDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      createdAt: '2023-12-15T00:00:00Z',
      naturalKey: 'key3',
    },
  ]

  beforeEach(() => {
    // Clear cache before each test
    vi.clearAllMocks()

    // Create mock DynamoService
    mockDynamoService = {
      getPodcastsByUser: vi.fn(),
      getEpisodesByPodcast: vi.fn(),
    }

    // Create SearchService with mocked dependencies
    searchService = new SearchService(mockDynamoService as any)
  })

  afterEach(() => {
    // Clear cache after each test
    searchService.clearUserCache('user1')
    searchService.clearUserCache('user2')
  })

  describe('searchEpisodes', () => {
    it('should return empty results for empty query', async () => {
      const result = await searchService.searchEpisodes('user1', { query: '' })

      expect(result).toEqual({
        results: [],
        total: 0,
        hasMore: false,
        searchTime: 0,
      })
      expect(mockDynamoService.getPodcastsByUser).not.toHaveBeenCalled()
    })

    it('should return empty results for query too short', async () => {
      const result = await searchService.searchEpisodes('user1', { query: 'a' })

      expect(result).toEqual({
        results: [],
        total: 0,
        hasMore: false,
        searchTime: 0,
      })
    })

    it('should throw error for query too long', async () => {
      const longQuery = 'a'.repeat(101)

      await expect(searchService.searchEpisodes('user1', { query: longQuery })).rejects.toThrow('Search query too long')
    })

    it('should search across all user episodes', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast
        .mockResolvedValueOnce({ episodes: mockEpisodes.filter(e => e.podcastId === 'pod1') })
        .mockResolvedValueOnce({ episodes: mockEpisodes.filter(e => e.podcastId === 'pod2') })

      const result = await searchService.searchEpisodes('user1', { query: 'machine learning' })

      expect(mockDynamoService.getPodcastsByUser).toHaveBeenCalledWith('user1')
      expect(mockDynamoService.getEpisodesByPodcast).toHaveBeenCalledTimes(2)
      expect(result.results.length).toBeGreaterThan(0)
      expect(result.results[0].episode.title).toContain('Machine Learning')
      expect(result.searchTime).toBeGreaterThan(0)
    })

    it('should search within specific podcast when podcastId provided', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast.mockResolvedValue({
        episodes: mockEpisodes.filter(e => e.podcastId === 'pod1'),
      })

      const result = await searchService.searchEpisodes('user1', {
        query: 'machine',
        podcastId: 'pod1',
      })

      expect(mockDynamoService.getEpisodesByPodcast).toHaveBeenCalledWith('pod1', 1000)
      expect(mockDynamoService.getEpisodesByPodcast).toHaveBeenCalledTimes(1) // Only called once
      expect(result.results.length).toBeGreaterThan(0)
    })

    it('should properly paginate results', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast
        .mockResolvedValueOnce({ episodes: mockEpisodes.filter(e => e.podcastId === 'pod1') })
        .mockResolvedValueOnce({ episodes: mockEpisodes.filter(e => e.podcastId === 'pod2') })

      // First page
      const page1 = await searchService.searchEpisodes('user1', {
        query: 'learning',
        limit: 1,
        offset: 0,
      })

      expect(page1.results.length).toBe(1)
      expect(page1.hasMore).toBe(true)
      expect(page1.total).toBeGreaterThan(1)

      // Second page
      const page2 = await searchService.searchEpisodes('user1', {
        query: 'learning',
        limit: 1,
        offset: 1,
      })

      expect(page2.results.length).toBe(1)
      expect(page2.results[0].episode.episodeId).not.toBe(page1.results[0].episode.episodeId)
    })

    it('should respect max limit', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast
        .mockResolvedValueOnce({ episodes: mockEpisodes })
        .mockResolvedValueOnce({ episodes: [] })

      const result = await searchService.searchEpisodes('user1', {
        query: 'episode',
        limit: 200, // Over max
      })

      expect(result.results.length).toBeLessThanOrEqual(100) // Max limit
    })

    it('should include relevance scores and highlights', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast.mockResolvedValue({
        episodes: [mockEpisodes[0]],
      })

      const result = await searchService.searchEpisodes('user1', { query: 'machine' })

      expect(result.results[0].relevance).toBeDefined()
      expect(result.results[0].relevance.score).toBeGreaterThan(0)
      expect(result.results[0].relevance.matchedFields).toContain('title')
      expect(result.results[0].relevance.highlights.title).toContain('<mark>')
    })

    it('should match guest names', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast.mockResolvedValue({
        episodes: mockEpisodes.filter(e => e.extractedGuests),
      })

      const result = await searchService.searchEpisodes('user1', { query: 'john smith' })

      expect(result.results.length).toBeGreaterThan(0)
      expect(result.results[0].relevance.matchedFields).toContain('extractedGuests')
    })

    it('should match tags', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast.mockResolvedValue({
        episodes: mockEpisodes.filter(e => e.tags),
      })

      const result = await searchService.searchEpisodes('user1', { query: 'technology' })

      expect(result.results.length).toBeGreaterThan(0)
      expect(result.results[0].relevance.matchedFields).toContain('tags')
    })

    it('should handle episodes without optional fields', async () => {
      const minimalEpisode: Episode = {
        episodeId: 'ep-minimal',
        podcastId: 'pod1',
        title: 'Minimal Episode',
        description: 'Just the basics',
        audioUrl: 'http://example.com/minimal.mp3',
        duration: '10:00',
        releaseDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        naturalKey: 'minimal-key',
      }

      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast
        .mockResolvedValueOnce({ episodes: [minimalEpisode] }) // pod1
        .mockResolvedValueOnce({ episodes: [] }) // pod2

      const result = await searchService.searchEpisodes('user1', { query: 'minimal' })

      expect(result.results.length).toBe(1)
      expect(result.results[0].episode.episodeId).toBe('ep-minimal')
    })

    it('should clean episode and podcast data for response', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast.mockResolvedValue({
        episodes: [mockEpisodes[0]],
      })

      const result = await searchService.searchEpisodes('user1', { query: 'machine' })

      // Check cleaned podcast data
      expect(result.results[0].podcast).toHaveProperty('podcastId')
      expect(result.results[0].podcast).toHaveProperty('title')
      expect(result.results[0].podcast).toHaveProperty('imageUrl')
      expect(result.results[0].podcast).not.toHaveProperty('userId')
      expect(result.results[0].podcast).not.toHaveProperty('rssUrl')

      // Check episode doesn't have search-specific fields
      expect(result.results[0].episode).not.toHaveProperty('podcastTitle')
      expect(result.results[0].episode).not.toHaveProperty('searchableText')
    })
  })

  describe('caching', () => {
    it('should cache episode results', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast
        .mockResolvedValueOnce({ episodes: mockEpisodes.filter(e => e.podcastId === 'pod1') })
        .mockResolvedValueOnce({ episodes: mockEpisodes.filter(e => e.podcastId === 'pod2') })

      // First search
      await searchService.searchEpisodes('user1', { query: 'machine' })
      expect(mockDynamoService.getEpisodesByPodcast).toHaveBeenCalledTimes(2)

      // Clear mocks
      vi.clearAllMocks()

      // Second search with same user - should use cache
      await searchService.searchEpisodes('user1', { query: 'learning' })
      expect(mockDynamoService.getEpisodesByPodcast).not.toHaveBeenCalled()
    })

    it('should cache podcast results separately', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast.mockResolvedValue({ episodes: [] })

      // First search - will call getPodcastsByUser twice (once in getUserEpisodes, once in getUserPodcasts)
      await searchService.searchEpisodes('user1', { query: 'test' })
      expect(mockDynamoService.getPodcastsByUser).toHaveBeenCalledTimes(2) // Called in both getUserEpisodes and getUserPodcasts
      expect(mockDynamoService.getEpisodesByPodcast).toHaveBeenCalledTimes(2) // For both podcasts

      // Clear mocks
      vi.clearAllMocks()

      // Second search - should use cached podcasts
      await searchService.searchEpisodes('user1', { query: 'another' })
      expect(mockDynamoService.getPodcastsByUser).not.toHaveBeenCalled()
      expect(mockDynamoService.getEpisodesByPodcast).not.toHaveBeenCalled() // Episodes also cached
    })

    it('should have separate cache for different users', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast.mockResolvedValue({ episodes: [] })

      // Search for user1 - will call getPodcastsByUser twice
      await searchService.searchEpisodes('user1', { query: 'test' })
      expect(mockDynamoService.getPodcastsByUser).toHaveBeenCalledWith('user1')
      expect(mockDynamoService.getPodcastsByUser).toHaveBeenCalledTimes(2) // Called in both getUserEpisodes and getUserPodcasts

      // Search for user2 - should not use user1's cache
      await searchService.searchEpisodes('user2', { query: 'test' })
      expect(mockDynamoService.getPodcastsByUser).toHaveBeenCalledWith('user2')
      expect(mockDynamoService.getPodcastsByUser).toHaveBeenCalledTimes(4) // 2 calls per user x 2 users
      expect(mockDynamoService.getEpisodesByPodcast).toHaveBeenCalledTimes(4) // 2 podcasts x 2 users
    })

    it('should have separate cache for different podcast filters', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast.mockResolvedValue({ episodes: mockEpisodes })

      // Search all podcasts
      await searchService.searchEpisodes('user1', { query: 'test' })
      expect(mockDynamoService.getEpisodesByPodcast).toHaveBeenCalledTimes(2)

      vi.clearAllMocks()

      // Search specific podcast - should not use general cache
      await searchService.searchEpisodes('user1', { query: 'test', podcastId: 'pod1' })
      expect(mockDynamoService.getEpisodesByPodcast).toHaveBeenCalledTimes(1)
    })

    it('should clear user cache correctly', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast.mockResolvedValue({ episodes: [] })

      // First search to populate cache
      await searchService.searchEpisodes('user1', { query: 'test' })
      vi.clearAllMocks()

      // Clear cache
      searchService.clearUserCache('user1')

      // Next search should hit database again
      await searchService.searchEpisodes('user1', { query: 'test' })
      expect(mockDynamoService.getPodcastsByUser).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle DynamoDB errors gracefully', async () => {
      mockDynamoService.getPodcastsByUser.mockRejectedValue(new Error('DynamoDB error'))

      await expect(searchService.searchEpisodes('user1', { query: 'test' })).rejects.toThrow('DynamoDB error')
    })

    it('should handle empty podcast list', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue([])

      const result = await searchService.searchEpisodes('user1', { query: 'test' })

      expect(result.results).toEqual([])
      expect(result.total).toBe(0)
      expect(result.hasMore).toBe(false)
    })

    it('should handle malformed episodes gracefully', async () => {
      const malformedEpisode = {
        ...mockEpisodes[0],
        podcastId: 'non-existent-podcast',
      }

      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast.mockResolvedValue({
        episodes: [malformedEpisode],
      })

      // Should not throw, but episode won't have podcast info
      const result = await searchService.searchEpisodes('user1', { query: 'machine' })
      expect(result.results.length).toBe(0) // Won't match because podcast not found
    })
  })

  describe('performance', () => {
    it('should execute podcast queries in parallel', async () => {
      let callOrder: number[] = []

      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast.mockImplementation(async podcastId => {
        // Track call order
        callOrder.push(podcastId === 'pod1' ? 1 : 2)
        // Simulate async delay
        await new Promise(resolve => setTimeout(resolve, 10))
        return { episodes: mockEpisodes.filter(e => e.podcastId === podcastId) }
      })

      const startTime = Date.now()
      await searchService.searchEpisodes('user1', { query: 'test' })
      const endTime = Date.now()

      // Both calls should have been made
      expect(callOrder).toContain(1)
      expect(callOrder).toContain(2)

      // Should take less time than sequential (would be 20ms+)
      expect(endTime - startTime).toBeLessThan(20)
    })

    it('should calculate search time correctly', async () => {
      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast.mockResolvedValue({ episodes: mockEpisodes })

      const result = await searchService.searchEpisodes('user1', { query: 'test' })

      expect(result.searchTime).toBeGreaterThanOrEqual(0)
      expect(result.searchTime).toBeLessThan(1) // Should be fast (less than 1 second)
    })
  })

  describe('search relevance', () => {
    it('should rank title matches higher than description matches', async () => {
      const episodes: Episode[] = [
        {
          ...mockEpisodes[0],
          episodeId: 'ep-desc',
          title: 'Random Episode',
          description: 'This is about machine learning',
        },
        {
          ...mockEpisodes[0],
          episodeId: 'ep-title',
          title: 'Machine Learning Episode',
          description: 'Random description',
        },
      ]

      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast
        .mockResolvedValueOnce({ episodes }) // pod1
        .mockResolvedValueOnce({ episodes: [] }) // pod2

      const result = await searchService.searchEpisodes('user1', { query: 'machine learning' })

      // Title match should rank higher
      expect(result.results.length).toBe(2)
      expect(result.results[0].episode.episodeId).toBe('ep-title')
      expect(result.results[0].relevance.score).toBeGreaterThan(result.results[1].relevance.score)
    })

    it('should give bonus for recent episodes', async () => {
      const today = new Date()
      const oldDate = new Date()
      oldDate.setFullYear(oldDate.getFullYear() - 1)

      const episodes: Episode[] = [
        {
          ...mockEpisodes[0],
          episodeId: 'ep-old',
          title: 'Machine Learning',
          releaseDate: oldDate.toISOString(),
        },
        {
          ...mockEpisodes[0],
          episodeId: 'ep-new',
          title: 'Machine Learning',
          releaseDate: today.toISOString(),
        },
      ]

      mockDynamoService.getPodcastsByUser.mockResolvedValue(mockPodcasts)
      mockDynamoService.getEpisodesByPodcast.mockResolvedValue({ episodes })

      const result = await searchService.searchEpisodes('user1', { query: 'machine' })

      // Recent episode should rank higher
      expect(result.results[0].episode.episodeId).toBe('ep-new')
    })
  })
})
