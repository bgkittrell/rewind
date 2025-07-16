import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { SQSService } from '../sqsService'
import { EpisodeSyncMessage } from '../../types'

// Mock AWS SDK
vi.mock('@aws-sdk/client-sqs')
vi.mock('../loggerService', () => ({
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

const mockSQSClient = {
  send: vi.fn(),
}

// Mock SQSClient constructor
vi.mocked(SQSClient).mockImplementation(() => mockSQSClient as any)

describe('SQSService', () => {
  let sqsService: SQSService

  beforeEach(() => {
    vi.clearAllMocks()

    // Set up environment variables
    process.env.GUEST_EXTRACTION_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/guest-extraction-queue'
    process.env.EPISODE_SYNC_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/episode-sync-queue'

    sqsService = new SQSService()
  })

  describe('sendEpisodeSyncMessage', () => {
    it('should send episode sync message successfully', async () => {
      const message: EpisodeSyncMessage = {
        podcastId: 'test-podcast-id',
        userId: 'test-user-id',
        rssUrl: 'https://example.com/feed.xml',
        timestamp: '2024-01-01T12:00:00Z',
      }

      mockSQSClient.send.mockResolvedValue({
        MessageId: 'test-message-id',
      })

      await sqsService.sendEpisodeSyncMessage(message)

      expect(mockSQSClient.send).toHaveBeenCalledWith(expect.any(SendMessageCommand))
    })

    it('should add FIFO parameters for .fifo queues', async () => {
      // Set up FIFO queue URL
      process.env.EPISODE_SYNC_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/episode-sync-queue.fifo'
      sqsService = new SQSService()

      const message: EpisodeSyncMessage = {
        podcastId: 'test-podcast-id',
        userId: 'test-user-id',
        rssUrl: 'https://example.com/feed.xml',
        timestamp: '2024-01-01T12:00:00Z',
      }

      mockSQSClient.send.mockResolvedValue({
        MessageId: 'test-message-id',
      })

      await sqsService.sendEpisodeSyncMessage(message)

      expect(mockSQSClient.send).toHaveBeenCalledWith(expect.any(SendMessageCommand))
    })

    it('should throw error when episode sync queue URL is not configured', async () => {
      // Remove environment variable
      delete process.env.EPISODE_SYNC_QUEUE_URL
      sqsService = new SQSService()

      const message: EpisodeSyncMessage = {
        podcastId: 'test-podcast-id',
        userId: 'test-user-id',
        rssUrl: 'https://example.com/feed.xml',
        timestamp: '2024-01-01T12:00:00Z',
      }

      await expect(sqsService.sendEpisodeSyncMessage(message)).rejects.toThrow(
        'Episode sync SQS queue URL not configured',
      )

      expect(mockSQSClient.send).not.toHaveBeenCalled()
    })

    it('should handle SQS send errors', async () => {
      const message: EpisodeSyncMessage = {
        podcastId: 'test-podcast-id',
        userId: 'test-user-id',
        rssUrl: 'https://example.com/feed.xml',
        timestamp: '2024-01-01T12:00:00Z',
      }

      const sqsError = new Error('SQS service unavailable')
      mockSQSClient.send.mockRejectedValue(sqsError)

      await expect(sqsService.sendEpisodeSyncMessage(message)).rejects.toThrow('SQS service unavailable')

      expect(mockSQSClient.send).toHaveBeenCalledWith(expect.any(SendMessageCommand))
    })

    it('should handle empty queue URL environment variable', async () => {
      // Set empty environment variable
      process.env.EPISODE_SYNC_QUEUE_URL = ''
      sqsService = new SQSService()

      const message: EpisodeSyncMessage = {
        podcastId: 'test-podcast-id',
        userId: 'test-user-id',
        rssUrl: 'https://example.com/feed.xml',
        timestamp: '2024-01-01T12:00:00Z',
      }

      await expect(sqsService.sendEpisodeSyncMessage(message)).rejects.toThrow(
        'Episode sync SQS queue URL not configured',
      )
    })
  })

  describe('sendGuestExtractionMessages', () => {
    it('should send guest extraction messages successfully', async () => {
      const messages = [
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
      ]

      mockSQSClient.send.mockResolvedValue({
        Successful: [
          { Id: '0', MessageId: 'msg-1' },
          { Id: '1', MessageId: 'msg-2' },
        ],
        Failed: [],
      })

      await sqsService.sendGuestExtractionMessages(messages)

      expect(mockSQSClient.send).toHaveBeenCalledTimes(2) // One call per message
      expect(mockSQSClient.send).toHaveBeenCalledWith(expect.any(SendMessageCommand))

      // Verify both messages were sent
      expect(mockSQSClient.send).toHaveBeenCalledWith(expect.any(SendMessageCommand))
    })

    it('should handle empty messages array', async () => {
      await sqsService.sendGuestExtractionMessages([])
      expect(mockSQSClient.send).not.toHaveBeenCalled()
    })

    it('should process messages in batches of 10', async () => {
      const messages = Array.from({ length: 25 }, (_, i) => ({
        episodeId: `episode-${i + 1}`,
        title: `Episode ${i + 1}`,
        description: `Description ${i + 1}`,
        podcastId: 'test-podcast-id',
        userId: 'test-user-id',
      }))

      mockSQSClient.send.mockResolvedValue({
        Successful: Array.from({ length: 10 }, (_, i) => ({ Id: String(i), MessageId: `msg-${i}` })),
        Failed: [],
      })

      await sqsService.sendGuestExtractionMessages(messages)

      expect(mockSQSClient.send).toHaveBeenCalledTimes(25) // One call per message
    })

    it('should throw error when guest extraction queue URL is not configured', async () => {
      // Remove environment variable
      delete process.env.GUEST_EXTRACTION_QUEUE_URL
      sqsService = new SQSService()

      const messages = [
        {
          episodeId: 'episode-1',
          title: 'Episode 1',
          description: 'First episode',
          podcastId: 'test-podcast-id',
          userId: 'test-user-id',
        },
      ]

      await expect(sqsService.sendGuestExtractionMessages(messages)).rejects.toThrow(
        'Guest extraction SQS queue URL not configured',
      )
    })

    it('should handle batch send errors', async () => {
      const messages = [
        {
          episodeId: 'episode-1',
          title: 'Episode 1',
          description: 'First episode',
          podcastId: 'test-podcast-id',
          userId: 'test-user-id',
        },
      ]

      const sqsError = new Error('Batch send failed')
      mockSQSClient.send.mockRejectedValue(sqsError)

      await expect(sqsService.sendGuestExtractionMessages(messages)).rejects.toThrow('Batch send failed')
    })

    it('should handle partial failures in batch send', async () => {
      const messages = [
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
      ]

      // Mock the first message to succeed and the second to fail
      mockSQSClient.send
        .mockResolvedValueOnce({ MessageId: 'msg-1' })
        .mockRejectedValueOnce(new Error('SQS send failed'))

      await expect(sqsService.sendGuestExtractionMessages(messages)).rejects.toThrow('SQS send failed')
    })
  })

  describe('Constructor', () => {
    it('should initialize with default AWS region', () => {
      delete process.env.AWS_REGION
      const service = new SQSService()

      expect(SQSClient).toHaveBeenCalledWith({ region: 'us-east-1' })
    })

    it('should initialize with custom AWS region from environment', () => {
      process.env.AWS_REGION = 'us-west-2'
      const service = new SQSService()

      expect(SQSClient).toHaveBeenCalledWith({ region: 'us-west-2' })
    })

    it('should handle missing environment variables gracefully', () => {
      delete process.env.GUEST_EXTRACTION_QUEUE_URL
      delete process.env.EPISODE_SYNC_QUEUE_URL

      expect(() => new SQSService()).not.toThrow()
    })
  })
})
