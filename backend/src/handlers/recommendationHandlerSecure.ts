import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { APIResponse, APIGatewayAuthorizerEvent, RecommendationFilters } from '../types'
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
import {
  createErrorResponse,
  createRateLimitResponse,
  createSafeLogMessage,
} from '../utils/errorSanitizer'

/**
 * Get personalized episode recommendations for a user
 * Enhanced with validation, rate limiting, and security
 */
export const getRecommendations = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract and validate user from authorizer
    const authorizer = event.requestContext.authorizer as APIGatewayAuthorizerEvent
    const rawUserId = authorizer?.userId

    if (!rawUserId) {
      return createErrorResponse(new Error('Unauthorized'), 401, event.path)
    }

    const userId = validateUserId(rawUserId)

    // Check rate limiting
    const rateLimitResult = await rateLimitService.isRequestAllowed(userId, 'recommendations')
    if (!rateLimitResult.allowed) {
      console.log(createSafeLogMessage('Rate limit exceeded', { 
        userId, 
        endpoint: 'recommendations',
        retryAfter: rateLimitResult.retryAfter 
      }))
      return createRateLimitResponse(rateLimitResult.retryAfter)
    }

    // Validate and parse query parameters
    const queryParams = validateQueryParams(
      event.queryStringParameters as Record<string, string> | null
    )
    
    const filters: RecommendationFilters = {
      not_recent: queryParams.not_recent,
      favorites: queryParams.favorites,
      guests: queryParams.guests,
      new: queryParams.new,
    }

    // Log safe request details
    console.log(createSafeLogMessage('Getting recommendations', {
      userId,
      limit: queryParams.limit,
      filters,
      path: event.path,
    }))

    // Get recommendations
    const recommendations = await recommendationService.getRecommendations(
      userId, 
      queryParams.limit,
      Object.values(filters).some(Boolean) ? filters : undefined
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
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      },
      body: JSON.stringify(response),
    }

  } catch (error) {
    console.error(createSafeLogMessage('Error getting recommendations', { 
      path: event.path,
      error: error instanceof Error ? error.message : 'Unknown error'
    }))

    return createErrorResponse(error, 500, event.path)
  }
}

/**
 * Extract guests from episode using AI
 * Enhanced with validation, rate limiting, and security
 */
export const extractGuests = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract and validate user from authorizer
    const authorizer = event.requestContext.authorizer as APIGatewayAuthorizerEvent
    const rawUserId = authorizer?.userId

    if (!rawUserId) {
      return createErrorResponse(new Error('Unauthorized'), 401, event.path)
    }

    const userId = validateUserId(rawUserId)

    // Check rate limiting for AI endpoints (more restrictive)
    const rateLimitResult = await rateLimitService.isRequestAllowed(userId, 'extract-guests')
    if (!rateLimitResult.allowed) {
      console.log(createSafeLogMessage('Rate limit exceeded for AI endpoint', { 
        userId, 
        endpoint: 'extract-guests',
        retryAfter: rateLimitResult.retryAfter 
      }))
      return createRateLimitResponse(rateLimitResult.retryAfter)
    }

    // Validate request body
    const extractionRequest = validateRequestBody(guestExtractionRequestSchema, event.body)

    // Additional content validation and sanitization for AI processing
    const sanitizedContent = validateContentForAI(
      extractionRequest.title, 
      extractionRequest.description
    )

    // Log safe request details
    console.log(createSafeLogMessage('Extracting guests with AI', {
      userId,
      episodeId: extractionRequest.episodeId,
      titleLength: sanitizedContent.title.length,
      descriptionLength: sanitizedContent.description.length,
      path: event.path,
    }))

    // Extract guests using AI with sanitized content
    const result = await bedrockService.extractGuests({
      episodeId: extractionRequest.episodeId,
      title: sanitizedContent.title,
      description: sanitizedContent.description,
    })

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
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      },
      body: JSON.stringify(response),
    }

  } catch (error) {
    console.error(createSafeLogMessage('Error extracting guests', { 
      path: event.path,
      error: error instanceof Error ? error.message : 'Unknown error'
    }))

    return createErrorResponse(error, 500, event.path)
  }
}

