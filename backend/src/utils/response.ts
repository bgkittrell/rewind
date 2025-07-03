import { APIResponse } from '../types'

export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200,
  path?: string,
): { statusCode: number; body: string; headers: any } {
  const response: APIResponse<T> = {
    data,
    timestamp: new Date().toISOString(),
    path,
  }

  return {
    statusCode,
    body: JSON.stringify(response),
    headers: createCorsHeaders(),
  }
}

export function createErrorResponse(
  message: string,
  code: string,
  statusCode: number = 500,
  path?: string,
  details?: any,
): { statusCode: number; body: string; headers: any } {
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
    headers: createCorsHeaders(),
  }
}

export function createCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'false',
    'Content-Type': 'application/json',
  }
}

export function createResponse(statusCode: number, body: any): { statusCode: number; body: string; headers: any } {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: createCorsHeaders(),
  }
}
