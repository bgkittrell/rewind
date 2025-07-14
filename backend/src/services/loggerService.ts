import { APIGatewayProxyEvent } from 'aws-lambda'
import { v4 as uuidv4 } from 'uuid'

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogContext {
  correlationId?: string
  requestId?: string
  userId?: string
  method?: string
  path?: string
  statusCode?: number
  duration?: number
  error?: unknown
  [key: string]: unknown
}

interface LogMessage {
  timestamp: string
  level: LogLevel
  correlationId: string
  message: string
  context: LogContext
}

class Logger {
  private static instance: Logger
  private correlationId: string
  private defaultContext: LogContext = {}

  private constructor() {
    this.correlationId = uuidv4()
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  public setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId
  }

  public generateCorrelationId(): string {
    this.correlationId = uuidv4()
    return this.correlationId
  }

  public setDefaultContext(context: LogContext): void {
    this.defaultContext = { ...this.defaultContext, ...context }
  }

  public extractRequestContext(event: APIGatewayProxyEvent): LogContext {
    const correlationId =
      event.headers?.['x-correlation-id'] || event.headers?.['X-Correlation-Id'] || this.generateCorrelationId()

    this.setCorrelationId(correlationId)

    return {
      correlationId,
      requestId: event.requestContext?.requestId,
      method: event.httpMethod,
      path: event.path,
      userId: event.requestContext?.authorizer?.claims?.sub,
      userAgent: event.headers?.['User-Agent'] || event.headers?.['user-agent'],
      sourceIp: event.requestContext?.identity?.sourceIp,
    }
  }

  private formatLog(level: LogLevel, message: string, context: LogContext = {}): LogMessage {
    return {
      timestamp: new Date().toISOString(),
      level,
      correlationId: this.correlationId,
      message,
      context: {
        ...this.defaultContext,
        ...context,
        correlationId: this.correlationId,
      },
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const envLevel = process.env.LOG_LEVEL || 'INFO'
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR']
    return levels.indexOf(level) >= levels.indexOf(envLevel)
  }

  private log(level: LogLevel, message: string, context: LogContext = {}): void {
    if (!this.shouldLog(level)) {
      return
    }

    const logMessage = this.formatLog(level, message, context)

    // In production, these will be captured by CloudWatch
    // Using JSON.stringify for structured logging
    console.log(JSON.stringify(logMessage))
  }

  public debug(message: string, context: LogContext = {}): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  public info(message: string, context: LogContext = {}): void {
    this.log(LogLevel.INFO, message, context)
  }

  public warn(message: string, context: LogContext = {}): void {
    this.log(LogLevel.WARN, message, context)
  }

  public error(message: string, error?: unknown, context: LogContext = {}): void {
    const errorInfo = this.extractErrorInfo(error)
    this.log(LogLevel.ERROR, message, {
      ...context,
      error: errorInfo,
    })
  }

  private extractErrorInfo(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }

    if (typeof error === 'object' && error !== null) {
      return error as Record<string, unknown>
    }

    return { error: String(error) }
  }

  public logRequest(event: APIGatewayProxyEvent): void {
    const context = this.extractRequestContext(event)
    this.setDefaultContext(context)

    this.info('Incoming request', {
      ...context,
      queryParams: event.queryStringParameters,
      pathParams: event.pathParameters,
      headers: this.sanitizeHeaders(event.headers as Record<string, string> | null),
    })
  }

  public logResponse(statusCode: number, duration: number, body?: unknown): void {
    this.info('Request completed', {
      statusCode,
      duration,
      responseSize: body ? JSON.stringify(body).length : 0,
    })
  }

  private sanitizeHeaders(headers: Record<string, string> | null): Record<string, string> {
    if (!headers) return {}

    const sanitized = { ...headers }
    // Remove sensitive headers
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'x-auth-token']

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]'
      }
      // Check case-insensitive
      const lowerHeader = header.toLowerCase()
      for (const key in sanitized) {
        if (key.toLowerCase() === lowerHeader) {
          sanitized[key] = '[REDACTED]'
        }
      }
    }

    return sanitized
  }
}

// Export singleton instance
export const logger = Logger.getInstance()

// Export for testing
export { Logger }
