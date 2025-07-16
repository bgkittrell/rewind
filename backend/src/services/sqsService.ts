import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { logger } from './loggerService'

export interface GuestExtractionMessage {
  episodeId: string
  title: string
  description: string
  podcastId: string
  userId: string
}

export class SQSService {
  private client: SQSClient
  private queueUrl: string

  constructor() {
    this.client = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' })
    this.queueUrl = process.env.GUEST_EXTRACTION_QUEUE_URL || ''

    if (!this.queueUrl) {
      logger.warn('GUEST_EXTRACTION_QUEUE_URL environment variable not set')
    }
  }

  /**
   * Sends a message to the guest extraction queue
   */
  async sendGuestExtractionMessage(message: GuestExtractionMessage): Promise<void> {
    if (!this.queueUrl) {
      logger.error('Cannot send message - queue URL not configured')
      throw new Error('SQS queue URL not configured')
    }

    try {
      const messageParams: any = {
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message),
      }

      // Only add FIFO queue parameters if the queue is a FIFO queue
      if (this.queueUrl.endsWith('.fifo')) {
        messageParams.MessageGroupId = message.podcastId
        messageParams.MessageDeduplicationId = `${message.episodeId}-${Date.now()}`
      }

      const command = new SendMessageCommand(messageParams)
      const result = await this.client.send(command)

      logger.info('Guest extraction message sent to queue', {
        messageId: result.MessageId,
        episodeId: message.episodeId,
        queueUrl: this.queueUrl.substring(0, 50) + '...',
      })
    } catch (error) {
      logger.error('Failed to send message to SQS queue', {
        error: error instanceof Error ? error.message : String(error),
        episodeId: message.episodeId,
        queueUrl: this.queueUrl.substring(0, 50) + '...',
      })
      throw error
    }
  }

  /**
   * Sends multiple messages to the guest extraction queue in batch
   */
  async sendGuestExtractionMessages(messages: GuestExtractionMessage[]): Promise<void> {
    if (!this.queueUrl) {
      logger.error('Cannot send messages - queue URL not configured')
      throw new Error('SQS queue URL not configured')
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
        queueUrl: this.queueUrl.substring(0, 50) + '...',
      })
    } catch (error) {
      logger.error('Failed to send messages to SQS queue', {
        error: error instanceof Error ? error.message : String(error),
        messageCount: messages.length,
        queueUrl: this.queueUrl.substring(0, 50) + '...',
      })
      throw error
    }
  }
}

export const sqsService = new SQSService()
export default sqsService
