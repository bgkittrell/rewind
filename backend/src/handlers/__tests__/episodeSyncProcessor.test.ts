import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SQSEvent } from 'aws-lambda'
import { handler } from '../episodeSyncProcessor'
import { rssService } from '../../services/rssService'
import { dynamoService } from '../../services/dynamoService'
import { sqsService } from '../../services/sqsService'

// Mock dependencies
vi.mock('../../services/rssService')
vi.mock('../../services/dynamoService')
vi.mock('../../services/sqsService')
vi.mock('../../services/loggerService', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    logRequest: vi.fn(),
    logResponse: vi.fn(),
    setCorrelationId: vi.fn(),
    generateCorrelationId: vi.fn().mockReturnValue('test-correlation-id'),
    setDefaultContext: vi.fn(),
    extractRequestContext: vi.fn().mockReturnValue({}),
  },
}))

const mockRssService = vi.mocked(rssService)
const mockDynamoService = vi.mocked(dynamoService)
const mockSqsService = vi.mocked(sqsService)

describe('EpisodeSyncProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockSQSEvent = (messages: any[]): SQSEvent => ({
    Records: messages.map((message, index) => ({
      messageId: `message-${index}`,
      receiptHandle: `receipt-${index}`,
      body: JSON.stringify(message),
      attributes: {},
      messageAttributes: {},
      md5OfBody: 'test-md5',
      eventSource: 'aws:sqs',
      eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
      awsRegion: 'us-east-1',
    })),
  })

  describe('Successful Episode Sync', () => {
    it('should process episode sync message successfully', async () => {
      const syncMessage = {
        podcastId: 'test-podcast-id',
        userId: 'test-user-id',
        rssUrl: 'https://example.com/feed.xml',
        timestamp: '2024-01-01T12:00:00Z',
      }

      const mockEpisodeData = [
        {
          title: 'Episode 1',
          description: 'First episode',
          audioUrl: 'https://example.com/episode1.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
        },
        {
          title: 'Episode 2',
          description: 'Second episode',
          audioUrl: 'https://example.com/episode2.mp3',
          duration: '45:00',
          releaseDate: '2024-01-02T00:00:00Z',
        },
      ]

      const mockSavedEpisodes = [
        {
          episodeId: 'episode-1',
          podcastId: 'test-podcast-id',
          title: 'Episode 1',
          description: 'First episode',
          audioUrl: 'https://example.com/episode1.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T12:00:00Z',
          naturalKey: 'natural-key-1',
          guestExtractionStatus: 'pending',
        },
        {
          episodeId: 'episode-2',
          podcastId: 'test-podcast-id',
          title: 'Episode 2',
          description: 'Second episode',
          audioUrl: 'https://example.com/episode2.mp3',
          duration: '45:00',
          releaseDate: '2024-01-02T00:00:00Z',
          createdAt: '2024-01-01T12:00:00Z',
          naturalKey: 'natural-key-2',
          guestExtractionStatus: 'pending',
        },
      ]

      mockDynamoService.updatePodcastSyncStatus.mockResolvedValue(undefined)
      mockRssService.parseAllEpisodesFromFeed.mockResolvedValue(mockEpisodeData)
      mockDynamoService.saveEpisodes.mockResolvedValue(mockSavedEpisodes)
      mockDynamoService.getEpisodeCount.mockResolvedValue(2)
      mockSqsService.sendGuestExtractionMessages.mockResolvedValue(undefined)

      const event = createMockSQSEvent([syncMessage])

      await handler(event)

      expect(mockDynamoService.updatePodcastSyncStatus).toHaveBeenCalledWith(
        'test-user-id',
        'test-podcast-id',
        'processing',
      )
      expect(mockRssService.parseAllEpisodesFromFeed).toHaveBeenCalledWith('https://example.com/feed.xml')
      expect(mockDynamoService.saveEpisodes).toHaveBeenCalledWith('test-podcast-id', mockEpisodeData)
      expect(mockDynamoService.getEpisodeCount).toHaveBeenCalledWith('test-podcast-id')
      expect(mockDynamoService.updatePodcastSyncStatus).toHaveBeenCalledWith(
        'test-user-id',
        'test-podcast-id',
        'completed',
        { episodeCount: 2 },
      )
      expect(mockSqsService.sendGuestExtractionMessages).toHaveBeenCalledWith([
        {
          episodeId: 'episode-1',
          title: 'Episode 1',
          description: 'First episode',
          podcastId: 'test-podcast-id',
          userId: 'test-user-id',
        },
        {
          episodeId: 'episode-2',
          title: 'Episode 2',
          description: 'Second episode',
          podcastId: 'test-podcast-id',
          userId: 'test-user-id',
        },
      ])
    })

    it('should handle empty RSS feed gracefully', async () => {
      const syncMessage = {
        podcastId: 'test-podcast-id',
        userId: 'test-user-id',
        rssUrl: 'https://example.com/empty-feed.xml',
        timestamp: '2024-01-01T12:00:00Z',
      }

      mockDynamoService.updatePodcastSyncStatus.mockResolvedValue(undefined)
      mockRssService.parseAllEpisodesFromFeed.mockResolvedValue([])

      const event = createMockSQSEvent([syncMessage])

      await handler(event)

      expect(mockDynamoService.updatePodcastSyncStatus).toHaveBeenCalledWith(
        'test-user-id',
        'test-podcast-id',
        'processing',
      )
      expect(mockRssService.parseAllEpisodesFromFeed).toHaveBeenCalledWith('https://example.com/empty-feed.xml')
      expect(mockDynamoService.saveEpisodes).not.toHaveBeenCalled()
      expect(mockSqsService.sendGuestExtractionMessages).not.toHaveBeenCalled()
    })

    it('should process large feeds in batches', async () => {
      const syncMessage = {
        podcastId: 'test-podcast-id',
        userId: 'test-user-id',
        rssUrl: 'https://example.com/large-feed.xml',
        timestamp: '2024-01-01T12:00:00Z',
      }

      // Create 50 episodes to test batching (batch size is 25)
      const mockEpisodeData = Array.from({ length: 50 }, (_, i) => ({
        title: `Episode ${i + 1}`,
        description: `Description ${i + 1}`,
        audioUrl: `https://example.com/episode${i + 1}.mp3`,
        duration: '30:00',
        releaseDate: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      }))

      const mockSavedEpisodesBatch1 = Array.from({ length: 25 }, (_, i) => ({
        episodeId: `episode-${i + 1}`,
        podcastId: 'test-podcast-id',
        title: `Episode ${i + 1}`,
        description: `Description ${i + 1}`,
        audioUrl: `https://example.com/episode${i + 1}.mp3`,
        duration: '30:00',
        releaseDate: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
        createdAt: '2024-01-01T12:00:00Z',
        naturalKey: `natural-key-${i + 1}`,
        guestExtractionStatus: 'pending',
      }))

      const mockSavedEpisodesBatch2 = Array.from({ length: 25 }, (_, i) => ({
        episodeId: `episode-${i + 26}`,
        podcastId: 'test-podcast-id',
        title: `Episode ${i + 26}`,
        description: `Description ${i + 26}`,
        audioUrl: `https://example.com/episode${i + 26}.mp3`,
        duration: '30:00',
        releaseDate: `2024-01-${String(i + 26).padStart(2, '0')}T00:00:00Z`,
        createdAt: '2024-01-01T12:00:00Z',
        naturalKey: `natural-key-${i + 26}`,
        guestExtractionStatus: 'pending',
      }))

      mockDynamoService.updatePodcastSyncStatus.mockResolvedValue(undefined)
      mockRssService.parseAllEpisodesFromFeed.mockResolvedValue(mockEpisodeData)
      mockDynamoService.saveEpisodes
        .mockResolvedValueOnce(mockSavedEpisodesBatch1)
        .mockResolvedValueOnce(mockSavedEpisodesBatch2)
      mockDynamoService.getEpisodeCount.mockResolvedValue(50)
      mockSqsService.sendGuestExtractionMessages.mockResolvedValue(undefined)

      const event = createMockSQSEvent([syncMessage])

      await handler(event)

      expect(mockDynamoService.saveEpisodes).toHaveBeenCalledTimes(2)
      expect(mockDynamoService.saveEpisodes).toHaveBeenNthCalledWith(1, 'test-podcast-id', mockEpisodeData.slice(0, 25))
      expect(mockDynamoService.saveEpisodes).toHaveBeenNthCalledWith(
        2,
        'test-podcast-id',
        mockEpisodeData.slice(25, 50),
      )
      expect(mockSqsService.sendGuestExtractionMessages).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Handling', () => {
    it.skip('should handle RSS parsing errors', async () => {
      const syncMessage = {
        podcastId: 'test-podcast-id',
        userId: 'test-user-id',
        rssUrl: 'https://example.com/invalid-feed.xml',
        timestamp: '2024-01-01T12:00:00Z',
      }

      mockDynamoService.updatePodcastSyncStatus.mockResolvedValue(undefined)
      mockRssService.parseAllEpisodesFromFeed.mockRejectedValue(new Error('Invalid RSS feed'))

      const event = createMockSQSEvent([syncMessage])

      await expect(handler(event)).rejects.toThrow('Invalid RSS feed')

      expect(mockDynamoService.updatePodcastSyncStatus).toHaveBeenCalledWith(
        'test-user-id',
        'test-podcast-id',
        'processing',
      )
      expect(mockDynamoService.updatePodcastSyncStatus).toHaveBeenCalledWith(
        'test-user-id',
        'test-podcast-id',
        'failed',
        { error: 'Invalid RSS feed' },
      )
    })

    it('should continue processing other batches when one batch fails', async () => {
      const syncMessage = {
        podcastId: 'test-podcast-id',
        userId: 'test-user-id',
        rssUrl: 'https://example.com/feed.xml',
        timestamp: '2024-01-01T12:00:00Z',
      }

      // Create 50 episodes to test batch error handling
      const mockEpisodeData = Array.from({ length: 50 }, (_, i) => ({
        title: `Episode ${i + 1}`,
        description: `Description ${i + 1}`,
        audioUrl: `https://example.com/episode${i + 1}.mp3`,
        duration: '30:00',
        releaseDate: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      }))

      const mockSavedEpisodesBatch2 = Array.from({ length: 25 }, (_, i) => ({
        episodeId: `episode-${i + 26}`,
        podcastId: 'test-podcast-id',
        title: `Episode ${i + 26}`,
        description: `Description ${i + 26}`,
        audioUrl: `https://example.com/episode${i + 26}.mp3`,
        duration: '30:00',
        releaseDate: `2024-01-${String(i + 26).padStart(2, '0')}T00:00:00Z`,
        createdAt: '2024-01-01T12:00:00Z',
        naturalKey: `natural-key-${i + 26}`,
        guestExtractionStatus: 'pending',
      }))

      mockDynamoService.updatePodcastSyncStatus.mockResolvedValue(undefined)
      mockRssService.parseAllEpisodesFromFeed.mockResolvedValue(mockEpisodeData)
      mockDynamoService.saveEpisodes
        .mockRejectedValueOnce(new Error('Batch 1 failed'))
        .mockResolvedValueOnce(mockSavedEpisodesBatch2)
      mockDynamoService.getEpisodeCount.mockResolvedValue(25)
      mockSqsService.sendGuestExtractionMessages.mockResolvedValue(undefined)

      const event = createMockSQSEvent([syncMessage])

      await handler(event)

      expect(mockDynamoService.saveEpisodes).toHaveBeenCalledTimes(2)
      expect(mockDynamoService.updatePodcastSyncStatus).toHaveBeenCalledWith(
        'test-user-id',
        'test-podcast-id',
        'completed',
        { episodeCount: 25 },
      )
    })

    it('should handle malformed SQS message', async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'message-1',
            receiptHandle: 'receipt-1',
            body: 'invalid-json',
            attributes: {},
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      }

      await expect(handler(event)).rejects.toThrow()
    })
  })

  describe('Guest Extraction', () => {
    it('should skip guest extraction for episodes without title or description', async () => {
      const syncMessage = {
        podcastId: 'test-podcast-id',
        userId: 'test-user-id',
        rssUrl: 'https://example.com/feed.xml',
        timestamp: '2024-01-01T12:00:00Z',
      }

      const mockEpisodeData = [
        {
          title: 'Episode 1',
          description: 'First episode',
          audioUrl: 'https://example.com/episode1.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
        },
      ]

      const mockSavedEpisodes = [
        {
          episodeId: 'episode-1',
          podcastId: 'test-podcast-id',
          title: '', // Empty title should skip guest extraction
          description: 'First episode',
          audioUrl: 'https://example.com/episode1.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T12:00:00Z',
          naturalKey: 'natural-key-1',
          guestExtractionStatus: 'pending',
        },
      ]

      mockDynamoService.updatePodcastSyncStatus.mockResolvedValue(undefined)
      mockRssService.parseAllEpisodesFromFeed.mockResolvedValue(mockEpisodeData)
      mockDynamoService.saveEpisodes.mockResolvedValue(mockSavedEpisodes)
      mockDynamoService.getEpisodeCount.mockResolvedValue(1)

      const event = createMockSQSEvent([syncMessage])

      await handler(event)

      expect(mockSqsService.sendGuestExtractionMessages).not.toHaveBeenCalled()
    })

    it('should handle guest extraction errors gracefully without failing sync', async () => {
      const syncMessage = {
        podcastId: 'test-podcast-id',
        userId: 'test-user-id',
        rssUrl: 'https://example.com/feed.xml',
        timestamp: '2024-01-01T12:00:00Z',
      }

      const mockEpisodeData = [
        {
          title: 'Episode 1',
          description: 'First episode',
          audioUrl: 'https://example.com/episode1.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
        },
      ]

      const mockSavedEpisodes = [
        {
          episodeId: 'episode-1',
          podcastId: 'test-podcast-id',
          title: 'Episode 1',
          description: 'First episode',
          audioUrl: 'https://example.com/episode1.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T12:00:00Z',
          naturalKey: 'natural-key-1',
          guestExtractionStatus: 'pending',
        },
      ]

      mockDynamoService.updatePodcastSyncStatus.mockResolvedValue(undefined)
      mockRssService.parseAllEpisodesFromFeed.mockResolvedValue(mockEpisodeData)
      mockDynamoService.saveEpisodes.mockResolvedValue(mockSavedEpisodes)
      mockDynamoService.getEpisodeCount.mockResolvedValue(1)
      mockSqsService.sendGuestExtractionMessages.mockRejectedValue(new Error('SQS error'))

      const event = createMockSQSEvent([syncMessage])

      await handler(event)

      expect(mockDynamoService.updatePodcastSyncStatus).toHaveBeenCalledWith(
        'test-user-id',
        'test-podcast-id',
        'completed',
        { episodeCount: 1 },
      )
    })
  })

  describe('Multiple Messages', () => {
    it('should process multiple SQS messages', async () => {
      const syncMessage1 = {
        podcastId: 'test-podcast-1',
        userId: 'test-user-id',
        rssUrl: 'https://example.com/feed1.xml',
        timestamp: '2024-01-01T12:00:00Z',
      }

      const syncMessage2 = {
        podcastId: 'test-podcast-2',
        userId: 'test-user-id',
        rssUrl: 'https://example.com/feed2.xml',
        timestamp: '2024-01-01T12:00:00Z',
      }

      const mockEpisodeData = [
        {
          title: 'Episode 1',
          description: 'First episode',
          audioUrl: 'https://example.com/episode1.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
        },
      ]

      const mockSavedEpisodes1 = [
        {
          episodeId: 'episode-1',
          podcastId: 'test-podcast-1',
          title: 'Episode 1',
          description: 'First episode',
          audioUrl: 'https://example.com/episode1.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T12:00:00Z',
          naturalKey: 'natural-key-1',
          guestExtractionStatus: 'pending',
        },
      ]

      const mockSavedEpisodes2 = [
        {
          episodeId: 'episode-2',
          podcastId: 'test-podcast-2',
          title: 'Episode 1',
          description: 'First episode',
          audioUrl: 'https://example.com/episode1.mp3',
          duration: '30:00',
          releaseDate: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T12:00:00Z',
          naturalKey: 'natural-key-2',
          guestExtractionStatus: 'pending',
        },
      ]

      mockDynamoService.updatePodcastSyncStatus.mockResolvedValue(undefined)
      mockRssService.parseAllEpisodesFromFeed.mockResolvedValue(mockEpisodeData)
      mockDynamoService.saveEpisodes.mockResolvedValueOnce(mockSavedEpisodes1).mockResolvedValueOnce(mockSavedEpisodes2)
      mockDynamoService.getEpisodeCount.mockResolvedValue(1)
      mockSqsService.sendGuestExtractionMessages.mockResolvedValue(undefined)

      const event = createMockSQSEvent([syncMessage1, syncMessage2])

      await handler(event)

      expect(mockDynamoService.updatePodcastSyncStatus).toHaveBeenCalledTimes(4) // 2 processing + 2 completed
      expect(mockRssService.parseAllEpisodesFromFeed).toHaveBeenCalledTimes(2)
      expect(mockDynamoService.saveEpisodes).toHaveBeenCalledTimes(2)
    })
  })
})
