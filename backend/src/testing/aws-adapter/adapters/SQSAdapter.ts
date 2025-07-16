/**
 * SQS Adapter - Mock Implementation
 *
 * In-memory SQS simulation for integration testing
 */

import { SQSAdapter, SQSMessage, AdapterError } from '../types'

interface InMemoryQueue {
  url: string
  name: string
  messages: SQSMessage[]
  attributes: { [key: string]: string }
  dlqUrl?: string
  visibilityTimeoutSeconds: number
  messageRetentionPeriod: number
  maxReceiveCount: number
  redrivenMessages: SQSMessage[]
}

export class MockSQSAdapter implements SQSAdapter {
  private queues: Map<string, InMemoryQueue> = new Map()
  private messageIdCounter = 0
  private operations: Array<{ operation: string; queueUrl: string; timestamp: Date }> = []

  async sendMessage(queueUrl: string, messageBody: string, attributes?: { [key: string]: string }): Promise<string> {
    const queue = this.getQueue(queueUrl)
    const messageId = this.generateMessageId()

    const message: SQSMessage = {
      id: messageId,
      body: messageBody,
      attributes: attributes || {},
      messageAttributes: {},
    }

    queue.messages.push(message)
    this.recordOperation('sendMessage', queueUrl)

    return messageId
  }

  async receiveMessages(queueUrl: string, maxMessages: number = 1): Promise<SQSMessage[]> {
    const queue = this.getQueue(queueUrl)
    const messages = queue.messages.splice(0, maxMessages)

    this.recordOperation('receiveMessages', queueUrl)

    // Simulate visibility timeout by temporarily hiding messages
    setTimeout(() => {
      if (messages.length > 0) {
        // Messages return to queue if not explicitly deleted
        queue.messages.unshift(...messages)
      }
    }, queue.visibilityTimeoutSeconds * 1000)

    return messages
  }

  async deleteMessage(queueUrl: string, messageId: string): Promise<void> {
    const queue = this.getQueue(queueUrl)
    const index = queue.messages.findIndex(msg => msg.id === messageId)

    if (index !== -1) {
      queue.messages.splice(index, 1)
    }

    this.recordOperation('deleteMessage', queueUrl)
  }

  async createQueue(queueName: string, attributes?: { [key: string]: string }): Promise<string> {
    const queueUrl = `https://sqs.us-east-1.amazonaws.com/123456789012/${queueName}`

    if (this.queues.has(queueUrl)) {
      throw new AdapterError(`Queue already exists: ${queueName}`, 'sqs', 'createQueue')
    }

    const queue: InMemoryQueue = {
      url: queueUrl,
      name: queueName,
      messages: [],
      attributes: attributes || {},
      visibilityTimeoutSeconds: parseInt(attributes?.VisibilityTimeout || '30'),
      messageRetentionPeriod: parseInt(attributes?.MessageRetentionPeriod || '1209600'),
      maxReceiveCount: parseInt(attributes?.maxReceiveCount || '3'),
      redrivenMessages: [],
    }

    // Handle DLQ configuration
    if (attributes?.RedrivePolicy) {
      try {
        const redrivePolicy = JSON.parse(attributes.RedrivePolicy)
        queue.dlqUrl = redrivePolicy.deadLetterTargetArn?.split(':').pop()
        queue.maxReceiveCount = redrivePolicy.maxReceiveCount || 3
      } catch (error) {
        // Ignore malformed redrive policy
      }
    }

    this.queues.set(queueUrl, queue)
    this.recordOperation('createQueue', queueUrl)

    return queueUrl
  }

  async deleteQueue(queueUrl: string): Promise<void> {
    if (!this.queues.has(queueUrl)) {
      throw new AdapterError(`Queue not found: ${queueUrl}`, 'sqs', 'deleteQueue')
    }

    this.queues.delete(queueUrl)
    this.recordOperation('deleteQueue', queueUrl)
  }

  async purgeQueue(queueUrl: string): Promise<void> {
    const queue = this.getQueue(queueUrl)
    queue.messages = []
    queue.redrivenMessages = []

    this.recordOperation('purgeQueue', queueUrl)
  }

  async getQueueAttributes(queueUrl: string): Promise<{ [key: string]: string }> {
    const queue = this.getQueue(queueUrl)

    return {
      ...queue.attributes,
      ApproximateNumberOfMessages: queue.messages.length.toString(),
      ApproximateNumberOfMessagesNotVisible: '0',
      ApproximateNumberOfMessagesDelayed: '0',
      CreatedTimestamp: Math.floor(Date.now() / 1000).toString(),
      LastModifiedTimestamp: Math.floor(Date.now() / 1000).toString(),
      QueueArn: `arn:aws:sqs:us-east-1:123456789012:${queue.name}`,
      VisibilityTimeout: queue.visibilityTimeoutSeconds.toString(),
      MessageRetentionPeriod: queue.messageRetentionPeriod.toString(),
      MaxReceiveCount: queue.maxReceiveCount.toString(),
    }
  }

  // Test utilities
  getQueueMessages(queueUrl: string): SQSMessage[] {
    const queue = this.getQueue(queueUrl)
    return [...queue.messages]
  }

  getQueueNames(): string[] {
    return Array.from(this.queues.values()).map(q => q.name)
  }

  getOperations(): Array<{ operation: string; queueUrl: string; timestamp: Date }> {
    return [...this.operations]
  }

  clearOperations(): void {
    this.operations = []
  }

