import { apiClient } from './api'

export interface RecommendationFilters {
  limit?: number
  not_recent?: boolean
  favorites?: boolean
  guests?: boolean
  new?: boolean
}

export interface RecommendationFactors {
  recentShowListening: number
  newEpisodeBonus: number
  rediscoveryBonus: number
  guestMatchBonus: number
  favoriteBonus: number
}

export interface RecommendationEpisode {
  episodeId: string
  podcastId: string
  title: string
  description: string
  audioUrl: string
  imageUrl?: string
  duration: string
  releaseDate: string
  podcastName: string
  extractedGuests?: string[]
  isListened?: boolean
  playbackPosition?: number
}

export interface RecommendationScore {
  episodeId: string
  episode: RecommendationEpisode
  score: number
  reasons: string[]
  factors: RecommendationFactors
}

export interface GuestExtractionRequest {
  episodeId: string
  title: string
  description: string
}

export interface GuestExtractionResponse {
  episodeId: string
  extractedGuests: string[]
  confidence: number
  extractedAt: string
}

export interface BatchGuestExtractionRequest {
  episodes: Array<{
    episodeId: string
    title: string
    description: string
  }>
}

export interface BatchGuestExtractionResponse {
  results: GuestExtractionResponse[]
  processed: number
  failed: number
}

export interface GuestAnalyticsRequest {
  episodeId: string
  guests: string[]
  action: 'played' | 'skipped' | 'completed' | 'up' | 'down'
  rating?: number
  contextData?: Record<string, any>
}

export interface GuestAnalyticsResponse {
  message: string
  updated: boolean
}

export interface RecommendationError {
  message: string
  code: string
  details?: any
}

class RecommendationService {
  /**
   * Get personalized episode recommendations for the user
   */
  async getRecommendations(filters?: RecommendationFilters): Promise<RecommendationScore[]> {
    try {
      const params: Record<string, any> = {}

      if (filters) {
        if (filters.limit) params.limit = filters.limit
        if (filters.not_recent) params.not_recent = 'true'
        if (filters.favorites) params.favorites = 'true'
        if (filters.guests) params.guests = 'true'
        if (filters.new) params.new = 'true'
      }

      console.log('Fetching recommendations with params:', params)
      return await apiClient.get<RecommendationScore[]>('/recommendations', params)
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      throw error
    }
  }

  /**
   * Extract guests from a single episode's title and description
   */
  async extractGuests(request: GuestExtractionRequest): Promise<GuestExtractionResponse> {
    try {
      return await apiClient.post<GuestExtractionResponse>('/recommendations/extract-guests', request)
    } catch (error) {
      console.error('Error extracting guests:', error)
      throw error
    }
  }

  /**
   * Extract guests from multiple episodes in batch
   */
  async batchExtractGuests(request: BatchGuestExtractionRequest): Promise<BatchGuestExtractionResponse> {
    try {
      return await apiClient.post<BatchGuestExtractionResponse>('/recommendations/batch-extract-guests', request)
    } catch (error) {
      console.error('Error batch extracting guests:', error)
      throw error
    }
  }

  /**
   * Submit user feedback for episode recommendations
   */
  async submitFeedback(
    episodeId: string,
    feedback: 'up' | 'down' | 'played' | 'skipped' | 'completed',
    rating?: number,
    contextData?: Record<string, any>,
  ): Promise<GuestAnalyticsResponse> {
    try {
      // Get episode details to include guest information
      const episode = await this.getEpisodeDetails(episodeId)

      const request: GuestAnalyticsRequest = {
        episodeId,
        guests: episode.extractedGuests || [],
        action: feedback,
        rating,
        contextData,
      }

      return await apiClient.post<GuestAnalyticsResponse>('/recommendations/guest-analytics', request)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      throw error
    }
  }

  /**
   * Submit thumbs up feedback for a recommendation
   */
  async thumbsUp(episodeId: string, contextData?: Record<string, any>): Promise<GuestAnalyticsResponse> {
    return this.submitFeedback(episodeId, 'up', 5, contextData)
  }

  /**
   * Submit thumbs down feedback for a recommendation
   */
  async thumbsDown(episodeId: string, contextData?: Record<string, any>): Promise<GuestAnalyticsResponse> {
    return this.submitFeedback(episodeId, 'down', 1, contextData)
  }

  /**
   * Track when user plays a recommended episode
   */
  async trackPlay(episodeId: string, contextData?: Record<string, any>): Promise<GuestAnalyticsResponse> {
    return this.submitFeedback(episodeId, 'played', undefined, contextData)
  }

  /**
   * Track when user skips a recommended episode
   */
  async trackSkip(episodeId: string, contextData?: Record<string, any>): Promise<GuestAnalyticsResponse> {
    return this.submitFeedback(episodeId, 'skipped', undefined, contextData)
  }

  /**
   * Track when user completes a recommended episode
   */
  async trackComplete(episodeId: string, contextData?: Record<string, any>): Promise<GuestAnalyticsResponse> {
    return this.submitFeedback(episodeId, 'completed', undefined, contextData)
  }

  /**
   * Get episode details (helper method)
   */
  private async getEpisodeDetails(episodeId: string): Promise<RecommendationEpisode> {
    // This is a simplified version - in practice, you might need to call a different endpoint
    // or get this data from the episodes service
    return {
      episodeId,
      podcastId: '',
      title: '',
      description: '',
      audioUrl: '',
      duration: '',
      releaseDate: '',
      podcastName: '',
      extractedGuests: [],
    }
  }
}

export const recommendationService = new RecommendationService()
export default recommendationService
