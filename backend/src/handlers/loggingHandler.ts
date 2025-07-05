import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand, DescribeLogStreamsCommand } from '@aws-sdk/client-cloudwatch-logs'
import { createResponse, createErrorResponse } from '../utils/response'

const cloudWatchLogs = new CloudWatchLogsClient({ region: process.env.AWS_REGION || 'us-east-1' })

interface LogEvent {
  level: string
  message: string
  metadata?: {
    endpoint?: string
    status?: number
    headers?: Record<string, string>
    userId?: string
    sessionId?: string
    error?: string
    responseTime?: number
    [key: string]: any
  }
  timestamp: string
  url: string
  userAgent: string
}

interface LogRequest {
  level: string
  message: string
  metadata: Record<string, any>
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Logging request:', JSON.stringify(event, null, 2))

  try {
    const path = event.path
    const method = event.httpMethod

    // Only handle POST requests to /logs
    if (!path.includes('/logs') || method !== 'POST') {
      return createErrorResponse('Endpoint not found', 'NOT_FOUND', 404)
    }

    if (!event.body) {
      return createErrorResponse('Request body is required', 'MISSING_BODY', 400)
    }

    const logRequest: LogRequest = JSON.parse(event.body)
    
    // Validate required fields
    if (!logRequest.level || !logRequest.message) {
      return createErrorResponse('Level and message are required', 'VALIDATION_ERROR', 400)
    }

    // Create the log event
    const logEvent: LogEvent = {
      level: logRequest.level,
      message: logRequest.message,
      metadata: {
        ...logRequest.metadata,
        timestamp: new Date().toISOString(),
        url: logRequest.metadata?.url || 'unknown',
        userAgent: logRequest.metadata?.userAgent || 'unknown'
      },
      timestamp: new Date().toISOString(),
      url: logRequest.metadata?.url || 'unknown',
      userAgent: logRequest.metadata?.userAgent || 'unknown'
    }

    // Determine log group based on level
    const logGroupName = getLogGroupName(logRequest.level)
    
    // Send to CloudWatch Logs
    await sendToCloudWatch(logGroupName, logEvent)

    return createResponse(200, { 
      success: true, 
      message: 'Log sent successfully',
      logGroup: logGroupName
    })

  } catch (error) {
    console.error('Logging error:', error)
    
    if (error instanceof SyntaxError) {
      return createErrorResponse('Invalid JSON in request body', 'INVALID_JSON', 400)
    }
    
    return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500)
  }
}

function getLogGroupName(level: string): string {
  switch (level.toUpperCase()) {
    case 'AUTH_ERROR':
      return '/rewind/auth-errors'
    case 'API_ERROR':
    case 'ERROR':
      return '/rewind/browser-errors'
    case 'API_CALL':
      return '/rewind/api-calls'
    default:
      return '/rewind/browser-logs'
  }
}

async function sendToCloudWatch(logGroupName: string, logEvent: LogEvent): Promise<void> {
  try {
    // Create log stream name based on date
    const logStreamName = `rewind-${new Date().toISOString().split('T')[0]}-${Math.random().toString(36).substr(2, 9)}`
    
    // Ensure log stream exists
    await ensureLogStreamExists(logGroupName, logStreamName)
    
    // Prepare log event for CloudWatch
    const cloudWatchLogEvent = {
      timestamp: Date.now(),
      message: JSON.stringify(logEvent)
    }

    // Send to CloudWatch
    const command = new PutLogEventsCommand({
      logGroupName,
      logStreamName,
      logEvents: [cloudWatchLogEvent]
    })

    await cloudWatchLogs.send(command)
    console.log(`Log sent to CloudWatch: ${logGroupName}/${logStreamName}`)

  } catch (error) {
    console.error('Failed to send log to CloudWatch:', error)
    // Don't throw - we don't want logging failures to break the app
  }
}

async function ensureLogStreamExists(logGroupName: string, logStreamName: string): Promise<void> {
  try {
    // Check if log stream exists
    const describeCommand = new DescribeLogStreamsCommand({
      logGroupName,
      logStreamNamePrefix: logStreamName
    })

    const result = await cloudWatchLogs.send(describeCommand)
    
    // If log stream doesn't exist, create it
    if (!result.logStreams || result.logStreams.length === 0) {
      const createCommand = new CreateLogStreamCommand({
        logGroupName,
        logStreamName
      })
      
      await cloudWatchLogs.send(createCommand)
      console.log(`Created log stream: ${logGroupName}/${logStreamName}`)
    }
  } catch (error) {
    console.error('Error ensuring log stream exists:', error)
    // If we can't create the log stream, try to continue anyway
  }
}