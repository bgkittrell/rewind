/**
 * Bedrock Adapter - Mock Implementation
 *
 * In-memory Bedrock AI service simulation for integration testing
 */

import { BedrockAdapter, BedrockRequest, BedrockResponse, AdapterError } from '../types'

export class MockBedrockAdapter implements BedrockAdapter {
  private models: Map<string, any> = new Map()
  private invocations: Array<{ request: BedrockRequest; response: BedrockResponse; timestamp: Date }> = []

  constructor() {
    // Initialize with common models
    this.models.set('anthropic.claude-3-haiku-20240307-v1:0', {
      name: 'Claude 3 Haiku',
      maxTokens: 200000,
      costPer1MInputTokens: 0.25,
      costPer1MOutputTokens: 1.25,
    })

    this.models.set('anthropic.claude-3-sonnet-20240229-v1:0', {
      name: 'Claude 3 Sonnet',
      maxTokens: 200000,
      costPer1MInputTokens: 3.0,
      costPer1MOutputTokens: 15.0,
    })
  }

  async invokeModel(request: BedrockRequest): Promise<BedrockResponse> {
    const startTime = Date.now()

    if (!this.models.has(request.modelId)) {
      throw new AdapterError(`Model not found: ${request.modelId}`, 'bedrock', 'invokeModel')
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400))

    const requestBody = JSON.parse(request.body)
    const mockResponse = this.generateMockResponse(request.modelId, requestBody)

    const processingTime = Date.now() - startTime

    const response: BedrockResponse = {
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
      metrics: {
        inputTokens: this.estimateTokens(requestBody.messages?.[0]?.content || ''),
        outputTokens: this.estimateTokens(mockResponse.content?.[0]?.text || ''),
        latencyMs: processingTime,
      },
    }

    // Record invocation
    this.invocations.push({ request, response, timestamp: new Date() })