  // Simulate DLQ redrive
  simulateMessageFailure(queueUrl: string, messageId: string): void {
    const queue = this.getQueue(queueUrl)
    const messageIndex = queue.messages.findIndex(msg => msg.id === messageId)

    if (messageIndex !== -1) {
      const message = queue.messages[messageIndex]
      queue.redrivenMessages.push(message)
      queue.messages.splice(messageIndex, 1)

      // If DLQ is configured, move message there
      if (queue.dlqUrl) {
        const dlq = this.queues.get(queue.dlqUrl)
        if (dlq) {
          dlq.messages.push(message)
        }
      }
    }
  }

  // Generate Lambda event from SQS message
  generateLambdaEvent(queueUrl: string, messageBody: string): any {
    const messageId = this.generateMessageId()

    return {
      Records: [
        {
          messageId,
          receiptHandle: `receipt-${messageId}`,
          body: messageBody,
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: Date.now().toString(),
            SenderId: 'AIDAIENQZJOLO23YVJ4VO',
            ApproximateFirstReceiveTimestamp: Date.now().toString(),
          },
          messageAttributes: {},
          md5OfBody: this.calculateMD5(messageBody),
          eventSource: 'aws:sqs',
          eventSourceARN: `arn:aws:sqs:us-east-1:123456789012:${this.getQueueName(queueUrl)}`,
          awsRegion: 'us-east-1',
        },
      ],
    }
  }

  private getQueue(queueUrl: string): InMemoryQueue {
    const queue = this.queues.get(queueUrl)
    if (!queue) {
      throw new AdapterError(`Queue not found: ${queueUrl}`, 'sqs', 'getQueue')
    }
    return queue
  }

  private getQueueName(queueUrl: string): string {
    return queueUrl.split('/').pop() || 'unknown'
  }

  private generateMessageId(): string {
    return `msg-${++this.messageIdCounter}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private calculateMD5(body: string): string {
    // Simple MD5 simulation for testing
    return Buffer.from(body).toString('base64').substr(0, 32)
  }

  private recordOperation(operation: string, queueUrl: string): void {
    this.operations.push({
      operation,
      queueUrl,
      timestamp: new Date(),
    })
  }
}

/**
 * Production SQS Adapter
 *
 * Wrapper for actual AWS SQS client
 */
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  CreateQueueCommand,
  DeleteQueueCommand,
  PurgeQueueCommand,
  GetQueueAttributesCommand,
} from '@aws-sdk/client-sqs'

export class ProductionSQSAdapter implements SQSAdapter {
  private client: SQSClient

  constructor(client?: SQSClient) {
    this.client = client || new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' })
  }

  async sendMessage(queueUrl: string, messageBody: string, attributes?: { [key: string]: string }): Promise<string> {
    try {
      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        MessageAttributes: attributes ? this.convertToMessageAttributes(attributes) : undefined,
      })

      const response = await this.client.send(command)
      return response.MessageId || ''
    } catch (error) {
      throw new AdapterError(`SQS sendMessage failed: ${error.message}`, 'sqs', 'sendMessage', error)
    }
  }

  async receiveMessages(queueUrl: string, maxMessages: number = 1): Promise<SQSMessage[]> {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: 1,
      })

      const response = await this.client.send(command)

      return (response.Messages || []).map(msg => ({
        id: msg.MessageId || '',
        body: msg.Body || '',
        attributes: msg.Attributes || {},
        messageAttributes: msg.MessageAttributes || {},
      }))
    } catch (error) {
      throw new AdapterError(`SQS receiveMessages failed: ${error.message}`, 'sqs', 'receiveMessages', error)
    }
  }

  async deleteMessage(queueUrl: string, messageId: string): Promise<void> {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: messageId, // In production, this would be the receipt handle
      })

      await this.client.send(command)
    } catch (error) {
      throw new AdapterError(`SQS deleteMessage failed: ${error.message}`, 'sqs', 'deleteMessage', error)
    }
  }

  async createQueue(queueName: string, attributes?: { [key: string]: string }): Promise<string> {
    try {
      const command = new CreateQueueCommand({
        QueueName: queueName,
        Attributes: attributes,
      })

      const response = await this.client.send(command)
      return response.QueueUrl || ''
    } catch (error) {
      throw new AdapterError(`SQS createQueue failed: ${error.message}`, 'sqs', 'createQueue', error)
    }
  }

  async deleteQueue(queueUrl: string): Promise<void> {
    try {
      const command = new DeleteQueueCommand({
        QueueUrl: queueUrl,
      })

      await this.client.send(command)
    } catch (error) {
      throw new AdapterError(`SQS deleteQueue failed: ${error.message}`, 'sqs', 'deleteQueue', error)
    }
  }

  async purgeQueue(queueUrl: string): Promise<void> {
    try {
      const command = new PurgeQueueCommand({
        QueueUrl: queueUrl,
      })

      await this.client.send(command)
    } catch (error) {
      throw new AdapterError(`SQS purgeQueue failed: ${error.message}`, 'sqs', 'purgeQueue', error)
    }
  }

  async getQueueAttributes(queueUrl: string): Promise<{ [key: string]: string }> {
    try {
      const command = new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ['All'],
      })

      const response = await this.client.send(command)
      return response.Attributes || {}
    } catch (error) {
      throw new AdapterError(`SQS getQueueAttributes failed: ${error.message}`, 'sqs', 'getQueueAttributes', error)
    }
  }

  private convertToMessageAttributes(attributes: { [key: string]: string }): { [key: string]: any } {
    const messageAttributes: { [key: string]: any } = {}

    for (const [key, value] of Object.entries(attributes)) {
      messageAttributes[key] = {
        DataType: 'String',
        StringValue: value,
      }
    }

    return messageAttributes
  }
}
