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
  // In production, this should come from environment variables
  // For now, we'll use localhost origins and the production domain
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'https://rewind.example.com']

  // For simplicity, we'll use the first origin. In a real app, you'd check the request origin
  const origin = allowedOrigins[0]

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
    // Security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  }
}

export function createResponse(statusCode: number, body: any): { statusCode: number; body: string; headers: any } {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: createCorsHeaders(),
  }
}
