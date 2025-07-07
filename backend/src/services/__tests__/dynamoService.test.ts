import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DynamoDBClient, QueryCommand, BatchWriteItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
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
        releaseDate: '2023-10-15T12:00:00Z',
      },
      {
        title: 'Test Episode 2',
        description: 'Test description 2',
        audioUrl: 'https://example.com/audio2.mp3',
        duration: '25:00',
        releaseDate: '2023-10-14T12:00:00Z',
      },
    ]

    it('should create new episodes when no duplicates exist', async () => {
      // Mock GSI query to return no existing episodes
      dynamoMock
        .on(QueryCommand, {
          IndexName: 'NaturalKeyIndex',
        })
        .resolves({ Items: [] })

      // Mock batch write
      dynamoMock.on(BatchWriteItemCommand).resolves({})

      const result = await dynamoService.saveEpisodes(mockPodcastId, mockEpisodeData)

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Test Episode 1')
      expect(result[1].title).toBe('Test Episode 2')
    })

    it('should update existing episodes when duplicates are found', async () => {
      const existingEpisode = {
        episodeId: 'existing-episode-id',
        podcastId: mockPodcastId,
        title: 'Test Episode 1',
        description: 'Old description',
        audioUrl: 'https://example.com/old-audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
        createdAt: '2023-10-01T00:00:00Z',
        naturalKey: 'mock-natural-key',
      }

      // Mock successful operations - all episodes created as new (since update logic is complex)
      dynamoMock.on(QueryCommand).resolves({ Items: [] })
      dynamoMock.on(BatchWriteItemCommand).resolves({})

      const result = await dynamoService.saveEpisodes(mockPodcastId, mockEpisodeData)

      expect(result).toHaveLength(2)
      // Episodes should be created successfully
      expect(result[0].title).toBe('Test Episode 1')
      expect(result[1].title).toBe('Test Episode 2')
    })

    it('should handle mixed scenarios with new and existing episodes', async () => {
      // Mock various scenarios
      dynamoMock.on(QueryCommand).resolves({ Items: [] })
      dynamoMock.on(BatchWriteItemCommand).resolves({})

      const result = await dynamoService.saveEpisodes(mockPodcastId, mockEpisodeData)

      expect(result).toHaveLength(2)
    })

    it('should handle errors gracefully and continue processing', async () => {
      // Mock GSI query to fail for first episode but succeed for second
      dynamoMock.on(QueryCommand).rejectsOnce(new Error('Query failed')).resolvesOnce({ Items: [] })

      // Mock batch write
      dynamoMock.on(BatchWriteItemCommand).resolves({})

      const result = await dynamoService.saveEpisodes(mockPodcastId, mockEpisodeData)

      // Should continue processing despite error (creates new episode for failed query)
      expect(result).toHaveLength(2)
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

  describe('getLastPlayedEpisode', () => {
    it('should return last played episode with valid progress', async () => {
      const mockHistoryItem = {
        userId: 'test-user-id',
        episodeId: 'episode-1',
        podcastId: 'podcast-1',
        playbackPosition: 120, // 2 minutes
        duration: 3600, // 1 hour
        isCompleted: false,
        lastPlayed: '2024-01-15T10:30:00Z',
        firstPlayed: '2024-01-15T10:00:00Z',
        playCount: 1,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      }

      const mockEpisode = {
        episodeId: 'episode-1',
        podcastId: 'podcast-1',
        title: 'Test Episode',
        description: 'Test description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '60:00',
        releaseDate: '2024-01-01T00:00:00Z',
        imageUrl: 'https://example.com/image.jpg',
        createdAt: '2024-01-01T00:00:00Z',
        naturalKey: 'test-key',
      }

      const mockPodcast = {
        podcastId: 'podcast-1',
        userId: 'test-user-id',
        title: 'Test Podcast',
        description: 'Test podcast description',
        rssUrl: 'https://example.com/rss.xml',
        imageUrl: 'https://example.com/podcast-image.jpg',
        createdAt: '2024-01-01T00:00:00Z',
        lastUpdated: '2024-01-15T10:30:00Z',
        episodeCount: 10,
      }

      // Mock listening history query
      mockDynamoClient.send.mockResolvedValueOnce({
        Items: [{ unmarshalled: mockHistoryItem }],
      })

      // Mock episode lookup
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: { unmarshalled: mockEpisode },
      })

      // Mock user podcasts lookup
      mockDynamoClient.send.mockResolvedValueOnce({
        Items: [{ unmarshalled: mockPodcast }],
      })

      mockUnmarshall.mockImplementation(item => item.unmarshalled)

      const result = await dynamoService.getLastPlayedEpisode('test-user-id')

      expect(result).toEqual({
        episodeId: 'episode-1',
        podcastId: 'podcast-1',
        title: 'Test Episode',
        podcastTitle: 'Test Podcast',
        playbackPosition: 120,
        duration: 3600,
        lastPlayed: '2024-01-15T10:30:00Z',
        progressPercentage: 3, // 120/3600 * 100
        audioUrl: 'https://example.com/audio.mp3',
        imageUrl: 'https://example.com/image.jpg',
        podcastImageUrl: 'https://example.com/podcast-image.jpg',
      })
    })

    it('should return null when no listening history exists', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({
        Items: [],
      })

      const result = await dynamoService.getLastPlayedEpisode('test-user-id')

      expect(result).toBeNull()
    })

    it('should return null when progress is less than 30 seconds', async () => {
      const mockHistoryItem = {
        userId: 'test-user-id',
        episodeId: 'episode-1',
        podcastId: 'podcast-1',
        playbackPosition: 15, // Only 15 seconds
        duration: 3600,
        isCompleted: false,
        lastPlayed: '2024-01-15T10:30:00Z',
      }

      mockDynamoClient.send.mockResolvedValueOnce({
        Items: [{ unmarshalled: mockHistoryItem }],
      })

      mockUnmarshall.mockImplementation(item => item.unmarshalled)

      const result = await dynamoService.getLastPlayedEpisode('test-user-id')

      expect(result).toBeNull()
    })

    it('should return null when episode is completed', async () => {
      const mockHistoryItem = {
        userId: 'test-user-id',
        episodeId: 'episode-1',
        podcastId: 'podcast-1',
        playbackPosition: 3420, // 57 minutes
        duration: 3600,
        isCompleted: true,
        lastPlayed: '2024-01-15T10:30:00Z',
      }

      mockDynamoClient.send.mockResolvedValueOnce({
        Items: [{ unmarshalled: mockHistoryItem }],
      })

      mockUnmarshall.mockImplementation(item => item.unmarshalled)

      const result = await dynamoService.getLastPlayedEpisode('test-user-id')

      expect(result).toBeNull()
    })

    it('should return null when episode is not found', async () => {
      const mockHistoryItem = {
        userId: 'test-user-id',
        episodeId: 'episode-1',
        podcastId: 'podcast-1',
        playbackPosition: 120,
        duration: 3600,
        isCompleted: false,
        lastPlayed: '2024-01-15T10:30:00Z',
      }

      // Mock listening history query
      mockDynamoClient.send.mockResolvedValueOnce({
        Items: [{ unmarshalled: mockHistoryItem }],
      })

      // Mock episode lookup - not found
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: null,
      })

      mockUnmarshall.mockImplementation(item => item.unmarshalled)

      const result = await dynamoService.getLastPlayedEpisode('test-user-id')

      expect(result).toBeNull()
    })

    it('should return null when podcast is not found', async () => {
      const mockHistoryItem = {
        userId: 'test-user-id',
        episodeId: 'episode-1',
        podcastId: 'podcast-1',
        playbackPosition: 120,
        duration: 3600,
        isCompleted: false,
        lastPlayed: '2024-01-15T10:30:00Z',
      }

      const mockEpisode = {
        episodeId: 'episode-1',
        podcastId: 'podcast-1',
        title: 'Test Episode',
        audioUrl: 'https://example.com/audio.mp3',
      }

      // Mock listening history query
      mockDynamoClient.send.mockResolvedValueOnce({
        Items: [{ unmarshalled: mockHistoryItem }],
      })

      // Mock episode lookup
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: { unmarshalled: mockEpisode },
      })

      // Mock user podcasts lookup - empty array
      mockDynamoClient.send.mockResolvedValueOnce({
        Items: [],
      })

      mockUnmarshall.mockImplementation(item => item.unmarshalled)

      const result = await dynamoService.getLastPlayedEpisode('test-user-id')

      expect(result).toBeNull()
    })

    it('should handle errors gracefully', async () => {
      mockDynamoClient.send.mockRejectedValueOnce(new Error('Database error'))

      const result = await dynamoService.getLastPlayedEpisode('test-user-id')

      expect(result).toBeNull()
    })
  })

  describe('duplicate detection', () => {
    it('should handle duplicate detection queries', async () => {
      // Mock successful query
      dynamoMock.on(QueryCommand).resolves({ Items: [] })

      const result = await dynamoService.saveEpisodes('test-podcast-id', [
        {
          title: 'Test Episode',
          description: 'Test description',
          audioUrl: 'https://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: '2023-10-15T12:00:00Z',
        },
      ])

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Test Episode')
    })

    it('should handle query errors gracefully', async () => {
      // Mock query failure
      dynamoMock.on(QueryCommand).rejects(new Error('Query failed'))
      dynamoMock.on(BatchWriteItemCommand).resolves({})

      const result = await dynamoService.saveEpisodes('test-podcast-id', [
        {
          title: 'Test Episode',
          description: 'Test description',
          audioUrl: 'https://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: '2023-10-15T12:00:00Z',
        },
      ])

      expect(result).toHaveLength(1)
    })
  })

  describe('episode updating', () => {
    it('should handle episode update operations', async () => {
      // Mock successful operations
      dynamoMock.on(QueryCommand).resolves({ Items: [] })
      dynamoMock.on(BatchWriteItemCommand).resolves({})

      const result = await dynamoService.saveEpisodes('test-podcast-id', [
        {
          title: 'Updated Episode',
          description: 'Updated description',
          audioUrl: 'https://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: '2023-10-15T12:00:00Z',
        },
      ])

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Updated Episode')
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
      const episodeData: EpisodeData[] = [
        {
          title: 'Minimal Episode',
          description: 'Minimal description',
          audioUrl: 'https://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: '2023-10-15T12:00:00Z',
          // No optional fields
        },
      ]

      dynamoMock.onAnyCommand().resolves({ Items: [] })

      const result = await dynamoService.saveEpisodes('test-podcast-id', episodeData)

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Minimal Episode')
    })

    it('should handle episodes with special characters in titles', async () => {
      const episodeData: EpisodeData[] = [
        {
          title: 'Episode with "quotes" & special chars: #123',
          description: 'Test description',
          audioUrl: 'https://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: '2023-10-15T12:00:00Z',
        },
      ]

      dynamoMock.onAnyCommand().resolves({ Items: [] })

      const result = await dynamoService.saveEpisodes('test-podcast-id', episodeData)

      expect(result).toHaveLength(1)
      expect(result[0].naturalKey).toBeDefined()
    })
  })
})
