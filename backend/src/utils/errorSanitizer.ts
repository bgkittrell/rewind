import { APIResponse } from '../types'

export interface SanitizedError {
  message: string
  code: string
  timestamp: string
  path?: string
  details?: string
}

/**
 * Sanitize error messages to prevent sensitive information leakage
 */
export const sanitizeError = (error: unknown, path?: string): SanitizedError => {
  const timestamp = new Date().toISOString()

  // Default sanitized error
  const defaultError: SanitizedError = {
    message: 'An internal error occurred',
    code: 'INTERNAL_ERROR',
    timestamp,
    path,
  }

  if (error instanceof Error) {
    // Check if it's a validation error (safe to expose)
    if (
      error.message.includes('Validation failed') ||
      error.message.includes('validation failed') ||
      error.message.includes('required') ||
      error.message.includes('Invalid')
    ) {
      return {
        message: error.message,
        code: 'VALIDATION_ERROR',
        timestamp,
        path,
      }
    }

    // Check if it's an authentication error (safe to expose)
    if (
      error.message.includes('Unauthorized') ||
      error.message.includes('unauthorized') ||
      error.message.includes('authentication') ||
      error.message.includes('token')
    ) {
      return {
        message: 'Unauthorized access',
        code: 'UNAUTHORIZED',
        timestamp,
        path,
      }
    }

    // Check if it's a rate limiting error (safe to expose)
    if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
      return {
        message: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        timestamp,
        path,
      }
    }

    // Check if it's a not found error (safe to expose)
    if (
      error.message.includes('not found') ||
      error.message.includes('Not found') ||
      error.message.includes('does not exist')
    ) {
      return {
        message: 'Resource not found',
        code: 'NOT_FOUND',
        timestamp,
        path,
      }
    }

    // Check if it's a bad request error (safe to expose)
    if (
      error.message.includes('bad request') ||
      error.message.includes('Bad request') ||
      error.message.includes('invalid format') ||
      error.message.includes('malformed')
    ) {
      return {
        message: 'Bad request format',
        code: 'BAD_REQUEST',
        timestamp,
        path,
      }
    }

    // For development environment, include more details
    if (process.env.NODE_ENV === 'development') {
      return {
        message: error.message,
        code: 'INTERNAL_ERROR',
        timestamp,
        path,
        details: error.stack?.split('\n')[0] || 'No stack trace available',
      }
    }
  }

  // Log the actual error for debugging (but don't expose it)
  console.error('Sanitized error:', error)

  return defaultError
}

/**
 * Create a sanitized API response for errors
 */
export const createErrorResponse = (
  error: unknown,
  statusCode: number = 500,
  path?: string,
): {
  statusCode: number
  headers: Record<string, string>
  body: string
} => {
  const sanitizedError = sanitizeError(error, path)

  const response: APIResponse = {
    error: sanitizedError,
    timestamp: sanitizedError.timestamp,
    path: sanitizedError.path,
  }

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(response),
  }
}

/**
 * Sanitize user input to prevent injection attacks
 */
export const sanitizeUserInput = (input: string, maxLength: number = 1000): string => {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string')
  }

  return (
    input
      // Remove HTML/XML tags
      .replace(/<[^>]*>/g, '')
      // Remove script tags content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove potentially dangerous characters
      .replace(/[<>'"&]/g, '')
      // Remove control characters (non-printable ASCII)
      .replace(/[^\x20-\x7E]/g, '')
      // Remove SQL injection patterns
      .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi, '')
      // Limit length
      .slice(0, maxLength)
      .trim()
  )
}

/**
 * Validate and sanitize JSON input
 */
export const sanitizeJsonInput = (jsonString: string, maxSize: number = 100000): unknown => {
  if (typeof jsonString !== 'string') {
    throw new Error('Input must be a string')
  }

  if (jsonString.length > maxSize) {
    throw new Error('JSON input too large')
  }

  try {
    const parsed = JSON.parse(jsonString)

    // Recursively sanitize string values in the object
    return sanitizeObjectStrings(parsed)
  } catch (error) {
    throw new Error('Invalid JSON format')
  }
}

/**
 * Recursively sanitize string values in an object
 */
const sanitizeObjectStrings = (obj: unknown): unknown => {
  if (typeof obj === 'string') {
    return sanitizeUserInput(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectStrings)
  }

  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize both key and value
      const sanitizedKey = sanitizeUserInput(key, 100)
      sanitized[sanitizedKey] = sanitizeObjectStrings(value)
    }
    return sanitized
  }

  return obj
}

/**
 * Create safe log messages that don't expose sensitive data
 */
export const createSafeLogMessage = (message: string, data?: unknown): string => {
  const sanitizedMessage = sanitizeUserInput(message, 500)

  if (!data) {
    return sanitizedMessage
  }

  // Only log safe properties
  const safeData: Record<string, unknown> = {}

  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>

    // Whitelist of safe properties to log
    const safeProperties = [
      'userId',
      'episodeId',
      'podcastId',
      'action',
      'timestamp',
      'path',
      'method',
      'statusCode',
      'limit',
      'filters',
    ]

    for (const prop of safeProperties) {
      if (prop in obj && obj[prop] !== undefined) {
        safeData[prop] = typeof obj[prop] === 'string' ? sanitizeUserInput(obj[prop] as string, 100) : obj[prop]
      }
    }
  }

  return `${sanitizedMessage} | Data: ${JSON.stringify(safeData)}`
}

/**
 * Rate limiting error response
 */
export const createRateLimitResponse = (
  retryAfter: number = 60,
): {
  statusCode: number
  headers: Record<string, string>
  body: string
} => {
  const timestamp = new Date().toISOString()
  const response: APIResponse = {
    error: {
      message: 'Rate limit exceeded. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    timestamp,
  }

  return {
    statusCode: 429,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Retry-After': retryAfter.toString(),
    },
    body: JSON.stringify(response),
  }
}
