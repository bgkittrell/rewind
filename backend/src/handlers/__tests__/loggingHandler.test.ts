import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { handler } from '../loggingHandler'

// Mock AWS SDK
const mockPutLogEvents = vi.fn()
const mockCreateLogStream = vi.fn()
const mockDescribeLogStreams = vi.fn()

vi.mock('@aws-sdk/client-cloudwatch-logs', () => ({
  CloudWatchLogsClient: vi.fn(() => ({
    send: vi.fn((command) => {
      if (command.constructor.name === 'PutLogEventsCommand') {
        return mockPutLogEvents(command)
      } else if (command.constructor.name === 'CreateLogStreamCommand') {
        return mockCreateLogStream(command)
      } else if (command.constructor.name === 'DescribeLogStreamsCommand') {
        return mockDescribeLogStreams(command)
      }
      return Promise.resolve({})
    })
  })),
  PutLogEventsCommand: vi.fn(),
  CreateLogStreamCommand: vi.fn(),
  DescribeLogStreamsCommand: vi.fn(),
}))

describe('CloudWatch Logging Handler', () => {
  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
    memoryLimitInMB: '128',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/test-function',
    logStreamName: 'test-stream',
    getRemainingTimeInMillis: () => 30000,
    done: vi.fn(),
    fail: vi.fn(),
    succeed: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.AWS_REGION = 'us-east-1'
    
    // Mock successful log stream creation
    mockDescribeLogStreams.mockResolvedValue({
      logStreams: [
        {
          logStreamName: 'test-stream',
          uploadSequenceToken: 'test-token-123'
        }
      ]
    })
    
    // Mock successful log event putting
    mockPutLogEvents.mockResolvedValue({
      nextSequenceToken: 'test-token-456'
    })
  })

  afterEach(() => {
    delete process.env.AWS_REGION
  })

  describe('HTTP Method Validation', () => {
    it('should reject non-POST requests', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/logs',
        headers: {},
        body: null,
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        isBase64Encoded: false,
      }

      const result = await handler(event, mockContext)

      expect(result.statusCode).toBe(405)
      expect(JSON.parse(result.body)).toEqual({
        error: {
          message: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED'
        }
      })
    })

    it('should accept POST requests', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/logs',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'INFO',
          message: 'Test message',
          metadata: {}
        }),
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        isBase64Encoded: false,
      }

      const result = await handler(event, mockContext)

      expect(result.statusCode).toBe(201)
    })
  })

  describe('Request Body Validation', () => {
    it('should reject empty body', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/logs',
        headers: { 'Content-Type': 'application/json' },
        body: null,
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        isBase64Encoded: false,
      }

      const result = await handler(event, mockContext)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error: {
          message: 'Request body is required',
          code: 'MISSING_BODY'
        }
      })
    })

    it('should reject invalid JSON', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/logs',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        isBase64Encoded: false,
      }

      const result = await handler(event, mockContext)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error: {
          message: 'Invalid JSON in request body',
          code: 'INVALID_JSON'
        }
      })
    })

    it('should reject missing required fields', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/logs',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'INFO',
          // missing message field
          metadata: {}
        }),
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        isBase64Encoded: false,
      }

      const result = await handler(event, mockContext)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error: {
          message: 'Missing required fields: message',
          code: 'MISSING_FIELDS'
        }
      })
    })

    it('should reject invalid log level', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/logs',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'INVALID_LEVEL',
          message: 'Test message',
          metadata: {}
        }),
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        isBase64Encoded: false,
      }

      const result = await handler(event, mockContext)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error: {
          message: 'Invalid log level. Must be one of: DEBUG, INFO, WARN, ERROR',
          code: 'INVALID_LOG_LEVEL'
        }
      })
    })
  })

  describe('Log Level Processing', () => {
    const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR']

    validLevels.forEach(level => {
      it(`should accept ${level} log level`, async () => {
        const event: APIGatewayProxyEvent = {
          httpMethod: 'POST',
          path: '/logs',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level,
            message: 'Test message',
            metadata: {}
          }),
          pathParameters: null,
          queryStringParameters: null,
          multiValueHeaders: {},
          multiValueQueryStringParameters: null,
          stageVariables: null,
          requestContext: {} as any,
          resource: '',
          isBase64Encoded: false,
        }

        const result = await handler(event, mockContext)

        expect(result.statusCode).toBe(201)
        expect(mockPutLogEvents).toHaveBeenCalled()
      })
    })

    it('should route ERROR logs to rewind-app-errors log group', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/logs',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'ERROR',
          message: 'Test error message',
          metadata: {
            endpoint: '/api/test',
            status: 500,
            error: 'Internal server error'
          }
        }),
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        isBase64Encoded: false,
      }

      const result = await handler(event, mockContext)

      expect(result.statusCode).toBe(201)
      expect(mockDescribeLogStreams).toHaveBeenCalledWith(
        expect.objectContaining({
          logGroupName: 'rewind-app-errors'
        })
      )
    })

    it('should route INFO logs to rewind-app-general log group', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/logs',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'INFO',
          message: 'Test info message',
          metadata: {}
        }),
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        isBase64Encoded: false,
      }

      const result = await handler(event, mockContext)

      expect(result.statusCode).toBe(201)
      expect(mockDescribeLogStreams).toHaveBeenCalledWith(
        expect.objectContaining({
          logGroupName: 'rewind-app-general'
        })
      )
    })
  })

  describe('CloudWatch Integration', () => {
    it('should create log stream if it does not exist', async () => {
      // Mock no existing log streams
      mockDescribeLogStreams.mockResolvedValue({
        logStreams: []
      })

      // Mock successful log stream creation
      mockCreateLogStream.mockResolvedValue({})

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/logs',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'INFO',
          message: 'Test message',
          metadata: {}
        }),
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        isBase64Encoded: false,
      }

      const result = await handler(event, mockContext)

      expect(result.statusCode).toBe(201)
      expect(mockCreateLogStream).toHaveBeenCalled()
      expect(mockPutLogEvents).toHaveBeenCalled()
    })

    it('should use existing log stream if it exists', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/logs',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'INFO',
          message: 'Test message',
          metadata: {}
        }),
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        isBase64Encoded: false,
      }

      const result = await handler(event, mockContext)

      expect(result.statusCode).toBe(201)
      expect(mockCreateLogStream).not.toHaveBeenCalled()
      expect(mockPutLogEvents).toHaveBeenCalled()
    })

    it('should handle CloudWatch errors gracefully', async () => {
      // Mock CloudWatch error
      mockPutLogEvents.mockRejectedValue(new Error('CloudWatch error'))

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/logs',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'INFO',
          message: 'Test message',
          metadata: {}
        }),
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        isBase64Encoded: false,
      }

      const result = await handler(event, mockContext)

      expect(result.statusCode).toBe(500)
      expect(JSON.parse(result.body)).toEqual({
        error: {
          message: 'Failed to send logs to CloudWatch',
          code: 'CLOUDWATCH_ERROR'
        }
      })
    })
  })

  describe('Metadata Handling', () => {
    it('should properly structure log events with metadata', async () => {
      const metadata = {
        endpoint: '/api/episodes',
        status: 200,
        responseTime: 150,
        userId: 'user123',
        sessionId: 'session456'
      }

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/logs',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'INFO',
          message: 'API call successful',
          metadata
        }),
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        isBase64Encoded: false,
      }

      const result = await handler(event, mockContext)

      expect(result.statusCode).toBe(201)
      expect(mockPutLogEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          logEvents: expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringContaining('API call successful'),
              timestamp: expect.any(Number)
            })
          ])
        })
      )
    })

    it('should handle empty metadata', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/logs',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'INFO',
          message: 'Simple log message',
          metadata: {}
        }),
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        isBase64Encoded: false,
      }

      const result = await handler(event, mockContext)

      expect(result.statusCode).toBe(201)
      expect(mockPutLogEvents).toHaveBeenCalled()
    })
  })

  describe('Response Format', () => {
    it('should return proper success response', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/logs',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'INFO',
          message: 'Test message',
          metadata: {}
        }),
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        isBase64Encoded: false,
      }

      const result = await handler(event, mockContext)

      expect(result.statusCode).toBe(201)
      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      })

      const body = JSON.parse(result.body)
      expect(body).toEqual({
        success: true,
        message: 'Log sent successfully'
      })
    })

    it('should handle CORS preflight requests', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'OPTIONS',
        path: '/logs',
        headers: {},
        body: null,
        pathParameters: null,
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        isBase64Encoded: false,
      }

      const result = await handler(event, mockContext)

      expect(result.statusCode).toBe(200)
      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      })
    })
  })
})