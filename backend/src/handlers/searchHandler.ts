import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { createSuccessResponse, createErrorResponse, createCorsHeaders } from '../utils/response'
import { searchService } from '../services/searchService'
import { SearchQuery } from '../types/search'

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const headers = createCorsHeaders()

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
    const userId = event.requestContext.authorizer?.claims?.sub
    if (!userId) {
      return createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401, event.path)
    }

    // Extract and validate query parameters
    const queryParams = event.queryStringParameters || {}

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
  } catch (error: any) {
    console.error('Search handler error:', error)

    // Handle specific error types
    if (error.message?.includes('Search query too long')) {
      return createErrorResponse(error.message, 'VALIDATION_ERROR', 400, event.path)
    }

    if (error.message?.includes('not found')) {
      return createErrorResponse(error.message, 'NOT_FOUND', 404, event.path)
    }

    return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500, event.path)
  }
}
