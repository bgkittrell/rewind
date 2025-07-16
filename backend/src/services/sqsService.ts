import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { logger } from './loggerService'
import { EpisodeSyncMessage } from '../types'

export interface GuestExtractionMessage {
  episodeId: string
  title: string
  description: string
  podcastId: string
  userId: string
}

export class SQSService {
  private client: SQSClient
  private guestExtractionQueueUrl: string
  private episodeSyncQueueUrl: string

  constructor() {
    this.client = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' })
    this.guestExtractionQueueUrl = process.env.GUEST_EXTRACTION_QUEUE_URL || ''
    this.episodeSyncQueueUrl = process.env.EPISODE_SYNC_QUEUE_URL || ''

    if (!this.guestExtractionQueueUrl) {
      logger.warn('GUEST_EXTRACTION_QUEUE_URL environment variable not set')
    }
    if (!this.episodeSyncQueueUrl) {
      logger.warn('EPISODE_SYNC_QUEUE_URL environment variable not set')
    }
  }

  /**
   * Sends a message to the guest extraction queue
   */
  async sendGuestExtractionMessage(message: GuestExtractionMessage): Promise<void> {
    if (!this.guestExtractionQueueUrl) {
      logger.error('Cannot send message - guest extraction queue URL not configured')
      throw new Error('Guest extraction SQS queue URL not configured')
    }

    try {
      const messageParams: any = {
        QueueUrl: this.guestExtractionQueueUrl,
        MessageBody: JSON.stringify(message),
      }

      // Only add FIFO queue parameters if the queue is a FIFO queue
      if (this.guestExtractionQueueUrl.endsWith('.fifo')) {
        messageParams.MessageGroupId = message.podcastId
        messageParams.MessageDeduplicationId = `${message.episodeId}-${Date.now()}`
      }

      const command = new SendMessageCommand(messageParams)
      const result = await this.client.send(command)

      logger.info('Guest extraction message sent to queue', {
        messageId: result.MessageId,
        episodeId: message.episodeId,
        queueUrl: this.guestExtractionQueueUrl.substring(0, 50) + '...',
      })
    } catch (error) {
      logger.error('Failed to send message to SQS queue', {
        error: error instanceof Error ? error.message : String(error),
        episodeId: message.episodeId,
        queueUrl: this.guestExtractionQueueUrl.substring(0, 50) + '...',
      })
      throw error
    }
  }

  /**
   * Sends multiple messages to the guest extraction queue in batch
   */
  async sendGuestExtractionMessages(messages: GuestExtractionMessage[]): Promise<void> {
    if (!this.guestExtractionQueueUrl) {
      logger.error('Cannot send messages - guest extraction queue URL not configured')
      throw new Error('Guest extraction SQS queue URL not configured')
    }

    if (messages.length === 0) {
      return
    }

    try {
      // Process messages in batches to avoid overwhelming the queue
      const batchSize = 10 // SQS batch limit
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize)

        // Send messages individually to avoid batch complexity
        await Promise.all(batch.map(message => this.sendGuestExtractionMessage(message)))
      }

      logger.info('Guest extraction messages sent to queue', {
        messageCount: messages.length,
        queueUrl: this.guestExtractionQueueUrl.substring(0, 50) + '...',
      })
    } catch (error) {
      logger.error('Failed to send messages to SQS queue', {
        error: error instanceof Error ? error.message : String(error),
        messageCount: messages.length,
        queueUrl: this.guestExtractionQueueUrl.substring(0, 50) + '...',
      })
      throw error
    }
  }

  /**
   * Sends a message to the episode sync queue
   */
  async sendEpisodeSyncMessage(message: EpisodeSyncMessage): Promise<void> {
    if (!this.episodeSyncQueueUrl) {
      logger.error('Cannot send message - episode sync queue URL not configured')
      throw new Error('Episode sync SQS queue URL not configured')
    }

    try {
      const messageParams: any = {
        QueueUrl: this.episodeSyncQueueUrl,
        MessageBody: JSON.stringify(message),
      }

      // Only add FIFO queue parameters if the queue is a FIFO queue
      if (this.episodeSyncQueueUrl.endsWith('.fifo')) {
        messageParams.MessageGroupId = message.podcastId
        messageParams.MessageDeduplicationId = `${message.podcastId}-${message.timestamp}`
      }

      const command = new SendMessageCommand(messageParams)
      const result = await this.client.send(command)

      logger.info('Episode sync message sent to queue', {
        messageId: result.MessageId,
        podcastId: message.podcastId,
        queueUrl: this.episodeSyncQueueUrl.substring(0, 50) + '...',
      })
    } catch (error) {
      logger.error('Failed to send message to episode sync queue', {
        error: error instanceof Error ? error.message : String(error),
        podcastId: message.podcastId,
        queueUrl: this.episodeSyncQueueUrl.substring(0, 50) + '...',
      })
      throw error
    }
  }
}

export const sqsService = new SQSService()
export default sqsService
