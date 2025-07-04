import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { recommendationService } from '../services/recommendationService'
import { RecommendationCategory, RecommendationFilters, FeedbackType } from '../types'
import { createSuccessResponse, createErrorResponse } from '../utils/response'

/**
 * Get personalized recommendations for a user
 */
export const getRecommendations = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user ID from Cognito authorizer
    const userId = event.requestContext.authorizer?.claims?.sub
    if (!userId) {
      return createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401, event.path)
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {}
    const filters: RecommendationFilters = {}

    // Parse limit
    if (queryParams.limit) {
      const limit = parseInt(queryParams.limit, 10)
      if (limit > 0 && limit <= 50) {
        filters.limit = limit
      }
    }

    // Parse category
    if (queryParams.category) {
      const category = queryParams.category as RecommendationCategory
      if (Object.values(RecommendationCategory).includes(category)) {
        filters.category = category
      }
    }

    // Parse age filters
    if (queryParams.minAge) {
      const minAge = parseInt(queryParams.minAge, 10)
      if (minAge >= 0) {
        filters.minAge = minAge
      }
    }

    if (queryParams.maxAge) {
      const maxAge = parseInt(queryParams.maxAge, 10)
      if (maxAge >= 0) {
        filters.maxAge = maxAge
      }
    }

    // Parse boolean filters
    if (queryParams.excludeListened) {
      filters.excludeListened = queryParams.excludeListened === 'true'
    }

    if (queryParams.includeIncomplete) {
      filters.includeIncomplete = queryParams.includeIncomplete === 'true'
    }

    // Parse preferred genres
    if (queryParams.genres) {
      filters.preferredGenres = queryParams.genres.split(',').map((g: string) => g.trim())
    }

    // Get recommendations
    const recommendations = await recommendationService.getBasicRecommendations(userId, filters)

    return createSuccessResponse({
      recommendations,
      total: recommendations.length,
      filters: filters
    }, 200, event.path)

  } catch (error) {
    console.error('Error getting recommendations:', error)
    return createErrorResponse('Failed to get recommendations', 'RECOMMENDATION_ERROR', 500, event.path)
  }
}

/**
 * Get recommendation categories
 */
export const getRecommendationCategories = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const categories = Object.values(RecommendationCategory).map(category => ({
      id: category,
      name: formatCategoryName(category),
      description: getCategoryDescription(category)
    }))

    return createSuccessResponse({ categories }, 200, event.path)

  } catch (error) {
    console.error('Error getting recommendation categories:', error)
    return createErrorResponse('Failed to get categories', 'CATEGORIES_ERROR', 500, event.path)
  }
}

/**
 * Submit feedback on recommendations
 */
export const submitRecommendationFeedback = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user ID from Cognito authorizer
    const userId = event.requestContext.authorizer?.claims?.sub
    if (!userId) {
      return createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401, event.path)
    }

    // Parse request body
    if (!event.body) {
      return createErrorResponse('Request body is required', 'MISSING_BODY', 400, event.path)
    }

    const body = JSON.parse(event.body)
    const { episodeId, podcastId, feedbackType, rating, comment } = body

    // Validate required fields
    if (!episodeId || !podcastId || !feedbackType) {
      return createErrorResponse('Missing required fields', 'MISSING_FIELDS', 400, event.path)
    }

    // Validate feedback type
    if (!Object.values(FeedbackType).includes(feedbackType)) {
      return createErrorResponse('Invalid feedback type', 'INVALID_FEEDBACK_TYPE', 400, event.path)
    }

    // Validate rating if provided
    if (rating !== undefined) {
      const ratingNum = parseInt(rating, 10)
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return createErrorResponse('Rating must be between 1 and 5', 'INVALID_RATING', 400, event.path)
      }
    }

    // Submit feedback
    await recommendationService.submitRecommendationFeedback(
      userId,
      episodeId,
      podcastId,
      feedbackType,
      rating,
      comment
    )

    return createSuccessResponse({ 
      message: 'Feedback submitted successfully',
      feedbackType,
      episodeId
    }, 200, event.path)

  } catch (error) {
    console.error('Error submitting feedback:', error)
    return createErrorResponse('Failed to submit feedback', 'FEEDBACK_ERROR', 500, event.path)
  }
}

/**
 * Get recommendations for a specific category
 */
export const getRecommendationsByCategory = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user ID from Cognito authorizer
    const userId = event.requestContext.authorizer?.claims?.sub
    if (!userId) {
      return createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401, event.path)
    }

    // Get category from path parameters
    const category = event.pathParameters?.category as RecommendationCategory
    if (!category || !Object.values(RecommendationCategory).includes(category)) {
      return createErrorResponse('Invalid category', 'INVALID_CATEGORY', 400, event.path)
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {}
    const filters: RecommendationFilters = { category }

    // Parse limit
    if (queryParams.limit) {
      const limit = parseInt(queryParams.limit, 10)
      if (limit > 0 && limit <= 50) {
        filters.limit = limit
      }
    }

    // Get recommendations for the category
    const recommendations = await recommendationService.getBasicRecommendations(userId, filters)

    return createSuccessResponse({
      recommendations,
      total: recommendations.length,
      category: category,
      categoryName: formatCategoryName(category)
    }, 200, event.path)

  } catch (error) {
    console.error('Error getting recommendations by category:', error)
    return createErrorResponse('Failed to get recommendations', 'CATEGORY_RECOMMENDATION_ERROR', 500, event.path)
  }
}

/**
 * Helper function to format category names for display
 */
function formatCategoryName(category: RecommendationCategory): string {
  switch (category) {
    case RecommendationCategory.REDISCOVERY:
      return 'Rediscovery'
    case RecommendationCategory.MISSED_GEMS:
      return 'Missed Gems'
    case RecommendationCategory.COMEDY_GOLD:
      return 'Comedy Gold'
    case RecommendationCategory.GUEST_FAVORITES:
      return 'Guest Favorites'
    case RecommendationCategory.SERIES_CONTINUATION:
      return 'Series Continuation'
    case RecommendationCategory.TRENDING:
      return 'Trending'
    default:
      return String(category).replace('_', ' ')
  }
}

/**
 * Helper function to get category descriptions
 */
function getCategoryDescription(category: RecommendationCategory): string {
  switch (category) {
    case RecommendationCategory.REDISCOVERY:
      return 'Episodes you listened to before but might want to revisit'
    case RecommendationCategory.MISSED_GEMS:
      return 'Great older episodes you haven\'t heard yet'
    case RecommendationCategory.COMEDY_GOLD:
      return 'Comedy episodes that match your taste'
    case RecommendationCategory.GUEST_FAVORITES:
      return 'Episodes featuring your favorite guests'
    case RecommendationCategory.SERIES_CONTINUATION:
      return 'Next episodes in series you\'ve started'
    case RecommendationCategory.TRENDING:
      return 'Popular episodes among similar users'
    default:
      return 'Personalized recommendations based on your listening history'
  }
}