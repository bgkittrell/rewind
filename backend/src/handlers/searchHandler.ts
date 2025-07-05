import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { createSuccessResponse, createErrorResponse, createCorsHeaders } from '../utils/response'
import { searchService } from '../services/searchService'

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

    const method = event.httpMethod
    const path = event.path

    // Extract user ID from JWT claims (API Gateway populates this)
    const userId = event.requestContext.authorizer?.claims?.sub
    if (!userId) {
      return createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401, event.path)
    }

    // Only support GET requests for search
    if (method !== 'GET') {
      return createErrorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405, path)
    }

    return await handleSearch(userId, event.queryStringParameters, path)
  } catch (error) {
    console.error('Search handler error:', error)
    return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500, event.path)
  }
}

async function handleSearch(
  userId: string,
  queryParams: { [key: string]: string | undefined } | null,
  path: string,
): Promise<APIGatewayProxyResult> {
  try {
    // Validate required query parameter
    const query = queryParams?.q
    if (!query) {
      return createErrorResponse('Query parameter "q" is required', 'VALIDATION_ERROR', 400, path)
    }

    // Validate query length
    if (query.length < 2) {
      return createErrorResponse('Query must be at least 2 characters long', 'VALIDATION_ERROR', 400, path)
    }

    if (query.length > 200) {
      return createErrorResponse('Query must be less than 200 characters', 'VALIDATION_ERROR', 400, path)
    }

    // Parse optional parameters
    const limitStr = queryParams?.limit || '20'
    const offsetStr = queryParams?.offset || '0'
    const type = (queryParams?.type as 'episodes' | 'podcasts' | 'all') || 'episodes'

    // Validate type parameter
    if (!['episodes', 'podcasts', 'all'].includes(type)) {
      return createErrorResponse('Type must be one of: episodes, podcasts, all', 'VALIDATION_ERROR', 400, path)
    }

    // Parse and validate limit parameter
    const limit = parseInt(limitStr, 10)
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return createErrorResponse('Limit must be between 1 and 50', 'VALIDATION_ERROR', 400, path)
    }

    // Parse and validate offset parameter
    const offset = parseInt(offsetStr, 10)
    if (isNaN(offset) || offset < 0) {
      return createErrorResponse('Offset must be a non-negative number', 'VALIDATION_ERROR', 400, path)
    }

    // Perform search
    const searchResults = await searchService.searchEpisodes(userId, query, limit, offset, type)

    const response = {
      query,
      type,
      results: searchResults.results,
      pagination: searchResults.pagination,
      timestamp: new Date().toISOString(),
    }

    return createSuccessResponse(response, 200, path)
  } catch (error: any) {
    console.error('Search error:', error)

    // Handle specific error types
    if (error.message === 'Search failed') {
      return createErrorResponse('Search service temporarily unavailable', 'SERVICE_ERROR', 503, path)
    }

    return createErrorResponse('Failed to perform search', 'INTERNAL_ERROR', 500, path)
  }
}
