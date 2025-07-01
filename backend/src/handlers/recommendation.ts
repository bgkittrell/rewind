import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { EpisodeService } from '../services/episodeService.js'
import { UserService } from '../services/userService.js'
import { extractUserFromEvent } from '../utils/auth.js'
import { validateQueryParams } from '../utils/validation.js'
import {
  createSuccessResponse,
  createErrorResponse,
  createUnauthorizedResponse,
  createOptionsResponse,
} from '../utils/response.js'

const episodeService = new EpisodeService()
const userService = new UserService()

interface RecommendationFilters {
  not_recent?: boolean
  favorites?: boolean
  comedy?: boolean
  [key: string]: boolean | undefined
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Recommendation handler called:', {
    httpMethod: event.httpMethod,
    path: event.path,
    queryStringParameters: event.queryStringParameters,
  })

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createOptionsResponse()
    }

    // Extract user from Cognito JWT
    const user = extractUserFromEvent(event)
    if (!user) {
      return createUnauthorizedResponse('Authentication required')
    }

    // Update user's last active timestamp
    await userService.updateLastActive(user.userId)

    const httpMethod = event.httpMethod

    if (httpMethod === 'GET') {
      return await getRecommendations(user.userId, event.queryStringParameters || {})
    }

    return createErrorResponse(`Method ${httpMethod} not allowed`, 405, 'METHOD_NOT_ALLOWED')
  } catch (error) {
    console.error('Error in recommendation handler:', error)
    return createErrorResponse(
      'Internal server error',
      500,
      'INTERNAL_SERVER_ERROR',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}

async function getRecommendations(
  userId: string,
  queryStringParameters: Record<string, string | undefined>
): Promise<APIGatewayProxyResult> {
  try {
    const params = queryStringParameters || {}
    const limit = parseInt(params.limit || '10', 10)
    const filtersParam = params.filters || ''
    
    // Parse filters
    const filters: RecommendationFilters = {}
    if (filtersParam) {
      filtersParam.split(',').forEach(filter => {
        filters[filter.trim()] = true
      })
    }

    console.log('Generating recommendations with filters:', filters)

    // Get user's listening history for recommendations
    const listeningHistory = await episodeService.getListeningHistory(userId, 100)
    
    // Generate mock recommendations based on filters
    const recommendations = await generateMockRecommendations(userId, filters, limit)

    return createSuccessResponse({
      recommendations,
      total: recommendations.length,
      filters: Object.keys(filters),
    })
  } catch (error) {
    console.error('Error getting recommendations:', error)
    return createErrorResponse('Failed to generate recommendations', 500)
  }
}

async function generateMockRecommendations(
  userId: string,
  filters: RecommendationFilters,
  limit: number
) {
  // Mock recommendation data
  const mockRecommendations = [
    {
      episodeId: 'ep_rec_001',
      title: 'Classic Comedy Gold from 2019',
      podcastName: 'Comedy Central Podcast',
      podcastId: 'comedy-central',
      releaseDate: '2019-06-15T10:00:00Z',
      duration: '42:30',
      audioUrl: 'https://example.com/comedy-classic.mp3',
      imageUrl: 'https://via.placeholder.com/300x300/26A69A/FFFFFF?text=CC',
      description: 'A hilarious episode featuring some of the best comedians discussing their early career struggles.',
      reason: 'You haven\'t listened to this comedy episode in 3 months',
      confidence: 0.85,
    },
    {
      episodeId: 'ep_rec_002',
      title: 'Behind the Scenes: Making People Laugh',
      podcastName: 'Comedy Insider',
      podcastId: 'comedy-insider',
      releaseDate: '2020-01-20T15:30:00Z',
      duration: '38:15',
      audioUrl: 'https://example.com/behind-scenes.mp3',
      imageUrl: 'https://via.placeholder.com/300x300/9C27B0/FFFFFF?text=CI',
      description: 'An in-depth look at the comedy writing process with veteran comedy writers.',
      reason: 'Similar to episodes you\'ve marked as favorites',
      confidence: 0.78,
    },
    {
      episodeId: 'ep_rec_003',
      title: 'Quick Laughs for Your Commute',
      podcastName: 'Short Comedy Bits',
      podcastId: 'short-bits',
      releaseDate: '2021-03-10T09:15:00Z',
      duration: '15:45',
      audioUrl: 'https://example.com/quick-laughs.mp3',
      imageUrl: 'https://via.placeholder.com/300x300/4CAF50/FFFFFF?text=SB',
      description: 'Perfect bite-sized comedy for busy people who need a quick laugh.',
      reason: 'Recommended for short listening sessions',
      confidence: 0.72,
    },
    {
      episodeId: 'ep_rec_004',
      title: 'Late Night Legends Interview',
      podcastName: 'Late Night Comedy Show',
      podcastId: 'late-night-show',
      releaseDate: '2018-11-05T20:00:00Z',
      duration: '56:20',
      audioUrl: 'https://example.com/late-night-legends.mp3',
      imageUrl: 'https://via.placeholder.com/300x300/FF6B35/FFFFFF?text=LN',
      description: 'An exclusive interview with comedy legends about their time in late night television.',
      reason: 'From your favorite podcast category',
      confidence: 0.81,
    },
    {
      episodeId: 'ep_rec_005',
      title: 'Deep Dive: The Art of Stand-Up',
      podcastName: 'Long Form Comedy Podcast',
      podcastId: 'long-form-comedy',
      releaseDate: '2020-08-22T12:00:00Z',
      duration: '1:23:15',
      audioUrl: 'https://example.com/standup-art.mp3',
      imageUrl: 'https://via.placeholder.com/300x300/F44336/FFFFFF?text=LF',
      description: 'A comprehensive discussion about the evolution and craft of stand-up comedy.',
      reason: 'You enjoy longer, in-depth episodes',
      confidence: 0.69,
    },
  ]

  // Apply filters
  let filteredRecommendations = [...mockRecommendations]

  if (filters.not_recent) {
    // Filter for episodes that haven't been listened to recently
    filteredRecommendations = filteredRecommendations.filter(rec => {
      const releaseDate = new Date(rec.releaseDate)
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      return releaseDate < threeMonthsAgo
    })
  }

  if (filters.favorites) {
    // Filter for episodes similar to favorites (mock logic)
    filteredRecommendations = filteredRecommendations.filter(rec => 
      rec.confidence > 0.75
    )
  }

  if (filters.comedy) {
    // Filter for comedy episodes (all our mock data is comedy)
    filteredRecommendations = filteredRecommendations.filter(rec =>
      rec.podcastName.toLowerCase().includes('comedy')
    )
  }

  // Limit results
  return filteredRecommendations.slice(0, limit)
}