    return response
  }

  async invokeModelWithResponseStream(request: BedrockRequest): Promise<AsyncIterable<BedrockResponse>> {
    const response = await this.invokeModel(request)

    // Simulate streaming by breaking response into chunks
    const chunks = this.createResponseChunks(response)

    return this.createAsyncIterable(chunks)
  }

  async listFoundationModels(): Promise<string[]> {
    return Array.from(this.models.keys())
  }

  // Test utilities
  getInvocations(): Array<{ request: BedrockRequest; response: BedrockResponse; timestamp: Date }> {
    return [...this.invocations]
  }

  clearInvocations(): void {
    this.invocations = []
  }

  getModelInfo(modelId: string): any {
    return this.models.get(modelId)
  }

  private generateMockResponse(modelId: string, requestBody: any): any {
    const messages = requestBody.messages || []
    const lastMessage = messages[messages.length - 1]

    // Generate contextually appropriate mock responses
    if (lastMessage?.content?.includes('guest') || lastMessage?.content?.includes('Guest')) {
      return this.generateGuestExtractionResponse()
    }

    if (lastMessage?.content?.includes('summary') || lastMessage?.content?.includes('Summary')) {
      return this.generateSummaryResponse()
    }

    if (lastMessage?.content?.includes('recommendation') || lastMessage?.content?.includes('Recommendation')) {
      return this.generateRecommendationResponse()
    }

    // Default response
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'This is a mock response from the Bedrock adapter for testing purposes.',
        },
      ],
      model: modelId,
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: this.estimateTokens(lastMessage?.content || ''),
        output_tokens: 50,
      },
    }
  }

  private generateGuestExtractionResponse(): any {
    const mockGuests = [
      {
        name: 'John Smith',
        role: 'Software Engineer',
        company: 'Tech Corp',
        confidence: 0.95,
        mentions: ['John', 'Smith', 'engineer'],
      },
      {
        name: 'Sarah Johnson',
        role: 'Product Manager',
        company: 'Innovation Labs',
        confidence: 0.88,
        mentions: ['Sarah', 'Johnson', 'product'],
      },
    ]

    return {
      id: `guest_extraction_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            guests: mockGuests,
            extractionConfidence: 0.92,
            processingTime: 250,
            modelUsed: 'claude-3-haiku',
          }),
        },
      ],
      model: 'anthropic.claude-3-haiku-20240307-v1:0',
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 1200,
        output_tokens: 350,
      },
    }
  }

  private generateSummaryResponse(): any {
    return {
      id: `summary_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'This is a mock summary of the episode content. The discussion covered various topics including technology trends, industry insights, and future predictions. The conversation was engaging and provided valuable perspectives on current market conditions.',
        },
      ],
      model: 'anthropic.claude-3-sonnet-20240229-v1:0',
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 2000,
        output_tokens: 180,
      },
    }
  }

  private generateRecommendationResponse(): any {
    const mockRecommendations = [
      {
        episodeId: 'ep-123',
        title: 'Similar Episode About Technology',
        similarity: 0.85,
        reason: 'Similar topics and guest background',
      },
      {
        episodeId: 'ep-456',
        title: 'Related Discussion on Innovation',
        similarity: 0.78,
        reason: 'Complementary perspectives on industry trends',
      },
    ]

    return {
      id: `recommendation_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            recommendations: mockRecommendations,
            confidence: 0.83,
            algorithm: 'content-similarity',
          }),
        },
      ],
      model: 'anthropic.claude-3-haiku-20240307-v1:0',
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 800,
        output_tokens: 220,
      },
    }
  }

  private estimateTokens(text: string): number {
    // Simple token estimation (roughly 4 characters per token)
    return Math.ceil(text.length / 4)
  }

  private createResponseChunks(response: BedrockResponse): BedrockResponse[] {
    const responseBody = JSON.parse(response.body)
    const text = responseBody.content?.[0]?.text || ''

    // Split into chunks of ~50 characters
    const chunks: BedrockResponse[] = []
    const chunkSize = 50

    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.substring(i, i + chunkSize)
      chunks.push({
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'content_block_delta',
          delta: {
            type: 'text_delta',
            text: chunk,
          },
        }),
      })
    }

    // Add final chunk
    chunks.push({
      contentType: 'application/json',
      body: JSON.stringify({
        type: 'message_stop',
      }),
    })

    return chunks
  }

  private async *createAsyncIterable(chunks: BedrockResponse[]): AsyncIterable<BedrockResponse> {
    for (const chunk of chunks) {
      await new Promise(resolve => setTimeout(resolve, 10)) // Small delay between chunks
      yield chunk
    }
  }
}

/**
 * Production Bedrock Adapter
 *
 * Wrapper for actual AWS Bedrock client
 */
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime'

export class ProductionBedrockAdapter implements BedrockAdapter {
  private client: BedrockRuntimeClient

  constructor(client?: BedrockRuntimeClient) {
    this.client =
      client ||
      new BedrockRuntimeClient({
        region: process.env.AWS_REGION || 'us-east-1',
        maxAttempts: 3,
        retryMode: 'adaptive',
      })
  }

  async invokeModel(request: BedrockRequest): Promise<BedrockResponse> {
    try {
      const command = new InvokeModelCommand({
        modelId: request.modelId,
        contentType: request.contentType,
        accept: request.accept,
        body: request.body,
      })

      const response = await this.client.send(command)

      return {
        contentType: response.contentType || 'application/json',
        body: Buffer.from(response.body).toString(),
      }
    } catch (error) {
      throw new AdapterError(`Bedrock invokeModel failed: ${error.message}`, 'bedrock', 'invokeModel', error)
    }
  }

  async invokeModelWithResponseStream(request: BedrockRequest): Promise<AsyncIterable<BedrockResponse>> {
    try {
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: request.modelId,
        contentType: request.contentType,
        accept: request.accept,
        body: request.body,
      })

      const response = await this.client.send(command)

      return this.createProductionAsyncIterable(response.body)
    } catch (error) {
      throw new AdapterError(
        `Bedrock invokeModelWithResponseStream failed: ${error.message}`,
        'bedrock',
        'invokeModelWithResponseStream',
        error,
      )
    }
  }

  async listFoundationModels(): Promise<string[]> {
    // In production, you would use BedrockClient.listFoundationModels()
    // For now, return common models
    return [
      'anthropic.claude-3-haiku-20240307-v1:0',
      'anthropic.claude-3-sonnet-20240229-v1:0',
      'anthropic.claude-3-opus-20240229-v1:0',
    ]
  }

  private async *createProductionAsyncIterable(responseStream: any): AsyncIterable<BedrockResponse> {
    if (responseStream && responseStream[Symbol.asyncIterator]) {
      for await (const chunk of responseStream) {
        if (chunk.chunk?.bytes) {
          yield {
            contentType: 'application/json',
            body: Buffer.from(chunk.chunk.bytes).toString(),
          }
        }
      }
    }
  }
}
