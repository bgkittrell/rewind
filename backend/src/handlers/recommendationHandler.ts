import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { APIResponse, RecommendationFilters, GuestExtractionRequest } from '../types'
import { recommendationService } from '../services/recommendationService'
import { bedrockService } from '../services/bedrockService'
import { rateLimitService } from '../services/rateLimitService'
import {
  validateQueryParams,
  validateRequestBody,
  guestExtractionRequestSchema,
  batchGuestExtractionRequestSchema,
  guestAnalyticsUpdateSchema,
  validateUserId,
  validateContentForAI,
} from '../validation/schemas'
import { createErrorResponse, createRateLimitResponse, createSafeLogMessage } from '../utils/errorSanitizer'

/**
 * Get personalized episode recommendations for a user
 */
export const getRecommendations = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user from authorizer
    const userId = event.requestContext.authorizer?.claims?.sub

    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            message: 'Unauthorized',
            code: 'UNAUTHORIZED',
          },
          timestamp: new Date().toISOString(),
        } as APIResponse),
      }
    }

    // Parse query parameters
    const limit = parseInt(event.queryStringParameters?.limit || '20')
    const filters: RecommendationFilters = {}

    if (event.queryStringParameters?.not_recent === 'true') filters.not_recent = true
    if (event.queryStringParameters?.favorites === 'true') filters.favorites = true
    if (event.queryStringParameters?.guests === 'true') filters.guests = true
    if (event.queryStringParameters?.new === 'true') filters.new = true

    // Get recommendations
    const recommendations = await recommendationService.getRecommendations(
      userId,
      Math.min(limit, 50), // Cap at 50 recommendations
      Object.keys(filters).length > 0 ? filters : undefined,
    )

    const response: APIResponse = {
      data: recommendations,
      timestamp: new Date().toISOString(),
      path: event.path,
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    }
  } catch (error) {
    console.error('Error getting recommendations:', error)

    const response: APIResponse = {
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
      path: event.path,
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    }
  }
}

/**
 * Extract guests from episode using AI
 */
export const extractGuests = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user from authorizer
    const userId = event.requestContext.authorizer?.claims?.sub

    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            message: 'Unauthorized',
            code: 'UNAUTHORIZED',
          },
          timestamp: new Date().toISOString(),
        } as APIResponse),
      }
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            message: 'Request body is required',
            code: 'MISSING_BODY',
          },
          timestamp: new Date().toISOString(),
        } as APIResponse),
      }
    }

    const extractionRequest: GuestExtractionRequest = JSON.parse(event.body)

    // Validate request
    if (!extractionRequest.episodeId || !extractionRequest.title || !extractionRequest.description) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            message: 'Missing required fields: episodeId, title, description',
            code: 'VALIDATION_ERROR',
          },
          timestamp: new Date().toISOString(),
        } as APIResponse),
      }
    }

    // Extract guests using AI
    const result = await bedrockService.extractGuests(extractionRequest)

    const response: APIResponse = {
      data: result,
      timestamp: new Date().toISOString(),
      path: event.path,
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    }
  } catch (error) {
    console.error('Error extracting guests:', error)

    const response: APIResponse = {
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
      path: event.path,
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    }
  }
}

/**
 * Batch extract guests from multiple episodes
 */
export const batchExtractGuests = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user from authorizer
    const userId = event.requestContext.authorizer?.claims?.sub

    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            message: 'Unauthorized',
            code: 'UNAUTHORIZED',
          },
          timestamp: new Date().toISOString(),
        } as APIResponse),
      }
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            message: 'Request body is required',
            code: 'MISSING_BODY',
          },
          timestamp: new Date().toISOString(),
        } as APIResponse),
      }
    }

    const requests: GuestExtractionRequest[] = JSON.parse(event.body)

    // Validate requests
    if (!Array.isArray(requests)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            message: 'Request body must be an array of extraction requests',
            code: 'VALIDATION_ERROR',
          },
          timestamp: new Date().toISOString(),
        } as APIResponse),
      }
    }

    // Limit batch size
    if (requests.length > 10) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            message: 'Batch size cannot exceed 10 requests',
            code: 'BATCH_TOO_LARGE',
          },
          timestamp: new Date().toISOString(),
        } as APIResponse),
      }
    }

    // Validate each request
    for (const request of requests) {
      if (!request.episodeId || !request.title || !request.description) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: {
              message: 'All requests must have episodeId, title, and description',
              code: 'VALIDATION_ERROR',
            },
            timestamp: new Date().toISOString(),
          } as APIResponse),
        }
      }
    }

    // Process batch extraction
    const results = await bedrockService.batchExtractGuests(requests)

    const response: APIResponse = {
      data: results,
      timestamp: new Date().toISOString(),
      path: event.path,
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    }
  } catch (error) {
    console.error('Error batch extracting guests:', error)

    const response: APIResponse = {
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
      path: event.path,
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    }
  }
}

/**
 * Update guest analytics when user interacts with an episode
 */
export const updateGuestAnalytics = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user from authorizer
    const userId = event.requestContext.authorizer?.claims?.sub

    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            message: 'Unauthorized',
            code: 'UNAUTHORIZED',
          },
          timestamp: new Date().toISOString(),
        } as APIResponse),
      }
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            message: 'Request body is required',
            code: 'MISSING_BODY',
          },
          timestamp: new Date().toISOString(),
        } as APIResponse),
      }
    }

    const { episodeId, guests, action, rating } = JSON.parse(event.body)

    // Validate request
    if (!episodeId || !guests || !action) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            message: 'Missing required fields: episodeId, guests, action',
            code: 'VALIDATION_ERROR',
          },
          timestamp: new Date().toISOString(),
        } as APIResponse),
      }
    }

    if (!['listen', 'favorite'].includes(action)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            message: 'Action must be either "listen" or "favorite"',
            code: 'VALIDATION_ERROR',
          },
          timestamp: new Date().toISOString(),
        } as APIResponse),
      }
    }

    if (!Array.isArray(guests)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            message: 'Guests must be an array of strings',
            code: 'VALIDATION_ERROR',
          },
          timestamp: new Date().toISOString(),
        } as APIResponse),
      }
    }

    // Update guest analytics
    await recommendationService.updateGuestAnalytics(userId, episodeId, guests, action, rating)

    const response: APIResponse = {
      data: { success: true },
      timestamp: new Date().toISOString(),
      path: event.path,
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    }
  } catch (error) {
    console.error('Error updating guest analytics:', error)

    const response: APIResponse = {
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
      path: event.path,
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    }
  }
}
