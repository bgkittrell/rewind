import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { DynamoService } from '../services/dynamoService'
import { SearchService } from '../services/searchService'

// Set up environment variables
beforeAll(() => {
  process.env.PODCASTS_TABLE = 'RewindPodcasts'
  process.env.EPISODES_TABLE = 'RewindEpisodes'
})

describe('Simple Search Test', () => {
  it('should search episodes without mocking AWS SDK', async () => {
    // Create a mock DynamoService
    const mockDynamoService = {
      getPodcastsByUser: vi.fn().mockResolvedValue([
        {
          podcastId: 'pod1',
          userId: 'user1',
          title: 'Test Podcast',
          description: 'Test description',
          rssUrl: 'http://example.com/rss',
          imageUrl: 'http://example.com/image.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:00:00Z',
          episodeCount: 1,
        },
      ]),
      getEpisodesByPodcast: vi.fn().mockResolvedValue({
        episodes: [
          {
            episodeId: 'ep1',
            podcastId: 'pod1',
            title: 'Machine Learning Episode',
            description: 'About machine learning',
            audioUrl: 'http://example.com/audio.mp3',
            duration: '30:00',
            releaseDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            naturalKey: 'key1',
          },
        ],
      }),
    }

    // Create search service with mocked dynamo service
    const searchService = new SearchService(mockDynamoService as any)

    // Perform search
    const result = await searchService.searchEpisodes('user1', { query: 'machine' })

    // Check results
    expect(result.results.length).toBe(1)
    expect(result.results[0].episode.title).toBe('Machine Learning Episode')
    expect(mockDynamoService.getPodcastsByUser).toHaveBeenCalledWith('user1')
    expect(mockDynamoService.getEpisodesByPodcast).toHaveBeenCalledWith('pod1', 1000)
  })
})