/**
 * Batch extract guests from multiple episodes
 * Enhanced with validation, rate limiting, and security
 */
export const batchExtractGuests = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract and validate user from authorizer
    const authorizer = event.requestContext.authorizer as APIGatewayAuthorizerEvent
    const rawUserId = authorizer?.userId

    if (!rawUserId) {
      return createErrorResponse(new Error('Unauthorized'), 401, event.path)
    }

    const userId = validateUserId(rawUserId)

    // Check rate limiting for batch AI endpoints (most restrictive)
    const rateLimitResult = await rateLimitService.isRequestAllowed(userId, 'batch-extract-guests')
    if (!rateLimitResult.allowed) {
      console.log(createSafeLogMessage('Rate limit exceeded for batch AI endpoint', { 
        userId, 
        endpoint: 'batch-extract-guests',
        retryAfter: rateLimitResult.retryAfter 
      }))
      return createRateLimitResponse(rateLimitResult.retryAfter)
    }

    // Validate request body
    const requests = validateRequestBody(batchGuestExtractionRequestSchema, event.body)

    // Sanitize all content for AI processing
    const sanitizedRequests = requests.map(request => {
      const sanitizedContent = validateContentForAI(request.title, request.description)
      return {
        episodeId: request.episodeId,
        title: sanitizedContent.title,
        description: sanitizedContent.description,
      }
    })

    // Log safe request details
    console.log(createSafeLogMessage('Batch extracting guests with AI', {
      userId,
      requestCount: sanitizedRequests.length,
      episodeIds: sanitizedRequests.map(r => r.episodeId),
      path: event.path,
    }))

    // Process batch extraction with sanitized content
    const results = await bedrockService.batchExtractGuests(sanitizedRequests)

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
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      },
      body: JSON.stringify(response),
    }

  } catch (error) {
    console.error(createSafeLogMessage('Error batch extracting guests', { 
      path: event.path,
      error: error instanceof Error ? error.message : 'Unknown error'
    }))

    return createErrorResponse(error, 500, event.path)
  }
}

/**
 * Update guest analytics when user interacts with an episode
 * Enhanced with validation, rate limiting, and security
 */
export const updateGuestAnalytics = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract and validate user from authorizer
    const authorizer = event.requestContext.authorizer as APIGatewayAuthorizerEvent
    const rawUserId = authorizer?.userId

    if (!rawUserId) {
      return createErrorResponse(new Error('Unauthorized'), 401, event.path)
    }

    const userId = validateUserId(rawUserId)

    // Check rate limiting
    const rateLimitResult = await rateLimitService.isRequestAllowed(userId, 'guest-analytics')
    if (!rateLimitResult.allowed) {
      console.log(createSafeLogMessage('Rate limit exceeded for guest analytics', { 
        userId, 
        endpoint: 'guest-analytics',
        retryAfter: rateLimitResult.retryAfter 
      }))
      return createRateLimitResponse(rateLimitResult.retryAfter)
    }

    // Validate request body
    const updateRequest = validateRequestBody(guestAnalyticsUpdateSchema, event.body)

    // Log safe request details
    console.log(createSafeLogMessage('Updating guest analytics', {
      userId,
      episodeId: updateRequest.episodeId,
      action: updateRequest.action,
      guestCount: updateRequest.guests.length,
      path: event.path,
    }))

    // Update guest analytics
    await recommendationService.updateGuestAnalytics(
      userId,
      updateRequest.episodeId,
      updateRequest.guests,
      updateRequest.action,
      updateRequest.rating,
    )

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
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      },
      body: JSON.stringify(response),
    }

  } catch (error) {
    console.error(createSafeLogMessage('Error updating guest analytics', { 
      path: event.path,
      error: error instanceof Error ? error.message : 'Unknown error'
    }))

    return createErrorResponse(error, 500, event.path)
  }
}