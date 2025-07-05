import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DynamoDBClient, QueryCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

// Mock AWS SDK
vi.mock('@aws-sdk/client-dynamodb')
vi.mock('@aws-sdk/util-dynamodb')

const mockDynamoClient = {
  send: vi.fn(),
}

const mockMarshall = vi.mocked(marshall)
const mockUnmarshall = vi.mocked(unmarshall)

// Mock DynamoDBClient constructor
vi.mocked(DynamoDBClient).mockImplementation(() => mockDynamoClient as any)

// Import DynamoService after mocking
import { DynamoService } from '../dynamoService'

describe('DynamoService', () => {
  let dynamoService: DynamoService

  beforeEach(() => {
    vi.clearAllMocks()
    dynamoService = new DynamoService(mockDynamoClient as any)
  })

  describe('fixEpisodeImageUrls', () => {
    it('should fix episode image URLs successfully', async () => {
      const mockEpisodes = [
        {
          episodeId: 'episode-1',
          podcastId: 'podcast-1',
          title: 'Test Episode 1',
          description: 'Test description',
          audioUrl: 'https://example.com/audio1.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
          imageUrl: {
            $: {
              M: {
                href: {
                  S: 'https://example.com/fixed-image1.jpg',
                },
              },
            },
          },
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          episodeId: 'episode-2',
          podcastId: 'podcast-1',
          title: 'Test Episode 2',
          description: 'Test description 2',
          audioUrl: 'https://example.com/audio2.mp3',
          duration: '45:00',
          releaseDate: '2024-01-02T00:00:00Z',
          imageUrl: {
            href: 'https://example.com/fixed-image2.jpg',
          },
          createdAt: '2024-01-02T00:00:00Z',
        },
        {
          episodeId: 'episode-3',
          podcastId: 'podcast-1',
          title: 'Test Episode 3',
          description: 'Test description 3',
          audioUrl: 'https://example.com/audio3.mp3',
          duration: '20:00',
          releaseDate: '2024-01-03T00:00:00Z',
          imageUrl: {
            url: 'https://example.com/fixed-image3.jpg',
          },
          createdAt: '2024-01-03T00:00:00Z',
        },
      ]

      const mockQueryResponse = {
        Items: mockEpisodes.map(episode => ({ marshalled: episode })),
      }

      // Mock the getEpisodesByPodcast method
      vi.spyOn(dynamoService, 'getEpisodesByPodcast').mockResolvedValue({
        episodes: mockEpisodes,
      })

      mockMarshall.mockImplementation(item => ({ marshalled: item }))
      mockDynamoClient.send.mockResolvedValue({})

      await dynamoService.fixEpisodeImageUrls('podcast-1')

      expect(dynamoService.getEpisodesByPodcast).toHaveBeenCalledWith('podcast-1')
      expect(mockDynamoClient.send).toHaveBeenCalledWith(expect.any(BatchWriteItemCommand))

      // Verify the marshalled data contains fixed imageUrl
      expect(mockMarshall).toHaveBeenCalledTimes(3)
      expect(mockMarshall).toHaveBeenCalledWith(
        expect.objectContaining({
          episodeId: 'episode-1',
          imageUrl: 'https://example.com/fixed-image1.jpg',
        }),
      )
      expect(mockMarshall).toHaveBeenCalledWith(
        expect.objectContaining({
          episodeId: 'episode-2',
          imageUrl: 'https://example.com/fixed-image2.jpg',
        }),
      )
      expect(mockMarshall).toHaveBeenCalledWith(
        expect.objectContaining({
          episodeId: 'episode-3',
          imageUrl: 'https://example.com/fixed-image3.jpg',
        }),
      )
    })

    it('should handle episodes with normal string imageUrl', async () => {
      const mockEpisodes = [
        {
          episodeId: 'episode-1',
          podcastId: 'podcast-1',
          title: 'Test Episode 1',
          description: 'Test description',
          audioUrl: 'https://example.com/audio1.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
          imageUrl: 'https://example.com/normal-image.jpg',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ]

      vi.spyOn(dynamoService, 'getEpisodesByPodcast').mockResolvedValue({
        episodes: mockEpisodes,
      })

      mockMarshall.mockImplementation(item => ({ marshalled: item }))
      mockDynamoClient.send.mockResolvedValue({})

      await dynamoService.fixEpisodeImageUrls('podcast-1')

      expect(mockMarshall).toHaveBeenCalledWith(
        expect.objectContaining({
          episodeId: 'episode-1',
          imageUrl: 'https://example.com/normal-image.jpg',
        }),
      )
    })

    it('should handle episodes with no imageUrl', async () => {
      const mockEpisodes = [
        {
          episodeId: 'episode-1',
          podcastId: 'podcast-1',
          title: 'Test Episode 1',
          description: 'Test description',
          audioUrl: 'https://example.com/audio1.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ]

      vi.spyOn(dynamoService, 'getEpisodesByPodcast').mockResolvedValue({
        episodes: mockEpisodes,
      })

      mockMarshall.mockImplementation(item => ({ marshalled: item }))
      mockDynamoClient.send.mockResolvedValue({})

      await dynamoService.fixEpisodeImageUrls('podcast-1')

      expect(mockMarshall).toHaveBeenCalledWith(
        expect.objectContaining({
          episodeId: 'episode-1',
          imageUrl: undefined,
        }),
      )
    })

    it('should handle large batches of episodes', async () => {
      // Create 50 episodes to test batch processing
      const mockEpisodes = Array.from({ length: 50 }, (_, i) => ({
        episodeId: `episode-${i + 1}`,
        podcastId: 'podcast-1',
        title: `Test Episode ${i + 1}`,
        description: `Test description ${i + 1}`,
        audioUrl: `https://example.com/audio${i + 1}.mp3`,
        duration: '30:00',
        releaseDate: '2024-01-01T00:00:00Z',
        imageUrl: {
          href: `https://example.com/image${i + 1}.jpg`,
        },
        createdAt: '2024-01-01T00:00:00Z',
      }))

      vi.spyOn(dynamoService, 'getEpisodesByPodcast').mockResolvedValue({
        episodes: mockEpisodes,
      })

      mockMarshall.mockImplementation(item => ({ marshalled: item }))
      mockDynamoClient.send.mockResolvedValue({})

      await dynamoService.fixEpisodeImageUrls('podcast-1')

      // Should make 2 batch calls (25 episodes each)
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(2)
      expect(mockMarshall).toHaveBeenCalledTimes(50)
    })

    it('should handle empty episodes list', async () => {
      vi.spyOn(dynamoService, 'getEpisodesByPodcast').mockResolvedValue({
        episodes: [],
      })

      await dynamoService.fixEpisodeImageUrls('podcast-1')

      expect(mockDynamoClient.send).not.toHaveBeenCalled()
    })

    it('should handle DynamoDB errors', async () => {
      const mockEpisodes = [
        {
          episodeId: 'episode-1',
          podcastId: 'podcast-1',
          title: 'Test Episode 1',
          description: 'Test description',
          audioUrl: 'https://example.com/audio1.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
          imageUrl: {
            href: 'https://example.com/image1.jpg',
          },
          createdAt: '2024-01-01T00:00:00Z',
        },
      ]

      vi.spyOn(dynamoService, 'getEpisodesByPodcast').mockResolvedValue({
        episodes: mockEpisodes,
      })

      mockMarshall.mockImplementation(item => ({ marshalled: item }))
      mockDynamoClient.send.mockRejectedValue(new Error('DynamoDB error'))

      await expect(dynamoService.fixEpisodeImageUrls('podcast-1')).rejects.toThrow('Failed to fix episode image URLs')
    })

    it('should handle getEpisodesByPodcast errors', async () => {
      vi.spyOn(dynamoService, 'getEpisodesByPodcast').mockRejectedValue(new Error('Query error'))

      await expect(dynamoService.fixEpisodeImageUrls('podcast-1')).rejects.toThrow('Failed to fix episode image URLs')
    })

    it('should handle complex nested imageUrl objects', async () => {
      const mockEpisodes = [
        {
          episodeId: 'episode-1',
          podcastId: 'podcast-1',
          title: 'Test Episode 1',
          description: 'Test description',
          audioUrl: 'https://example.com/audio1.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
          imageUrl: {
            nested: {
              deep: {
                href: 'https://example.com/deep-image.jpg',
              },
            },
          },
          createdAt: '2024-01-01T00:00:00Z',
        },
      ]

      vi.spyOn(dynamoService, 'getEpisodesByPodcast').mockResolvedValue({
        episodes: mockEpisodes,
      })

      mockMarshall.mockImplementation(item => ({ marshalled: item }))
      mockDynamoClient.send.mockResolvedValue({})

      await dynamoService.fixEpisodeImageUrls('podcast-1')

      // Should keep the complex object as is since it doesn't match our expected patterns
      expect(mockMarshall).toHaveBeenCalledWith(
        expect.objectContaining({
          episodeId: 'episode-1',
          imageUrl: {
            nested: {
              deep: {
                href: 'https://example.com/deep-image.jpg',
              },
            },
          },
        }),
      )
    })

    it('should handle null imageUrl objects', async () => {
      const mockEpisodes = [
        {
          episodeId: 'episode-1',
          podcastId: 'podcast-1',
          title: 'Test Episode 1',
          description: 'Test description',
          audioUrl: 'https://example.com/audio1.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
          imageUrl: null,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ]

      vi.spyOn(dynamoService, 'getEpisodesByPodcast').mockResolvedValue({
        episodes: mockEpisodes,
      })

      mockMarshall.mockImplementation(item => ({ marshalled: item }))
      mockDynamoClient.send.mockResolvedValue({})

      await dynamoService.fixEpisodeImageUrls('podcast-1')

      expect(mockMarshall).toHaveBeenCalledWith(
        expect.objectContaining({
          episodeId: 'episode-1',
          imageUrl: null,
        }),
      )
    })
  })
})
