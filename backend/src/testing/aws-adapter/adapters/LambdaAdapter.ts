/**
 * Lambda Adapter - Mock Implementation
 *
 * In-memory Lambda function simulation for integration testing
 */

import { LambdaAdapter, LambdaEvent, LambdaContext, LambdaResponse, AdapterError } from '../types'

export class MockLambdaAdapter implements LambdaAdapter {
  private functions: Map<string, (event: LambdaEvent, context: LambdaContext) => Promise<LambdaResponse>> = new Map()
  private invocations: Array<{ functionName: string; event: LambdaEvent; timestamp: Date }> = []

  async invoke(functionName: string, event: LambdaEvent): Promise<LambdaResponse> {
    const handler = this.functions.get(functionName)
    if (!handler) {
      throw new AdapterError(`Function not found: ${functionName}`, 'lambda', 'invoke')
    }

    const context = this.createMockContext(functionName)
    const startTime = Date.now()

    try {
      // Record invocation
      this.invocations.push({ functionName, event, timestamp: new Date() })

      // Execute handler
      const response = await handler(event, context)

      // Simulate processing time
      const processingTime = Date.now() - startTime
      if (processingTime < 50) {
        await new Promise(resolve => setTimeout(resolve, 50 - processingTime))
      }

      return response
    } catch (error) {
      throw new AdapterError(`Lambda invocation failed: ${error.message}`, 'lambda', 'invoke', error)
    }
  }

  async createFunction(
    functionName: string,
    handler: (event: LambdaEvent, context: LambdaContext) => Promise<LambdaResponse>,
  ): Promise<void> {
    if (this.functions.has(functionName)) {
      throw new AdapterError(`Function already exists: ${functionName}`, 'lambda', 'createFunction')
    }

    this.functions.set(functionName, handler)
  }

  async deleteFunction(functionName: string): Promise<void> {
    if (!this.functions.has(functionName)) {
      throw new AdapterError(`Function not found: ${functionName}`, 'lambda', 'deleteFunction')
    }

    this.functions.delete(functionName)
  }

  async updateFunctionCode(
    functionName: string,
    handler: (event: LambdaEvent, context: LambdaContext) => Promise<LambdaResponse>,
  ): Promise<void> {
    if (!this.functions.has(functionName)) {
      throw new AdapterError(`Function not found: ${functionName}`, 'lambda', 'updateFunctionCode')
    }

    this.functions.set(functionName, handler)
  }

  // Test utilities
  getInvocations(): Array<{ functionName: string; event: LambdaEvent; timestamp: Date }> {
    return [...this.invocations]
  }

  clearInvocations(): void {
    this.invocations = []
  }

  getRegisteredFunctions(): string[] {
    return Array.from(this.functions.keys())
  }

  private createMockContext(functionName: string): LambdaContext {
    const requestId = this.generateRequestId()

    return {
      functionName,
      functionVersion: '1',
      invokedFunctionArn: `arn:aws:lambda:us-east-1:123456789012:function:${functionName}`,
      memoryLimitInMB: '256',
      awsRequestId: requestId,
      logGroupName: `/aws/lambda/${functionName}`,
      logStreamName: `2024/01/01/[$LATEST]${requestId}`,
      remainingTimeInMillis: () => 30000, // 30 seconds
    }
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }
}

/**
 * Production Lambda Adapter
 *
 * Wrapper for actual AWS Lambda client
 */
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'

export class ProductionLambdaAdapter implements LambdaAdapter {
  private client: LambdaClient

  constructor(client?: LambdaClient) {
    this.client = client || new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' })
  }

  async invoke(functionName: string, event: LambdaEvent): Promise<LambdaResponse> {
    try {
      const command = new InvokeCommand({
        FunctionName: functionName,
        Payload: JSON.stringify(event),
        InvocationType: 'RequestResponse',
      })

      const response = await this.client.send(command)

      if (response.StatusCode !== 200) {
        throw new Error(`Lambda invocation failed with status: ${response.StatusCode}`)
      }

      const payload = response.Payload ? JSON.parse(Buffer.from(response.Payload).toString()) : {}

      return {
        statusCode: payload.statusCode || 200,
        headers: payload.headers || {},
        body: payload.body,
        isBase64Encoded: payload.isBase64Encoded || false,
      }
    } catch (error) {
      throw new AdapterError(`Lambda invocation failed: ${error.message}`, 'lambda', 'invoke', error)
    }
  }

  async createFunction(): Promise<void> {
    throw new AdapterError('Function creation not supported in production mode', 'lambda', 'createFunction')
  }

  async deleteFunction(): Promise<void> {
    throw new AdapterError('Function deletion not supported in production mode', 'lambda', 'deleteFunction')
  }

  async updateFunctionCode(): Promise<void> {
    throw new AdapterError('Function code update not supported in production mode', 'lambda', 'updateFunctionCode')
  }
}

// Lambda Handler Wrapper for Integration Testing
export class LambdaHandlerWrapper {
  private adapter: LambdaAdapter

  constructor(adapter: LambdaAdapter) {
    this.adapter = adapter
  }

  /**
   * Wraps an existing handler for testing
   */
  wrapHandler(
    functionName: string,
    handler: (event: LambdaEvent, context: LambdaContext) => Promise<LambdaResponse>,
  ): void {
    this.adapter.createFunction(functionName, handler)
  }

  /**
   * Creates a mock API Gateway handler
   */
  createApiGatewayHandler(functionName: string, routeHandler: (event: any) => Promise<any>): void {
    const handler = async (event: LambdaEvent, context: LambdaContext): Promise<LambdaResponse> => {
      try {
        const result = await routeHandler(event)

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
          body: JSON.stringify(result),
        }
      } catch (error) {
        return {
          statusCode: error.statusCode || 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: error.message,
            requestId: context.awsRequestId,
          }),
        }
      }
    }

    this.adapter.createFunction(functionName, handler)
  }

  /**
   * Creates a mock SQS handler
   */
  createSqsHandler(functionName: string, messageHandler: (messages: any[]) => Promise<void>): void {
    const handler = async (event: LambdaEvent, context: LambdaContext): Promise<LambdaResponse> => {
      try {
        if (event.Records && event.Records.length > 0) {
          const messages = event.Records.map(record => ({
            body: record.body,
            attributes: record.attributes || {},
            messageAttributes: record.messageAttributes || {},
          }))

          await messageHandler(messages)
        }

        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Messages processed successfully' }),
        }
      } catch (error) {
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: error.message,
            requestId: context.awsRequestId,
          }),
        }
      }
    }

    this.adapter.createFunction(functionName, handler)
  }

  /**
   * Invokes a wrapped handler
   */
  async invoke(functionName: string, event: LambdaEvent): Promise<LambdaResponse> {
    return this.adapter.invoke(functionName, event)
  }
}
