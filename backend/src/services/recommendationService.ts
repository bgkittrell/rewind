import { 
  Episode, 
  ListeningHistoryItem, 
  Podcast, 
  RecommendationResult, 
  RecommendationCategory, 
  RecommendationFilters,
  UserPreferences,
  FeedbackType 
} from '../types'
import { DynamoService } from './dynamoService'

export class RecommendationService {
  private dynamoService: DynamoService

  constructor(dynamoService: DynamoService) {
    this.dynamoService = dynamoService
  }

  /**
   * Get basic recommendations for a user
   */
  async getBasicRecommendations(
    userId: string, 
    filters: RecommendationFilters = {}
  ): Promise<RecommendationResult[]> {
    const { limit = 10, category } = filters

    try {
      // Get user's podcasts and listening history
      const [podcasts, listeningHistory] = await Promise.all([
        this.dynamoService.getPodcastsByUser(userId),
        this.dynamoService.getListeningHistory(userId, 100)
      ])

      if (podcasts.length === 0) {
        return []
      }

      // Get all episodes from user's podcasts
      const allEpisodes = await this.getAllEpisodesFromPodcasts(podcasts)

      // Generate recommendations by category
      const recommendations = await this.generateRecommendationsByCategory(
        allEpisodes,
        podcasts,
        listeningHistory,
        category
      )

      // Sort by score and limit results
      const sortedRecommendations = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)

      return sortedRecommendations

    } catch (error) {
      console.error('Error getting recommendations:', error)
      throw new Error('Failed to get recommendations')
    }
  }

  /**
   * Generate recommendations by category
   */
  private async generateRecommendationsByCategory(
    episodes: Array<Episode & { podcastName: string; podcastImageUrl?: string }>,
    podcasts: Podcast[],
    listeningHistory: ListeningHistoryItem[],
    requestedCategory?: RecommendationCategory
  ): Promise<RecommendationResult[]> {
    const recommendations: RecommendationResult[] = []

    // Create a map of listening history for quick lookup
    const historyMap = new Map<string, ListeningHistoryItem>()
    listeningHistory.forEach(item => {
      historyMap.set(item.episodeId, item)
    })

    // Calculate podcast engagement scores
    const podcastEngagement = this.calculatePodcastEngagement(podcasts, listeningHistory)

    // Generate recommendations for each category
    const categories = requestedCategory ? [requestedCategory] : Object.values(RecommendationCategory)

    for (const category of categories) {
      const categoryRecommendations = await this.generateCategoryRecommendations(
        episodes,
        historyMap,
        podcastEngagement,
        category
      )
      recommendations.push(...categoryRecommendations)
    }

    return recommendations
  }

  /**
   * Generate recommendations for a specific category
   */
  private async generateCategoryRecommendations(
    episodes: Array<Episode & { podcastName: string; podcastImageUrl?: string }>,
    historyMap: Map<string, ListeningHistoryItem>,
    podcastEngagement: Map<string, number>,
    category: RecommendationCategory
  ): Promise<RecommendationResult[]> {
    const recommendations: RecommendationResult[] = []

    for (const episode of episodes) {
      const score = this.calculateRecommendationScore(
        episode,
        historyMap,
        podcastEngagement,
        category
      )

      if (score > 0) {
        const reason = this.generateRecommendationReason(episode, historyMap, category)
        
        recommendations.push({
          episodeId: episode.episodeId,
          podcastId: episode.podcastId,
          title: episode.title,
          description: episode.description,
          audioUrl: episode.audioUrl,
          duration: episode.duration,
          releaseDate: episode.releaseDate,
          imageUrl: episode.imageUrl,
          podcastName: episode.podcastName,
          podcastImageUrl: episode.podcastImageUrl,
          score,
          reason,
          category,
          confidence: Math.min(score, 1.0),
          tags: episode.tags || [],
          guests: episode.guests || []
        })
      }
    }

    return recommendations
  }

  /**
   * Calculate recommendation score for an episode
   */
  private calculateRecommendationScore(
    episode: Episode & { podcastName: string },
    historyMap: Map<string, ListeningHistoryItem>,
    podcastEngagement: Map<string, number>,
    category: RecommendationCategory
  ): number {
    let score = 0
    const now = new Date()
    const releaseDate = new Date(episode.releaseDate)
    const ageInDays = Math.floor((now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24))

    // Get listening history for this episode
    const historyItem = historyMap.get(episode.episodeId)
    const timeSinceLastPlayed = historyItem 
      ? Math.floor((now.getTime() - new Date(historyItem.lastPlayed).getTime()) / (1000 * 60 * 60 * 24))
      : Infinity

    // Category-specific scoring
    switch (category) {
      case RecommendationCategory.REDISCOVERY:
        score += this.calculateRediscoveryScore(ageInDays, timeSinceLastPlayed, historyItem)
        break

      case RecommendationCategory.MISSED_GEMS:
        score += this.calculateMissedGemsScore(ageInDays, historyItem)
        break

      case RecommendationCategory.COMEDY_GOLD:
        score += this.calculateComedyScore(episode, ageInDays, historyItem)
        break

      case RecommendationCategory.GUEST_FAVORITES:
        score += this.calculateGuestFavoritesScore(episode, historyItem)
        break

      case RecommendationCategory.SERIES_CONTINUATION:
        score += this.calculateSeriesContinuationScore(episode, historyItem)
        break

      default:
        score += this.calculateRediscoveryScore(ageInDays, timeSinceLastPlayed, historyItem)
    }

    // Apply podcast engagement multiplier
    const engagement = podcastEngagement.get(episode.podcastId) || 0.5
    score *= (0.5 + engagement * 0.5) // Scale between 0.5 and 1.0

    return Math.max(0, Math.min(1, score))
  }

  /**
   * Calculate rediscovery score (episodes to revisit)
   */
  private calculateRediscoveryScore(
    ageInDays: number,
    timeSinceLastPlayed: number,
    historyItem?: ListeningHistoryItem
  ): number {
    let score = 0

    // Must have been played before
    if (!historyItem) return 0

    // Age factor - prefer older episodes
    if (ageInDays > 30) score += 0.2
    if (ageInDays > 90) score += 0.2
    if (ageInDays > 180) score += 0.2

    // Time since last played
    if (timeSinceLastPlayed > 90) score += 0.3
    if (timeSinceLastPlayed > 180) score += 0.2

    // Incomplete episodes get bonus
    if (historyItem && !historyItem.isCompleted) score += 0.1

    return score
  }

  /**
   * Calculate missed gems score (episodes never played)
   */
  private calculateMissedGemsScore(ageInDays: number, historyItem?: ListeningHistoryItem): number {
    let score = 0

    // Must NOT have been played
    if (historyItem) return 0

    // Age factor - prefer episodes that are old enough to be "missed"
    if (ageInDays > 7) score += 0.3
    if (ageInDays > 30) score += 0.3
    if (ageInDays > 90) score += 0.2

    return score
  }

  /**
   * Calculate comedy score (comedy-focused episodes)
   */
  private calculateComedyScore(
    episode: Episode,
    ageInDays: number,
    historyItem?: ListeningHistoryItem
  ): number {
    let score = 0

    // Comedy bonus
    const isComedy = episode.tags?.some(tag => 
      tag.toLowerCase().includes('comedy') || 
      tag.toLowerCase().includes('humor') ||
      tag.toLowerCase().includes('funny')
    ) || episode.description.toLowerCase().includes('comedy')

    if (!isComedy) return 0

    // Base comedy score
    score += 0.4

    // Age factor for comedy
    if (ageInDays > 30) score += 0.2
    if (ageInDays > 90) score += 0.2

    // Reduce score if recently played
    if (historyItem) {
      const timeSinceLastPlayed = Math.floor(
        (new Date().getTime() - new Date(historyItem.lastPlayed).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (timeSinceLastPlayed < 30) score *= 0.5
    }

    return score
  }

  /**
   * Calculate guest favorites score (episodes with favorite guests)
   */
  private calculateGuestFavoritesScore(episode: Episode, historyItem?: ListeningHistoryItem): number {
    let score = 0

    // TODO: Implement guest tracking and favorites
    // For now, give bonus to episodes with guests
    if (episode.guests && episode.guests.length > 0) {
      score += 0.3
    }

    return score
  }

  /**
   * Calculate series continuation score (next episodes in series)
   */
  private calculateSeriesContinuationScore(episode: Episode, historyItem?: ListeningHistoryItem): number {
    let score = 0

    // TODO: Implement series detection logic
    // For now, give bonus to episodes that are part of a series
    if (episode.title.toLowerCase().includes('part') || 
        episode.title.toLowerCase().includes('episode')) {
      score += 0.2
    }

    return score
  }

  /**
   * Calculate podcast engagement for each podcast
   */
  private calculatePodcastEngagement(
    podcasts: Podcast[],
    listeningHistory: ListeningHistoryItem[]
  ): Map<string, number> {
    const engagement = new Map<string, number>()
    
    podcasts.forEach(podcast => {
      const podcastHistory = listeningHistory.filter(item => item.podcastId === podcast.podcastId)
      
      if (podcastHistory.length === 0) {
        engagement.set(podcast.podcastId, 0.3) // Default for new podcasts
        return
      }

      // Calculate engagement based on listening patterns
      const totalEpisodes = podcastHistory.length
      const completedEpisodes = podcastHistory.filter(item => item.isCompleted).length
      const totalPlayCount = podcastHistory.reduce((sum, item) => sum + item.playCount, 0)
      const avgPlaybackPosition = podcastHistory.reduce((sum, item) => sum + item.playbackPosition, 0) / totalEpisodes

      // Engagement score factors
      const completionRate = completedEpisodes / totalEpisodes
      const replayRate = totalPlayCount / totalEpisodes
      const progressRate = Math.min(avgPlaybackPosition / 1800, 1) // Normalize to 30 minutes

      const engagementScore = (completionRate * 0.4) + (replayRate * 0.3) + (progressRate * 0.3)
      engagement.set(podcast.podcastId, Math.min(1, engagementScore))
    })

    return engagement
  }

  /**
   * Generate human-readable reason for recommendation
   */
  private generateRecommendationReason(
    episode: Episode,
    historyMap: Map<string, ListeningHistoryItem>,
    category: RecommendationCategory
  ): string {
    const historyItem = historyMap.get(episode.episodeId)
    const ageInDays = Math.floor(
      (new Date().getTime() - new Date(episode.releaseDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    switch (category) {
      case RecommendationCategory.REDISCOVERY:
        if (historyItem) {
          const timeSinceLastPlayed = Math.floor(
            (new Date().getTime() - new Date(historyItem.lastPlayed).getTime()) / (1000 * 60 * 60 * 24)
          )
          if (timeSinceLastPlayed > 180) {
            return `You haven't listened to this in over 6 months`
          } else if (timeSinceLastPlayed > 90) {
            return `You haven't listened to this in over 3 months`
          } else if (!historyItem.isCompleted) {
            return `You started this episode but didn't finish it`
          }
        }
        return `Time to revisit this older episode`

      case RecommendationCategory.MISSED_GEMS:
        if (ageInDays > 180) {
          return `You missed this gem from 6+ months ago`
        } else if (ageInDays > 90) {
          return `You missed this episode from 3+ months ago`
        }
        return `You haven't listened to this episode yet`

      case RecommendationCategory.COMEDY_GOLD:
        return `Comedy gold from ${Math.floor(ageInDays / 30)} months ago`

      case RecommendationCategory.GUEST_FAVORITES:
        if (episode.guests && episode.guests.length > 0) {
          return `Features ${episode.guests.join(', ')}`
        }
        return `Episode with special guests`

      case RecommendationCategory.SERIES_CONTINUATION:
        return `Next episode in the series`

      default:
        return `Recommended based on your listening history`
    }
  }

  /**
   * Get all episodes from user's podcasts
   */
  private async getAllEpisodesFromPodcasts(
    podcasts: Podcast[]
  ): Promise<Array<Episode & { podcastName: string; podcastImageUrl?: string }>> {
    const allEpisodes: Array<Episode & { podcastName: string; podcastImageUrl?: string }> = []

    for (const podcast of podcasts) {
      try {
        const { episodes } = await this.dynamoService.getEpisodesByPodcast(podcast.podcastId, 50)
        const episodesWithPodcastInfo = episodes.map(episode => ({
          ...episode,
          podcastName: podcast.title,
          podcastImageUrl: podcast.imageUrl
        }))
        allEpisodes.push(...episodesWithPodcastInfo)
      } catch (error) {
        console.error(`Error fetching episodes for podcast ${podcast.podcastId}:`, error)
      }
    }

    return allEpisodes
  }

  /**
   * Submit user feedback on recommendations
   */
  async submitRecommendationFeedback(
    userId: string,
    episodeId: string,
    podcastId: string,
    feedbackType: FeedbackType,
    rating?: number,
    comment?: string
  ): Promise<void> {
    // TODO: Implement feedback storage in DynamoDB
    // For now, just log the feedback
    console.log('Recommendation feedback:', {
      userId,
      episodeId,
      podcastId,
      feedbackType,
      rating,
      comment,
      timestamp: new Date().toISOString()
    })
  }
}

// Export a singleton instance
export const recommendationService = new RecommendationService(
  new DynamoService()
)