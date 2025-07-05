import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DynamoDBClient, QueryCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'
import { Episode, EpisodeData } from '../../types'

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

const dynamoMock = mockClient(DynamoDBClient)

describe('DynamoService', () => {
  let dynamoService: DynamoService

  beforeEach(() => {
    vi.clearAllMocks()
    dynamoMock.reset()
    dynamoService = new DynamoService()
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

  describe('saveEpisodes with deduplication', () => {
    const mockPodcastId = 'test-podcast-id'
    const mockEpisodeData: EpisodeData[] = [
      {
        title: 'Test Episode 1',
        description: 'Test description 1',
        audioUrl: 'https://example.com/audio1.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T00:00:00Z',
        imageUrl: 'https://example.com/image1.jpg',
        guests: ['Guest 1'],
        tags: ['tag1']
      },
      {
        title: 'Test Episode 2',
        description: 'Test description 2',
        audioUrl: 'https://example.com/audio2.mp3',
        duration: '45:00',
        releaseDate: '2023-10-16T00:00:00Z',
      }
    ]

    it('should create new episodes when no duplicates exist', async () => {
      // Mock no existing episodes found
      dynamoMock.onAnyCommand().resolves({ Items: [] })

      const result = await dynamoService.saveEpisodes(mockPodcastId, mockEpisodeData)

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Test Episode 1')
      expect(result[1].title).toBe('Test Episode 2')
      expect(result[0].naturalKey).toBeDefined()
      expect(result[1].naturalKey).toBeDefined()
    })

    it('should update existing episodes when duplicates are found', async () => {
      const existingEpisode: Episode = {
        episodeId: 'existing-episode-id',
        podcastId: mockPodcastId,
        title: 'Old Test Episode 1',
        description: 'Old description',
        audioUrl: 'https://example.com/old-audio.mp3',
        duration: '25:00',
        releaseDate: '2023-10-15T00:00:00Z',
        naturalKey: 'existing-natural-key',
        createdAt: '2023-10-15T10:00:00Z',
      }

      // Mock finding existing episode
      dynamoMock.onAnyCommand().resolves({ 
        Items: [{ 
          episodeId: { S: existingEpisode.episodeId },
          podcastId: { S: existingEpisode.podcastId },
          title: { S: existingEpisode.title },
          description: { S: existingEpisode.description },
          audioUrl: { S: existingEpisode.audioUrl },
          duration: { S: existingEpisode.duration },
          releaseDate: { S: existingEpisode.releaseDate },
          naturalKey: { S: existingEpisode.naturalKey },
          createdAt: { S: existingEpisode.createdAt },
        }]
      })

      const result = await dynamoService.saveEpisodes(mockPodcastId, mockEpisodeData)

      expect(result).toHaveLength(2)
      // Should preserve existing episode ID
      expect(result[0].episodeId).toBe(existingEpisode.episodeId)
    })

    it('should handle mixed scenarios with new and existing episodes', async () => {
      // Mock scenario where first episode exists, second is new
      let callCount = 0
      dynamoMock.onAnyCommand().callsFake(() => {
        callCount++
        if (callCount === 1) {
          // First episode exists
          return { Items: [{ episodeId: { S: 'existing-id' } }] }
        } else {
          // Second episode doesn't exist
          return { Items: [] }
        }
      })

      const result = await dynamoService.saveEpisodes(mockPodcastId, mockEpisodeData)

      expect(result).toHaveLength(2)
    })

    it('should handle errors gracefully and continue processing', async () => {
      // Mock error for first episode, success for second
      let callCount = 0
      dynamoMock.onAnyCommand().callsFake(() => {
        callCount++
        if (callCount === 1) {
          throw new Error('DynamoDB error')
        } else {
          return { Items: [] }
        }
      })

      const result = await dynamoService.saveEpisodes(mockPodcastId, mockEpisodeData)

      // Should continue processing despite error
      expect(result).toHaveLength(1)
    })
  })

  describe('natural key generation', () => {
    it('should generate consistent natural keys for same episode data', () => {
      const episodeData: EpisodeData = {
        title: 'Test Episode',
        description: 'Test description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
      }

      // Access private method for testing
      const generateNaturalKey = (dynamoService as any).generateNaturalKey.bind(dynamoService)
      
      const key1 = generateNaturalKey(episodeData)
      const key2 = generateNaturalKey(episodeData)

      expect(key1).toBe(key2)
      expect(key1).toHaveLength(32) // MD5 hash length
    })

    it('should generate different keys for different episodes', () => {
      const episode1: EpisodeData = {
        title: 'Test Episode 1',
        description: 'Test description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
      }

      const episode2: EpisodeData = {
        title: 'Test Episode 2',
        description: 'Test description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
      }

      const generateNaturalKey = (dynamoService as any).generateNaturalKey.bind(dynamoService)
      
      const key1 = generateNaturalKey(episode1)
      const key2 = generateNaturalKey(episode2)

      expect(key1).not.toBe(key2)
    })

    it('should normalize titles for consistent key generation', () => {
      const episode1: EpisodeData = {
        title: '  Test Episode  ',
        description: 'Test description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
      }

      const episode2: EpisodeData = {
        title: 'test episode',
        description: 'Test description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
      }

      const generateNaturalKey = (dynamoService as any).generateNaturalKey.bind(dynamoService)
      
      const key1 = generateNaturalKey(episode1)
      const key2 = generateNaturalKey(episode2)

      expect(key1).toBe(key2)
    })
  })

  describe('duplicate detection', () => {
    it('should find existing episodes by natural key', async () => {
      const mockEpisode: Episode = {
        episodeId: 'test-episode-id',
        podcastId: 'test-podcast-id',
        title: 'Test Episode',
        description: 'Test description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
        naturalKey: 'test-natural-key',
        createdAt: '2023-10-15T10:00:00Z',
      }

      dynamoMock.onAnyCommand().resolves({
        Items: [{
          episodeId: { S: mockEpisode.episodeId },
          podcastId: { S: mockEpisode.podcastId },
          title: { S: mockEpisode.title },
          description: { S: mockEpisode.description },
          audioUrl: { S: mockEpisode.audioUrl },
          duration: { S: mockEpisode.duration },
          releaseDate: { S: mockEpisode.releaseDate },
          naturalKey: { S: mockEpisode.naturalKey },
          createdAt: { S: mockEpisode.createdAt },
        }]
      })

      const findExistingEpisode = (dynamoService as any).findExistingEpisode.bind(dynamoService)
      const result = await findExistingEpisode('test-podcast-id', 'test-natural-key')

      expect(result).toBeDefined()
      expect(result.episodeId).toBe(mockEpisode.episodeId)
    })

    it('should return null when no existing episode found', async () => {
      dynamoMock.onAnyCommand().resolves({ Items: [] })

      const findExistingEpisode = (dynamoService as any).findExistingEpisode.bind(dynamoService)
      const result = await findExistingEpisode('test-podcast-id', 'non-existent-key')

      expect(result).toBeNull()
    })
  })

  describe('episode updating', () => {
    it('should update existing episode with new data', async () => {
      const mockEpisode: Episode = {
        episodeId: 'test-episode-id',
        podcastId: 'test-podcast-id',
        title: 'Old Title',
        description: 'Old description',
        audioUrl: 'https://example.com/old-audio.mp3',
        duration: '25:00',
        releaseDate: '2023-10-15T12:00:00Z',
        naturalKey: 'test-natural-key',
        createdAt: '2023-10-15T10:00:00Z',
      }

      const newEpisodeData: EpisodeData = {
        title: 'New Title',
        description: 'New description',
        audioUrl: 'https://example.com/new-audio.mp3',
        duration: '35:00',
        releaseDate: '2023-10-15T12:00:00Z',
      }

      // Mock finding existing episode
      dynamoMock.onAnyCommand().resolves({
        Items: [{
          episodeId: { S: mockEpisode.episodeId },
          podcastId: { S: mockEpisode.podcastId },
          title: { S: mockEpisode.title },
          description: { S: mockEpisode.description },
          audioUrl: { S: mockEpisode.audioUrl },
          duration: { S: mockEpisode.duration },
          releaseDate: { S: mockEpisode.releaseDate },
          naturalKey: { S: mockEpisode.naturalKey },
          createdAt: { S: mockEpisode.createdAt },
        }]
      })

      const updateEpisode = (dynamoService as any).updateEpisode.bind(dynamoService)
      const result = await updateEpisode(mockEpisode.episodeId, newEpisodeData, 'test-natural-key')

      expect(result).toBeDefined()
    })
  })

  describe('episode creation', () => {
    it('should create new episode with natural key', async () => {
      const episodeData: EpisodeData = {
        title: 'New Episode',
        description: 'New description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
      }

      dynamoMock.onAnyCommand().resolves({})

      const createEpisode = (dynamoService as any).createEpisode.bind(dynamoService)
      const result = await createEpisode('test-podcast-id', episodeData, 'test-natural-key')

      expect(result).toBeDefined()
      expect(result.episodeId).toBeDefined()
      expect(result.podcastId).toBe('test-podcast-id')
      expect(result.naturalKey).toBe('test-natural-key')
      expect(result.title).toBe(episodeData.title)
    })
  })

  describe('edge cases', () => {
    it('should handle empty episode arrays', async () => {
      const result = await dynamoService.saveEpisodes('test-podcast-id', [])
      expect(result).toHaveLength(0)
    })

    it('should handle episodes with missing optional fields', async () => {
      const episodeData: EpisodeData[] = [{
        title: 'Minimal Episode',
        description: 'Minimal description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
        // No optional fields
      }]

      dynamoMock.onAnyCommand().resolves({ Items: [] })

      const result = await dynamoService.saveEpisodes('test-podcast-id', episodeData)

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Minimal Episode')
    })

    it('should handle episodes with special characters in titles', async () => {
      const episodeData: EpisodeData[] = [{
        title: 'Episode with "quotes" & special chars: #123',
        description: 'Test description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
      }]

      dynamoMock.onAnyCommand().resolves({ Items: [] })

      const result = await dynamoService.saveEpisodes('test-podcast-id', episodeData)

      expect(result).toHaveLength(1)
      expect(result[0].naturalKey).toBeDefined()
    })
  })
})
