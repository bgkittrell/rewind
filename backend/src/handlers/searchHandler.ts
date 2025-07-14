import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { createSuccessResponse, createErrorResponse, createCorsHeaders } from '../utils/response'
import { searchService } from '../services/searchService'
import { SearchQuery } from '../types/search'
import { logger } from '../services/loggerService'
import { withLogging } from '../utils/middleware'

const searchHandler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const headers = createCorsHeaders()
  let userId: string | undefined
  let queryParams: Record<string, string | undefined> = {}

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      }
    }

    // Only allow GET method
    if (event.httpMethod !== 'GET') {
      return createErrorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405, event.path)
    }

    // Extract user ID from JWT claims (API Gateway populates this)
    userId = event.requestContext.authorizer?.claims?.sub
    if (!userId) {
      return createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401, event.path)
    }

    // Extract and validate query parameters
    queryParams = event.queryStringParameters || {}

    if (!queryParams.q) {
      return createErrorResponse('Search query is required', 'VALIDATION_ERROR', 400, event.path)
    }

    // Build search query object
    const searchQuery: SearchQuery = {
      query: queryParams.q,
      limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
      offset: queryParams.offset ? parseInt(queryParams.offset, 10) : undefined,
      podcastId: queryParams.podcastId,
    }

    // Validate numeric parameters
    if (searchQuery.limit !== undefined && (isNaN(searchQuery.limit) || searchQuery.limit <= 0)) {
      return createErrorResponse('Invalid limit parameter', 'VALIDATION_ERROR', 400, event.path)
    }

    if (searchQuery.offset !== undefined && (isNaN(searchQuery.offset) || searchQuery.offset < 0)) {
      return createErrorResponse('Invalid offset parameter', 'VALIDATION_ERROR', 400, event.path)
    }

    // Perform search
    const searchResponse = await searchService.searchEpisodes(userId, searchQuery)

    // Return results
    return createSuccessResponse(searchResponse, 200, event.path)
  } catch (error) {
    logger.error('Search handler error', error, { userId, query: queryParams?.q })

    // Handle specific error types
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (errorMessage.includes('Search query too long')) {
      return createErrorResponse(errorMessage, 'VALIDATION_ERROR', 400, event.path)
    }

    if (errorMessage.includes('not found')) {
      return createErrorResponse(errorMessage, 'NOT_FOUND', 404, event.path)
    }

    return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500, event.path)
  }
}

export const handler = withLogging(searchHandler)
