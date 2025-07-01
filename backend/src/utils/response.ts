import { APIGatewayProxyResult } from 'aws-lambda'

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
}

export interface ErrorResponse {
  error: {
    message: string
    code: string
    details: Record<string, any>
  }
  timestamp: string
  path?: string
}

export function createSuccessResponse(
  data: any,
  statusCode: number = 200,
  additionalHeaders: Record<string, string> = {}
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { ...DEFAULT_HEADERS, ...additionalHeaders },
    body: JSON.stringify(data),
  }
}

export function createErrorResponse(
  message: string,
  statusCode: number,
  code: string = 'ERROR',
  details: Record<string, any> = {},
  path?: string
): APIGatewayProxyResult {
  const errorResponse: ErrorResponse = {
    error: {
      message,
      code,
      details,
    },
    timestamp: new Date().toISOString(),
    path,
  }

  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(errorResponse),
  }
}

// Specific error response creators
export function createBadRequestResponse(message: string, details: Record<string, any> = {}) {
  return createErrorResponse(message, 400, 'BAD_REQUEST', details)
}

export function createUnauthorizedResponse(message: string = 'Unauthorized') {
  return createErrorResponse(message, 401, 'UNAUTHORIZED')
}

export function createForbiddenResponse(message: string = 'Forbidden') {
  return createErrorResponse(message, 403, 'FORBIDDEN')
}

export function createNotFoundResponse(message: string = 'Resource not found') {
  return createErrorResponse(message, 404, 'NOT_FOUND')
}

export function createConflictResponse(message: string, details: Record<string, any> = {}) {
  return createErrorResponse(message, 409, 'CONFLICT', details)
}

export function createInternalServerErrorResponse(message: string = 'Internal server error') {
  return createErrorResponse(message, 500, 'INTERNAL_SERVER_ERROR')
}

export function createValidationErrorResponse(errors: string[]) {
  return createErrorResponse(
    'Validation failed',
    400,
    'VALIDATION_ERROR',
    { validationErrors: errors }
  )
}

// CORS preflight response
export function createOptionsResponse(): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: DEFAULT_HEADERS,
    body: '',
  }
}

// Pagination response helper
export function createPaginatedResponse(
  items: any[],
  total: number,
  hasMore: boolean,
  nextToken?: string
) {
  return {
    items,
    total,
    hasMore,
    nextToken,
  }
}