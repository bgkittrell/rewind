import { APIResponse } from '../types'

export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200,
  path?: string,
): { statusCode: number; body: string } {
  const response: APIResponse<T> = {
    data,
    timestamp: new Date().toISOString(),
    path,
  }

  return {
    statusCode,
    body: JSON.stringify(response),
  }
}

export function createErrorResponse(
  message: string,
  code: string,
  statusCode: number = 500,
  path?: string,
  details?: any,
): { statusCode: number; body: string } {
  const response: APIResponse = {
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
    body: JSON.stringify(response),
  }
}

export function createCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json',
  }
}
