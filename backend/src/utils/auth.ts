import { APIGatewayProxyEvent } from 'aws-lambda'

export interface CognitoUser {
  userId: string
  email: string
  name: string
  sub: string
}

/**
 * Extract user information from Cognito JWT token in API Gateway event
 * In a real implementation, API Gateway would validate the JWT and pass claims
 */
export function extractUserFromEvent(event: APIGatewayProxyEvent): CognitoUser | null {
  try {
    // In API Gateway with Cognito authorizer, user info is in requestContext.authorizer.claims
    const claims = event.requestContext?.authorizer?.claims
    
    if (!claims) {
      console.log('No Cognito claims found in request context')
      return null
    }

    return {
      userId: claims.sub,
      email: claims.email,
      name: claims.name || claims.email,
      sub: claims.sub,
    }
  } catch (error) {
    console.error('Error extracting user from event:', error)
    return null
  }
}

/**
 * Check if the request is authenticated
 */
export function isAuthenticated(event: APIGatewayProxyEvent): boolean {
  const user = extractUserFromEvent(event)
  return user !== null
}

/**
 * Get Authorization header value
 */
export function getAuthorizationHeader(event: APIGatewayProxyEvent): string | null {
  const headers = event.headers || {}
  
  // Check both capitalized and lowercase header names
  return headers.Authorization || headers.authorization || null
}

/**
 * Validate that user owns the resource (for user-scoped operations)
 */
export function validateUserOwnership(requestUserId: string, resourceUserId: string): boolean {
  return requestUserId === resourceUserId
}

/**
 * Create a 401 Unauthorized response
 */
export function createUnauthorizedResponse(message: string = 'Unauthorized') {
  return {
    statusCode: 401,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      error: {
        message,
        code: 'UNAUTHORIZED',
        details: {},
      },
      timestamp: new Date().toISOString(),
    }),
  }
}

/**
 * Create a 403 Forbidden response
 */
export function createForbiddenResponse(message: string = 'Forbidden') {
  return {
    statusCode: 403,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      error: {
        message,
        code: 'FORBIDDEN',
        details: {},
      },
      timestamp: new Date().toISOString(),
    }),
  }
}