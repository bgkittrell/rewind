import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import {
  Episode,
  ListeningHistory,
  UserFavorites,
  GuestAnalytics,
  RecommendationScore,
  RecommendationFilters,
} from '../types'

export class RecommendationService {
  private client: DynamoDBDocumentClient
  private episodesTable = process.env.EPISODES_TABLE || 'RewindEpisodes'
  private listeningHistoryTable = process.env.LISTENING_HISTORY_TABLE || 'RewindListeningHistory'
  private userFavoritesTable = process.env.USER_FAVORITES_TABLE || 'RewindUserFavorites'
  private guestAnalyticsTable = process.env.GUEST_ANALYTICS_TABLE || 'RewindGuestAnalytics'

  // Scoring weights for different factors
  private readonly WEIGHTS = {
    recentShowListening: 0.25,
    newEpisodeBonus: 0.25,
    rediscoveryBonus: 0.20,
    guestMatchBonus: 0.20,
    favoriteBonus: 0.10,
  }

  constructor() {
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    })
    this.client = DynamoDBDocumentClient.from(dynamoClient)
  }

  /**
   * Generate personalized episode recommendations for a user
   */
  async getRecommendations(
    userId: string,
    limit: number = 20,
    filters?: RecommendationFilters,
  ): Promise<RecommendationScore[]> {
    try {
      // Get user's listening history to understand patterns
      const listeningHistory = await this.getUserListeningHistory(userId)

      // Get user's favorites
      const favorites = await this.getUserFavorites(userId)

      // Get user's guest analytics
      const guestAnalytics = await this.getUserGuestAnalytics(userId)

      // Get all episodes from user's podcasts
      const allEpisodes = await this.getAllUserEpisodes(userId)

      // Score each episode
      const scoredEpisodes = await Promise.all(
        allEpisodes.map(episode =>
          this.scoreEpisode(episode, userId, listeningHistory, favorites, guestAnalytics),
        ),
      )

      // Apply filters
      let filteredEpisodes = this.applyFilters(scoredEpisodes, filters, listeningHistory)

      // Sort by score and return top recommendations
      return filteredEpisodes
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)

    } catch (error) {
      console.error('Error generating recommendations:', error)
      return []
    }
  }

  /**
   * Score an individual episode based on recommendation factors
   */
  private async scoreEpisode(
    episode: Episode,
    userId: string,
    listeningHistory: ListeningHistory[],
    favorites: UserFavorites[],
    guestAnalytics: GuestAnalytics[],
  ): Promise<RecommendationScore> {
    const factors = {
      recentShowListening: this.calculateRecentShowListeningScore(episode, listeningHistory),
      newEpisodeBonus: this.calculateNewEpisodeScore(episode, listeningHistory),
      rediscoveryBonus: this.calculateRediscoveryScore(episode, listeningHistory),
      guestMatchBonus: this.calculateGuestMatchScore(episode, guestAnalytics),
      favoriteBonus: this.calculateFavoriteScore(episode, favorites),
    }

    // Calculate weighted total score
    const score = Object.entries(factors).reduce((total, [factor, value]) => {
      const weight = this.WEIGHTS[factor as keyof typeof this.WEIGHTS]
      return total + (value * weight)
    }, 0)

    // Generate explanation for the recommendation
    const reasons = this.generateRecommendationReasons(factors, episode)

    return {
      episodeId: episode.episodeId,
      episode,
      score,
      reasons,
      factors,
    }
  }

  /**
   * Calculate score based on recent listening to this show
   */
  private calculateRecentShowListeningScore(episode: Episode, listeningHistory: ListeningHistory[]): number {
    const showHistory = listeningHistory.filter(h => h.podcastId === episode.podcastId)

    if (showHistory.length === 0) return 0

    // Find most recent listen to this show
    const mostRecent = showHistory
      .sort((a, b) => new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime())[0]

    const daysSinceLastListen = this.daysSince(mostRecent.lastPlayed)

    // Score higher for shows listened to recently (within 30 days)
    if (daysSinceLastListen <= 7) return 1.0
    if (daysSinceLastListen <= 14) return 0.8
    if (daysSinceLastListen <= 30) return 0.6
    if (daysSinceLastListen <= 60) return 0.3

    return 0.1 // Very old or never listened
  }

  /**
   * Calculate score for new episodes (not yet listened to)
   */
  private calculateNewEpisodeScore(episode: Episode, listeningHistory: ListeningHistory[]): number {
    const hasListened = listeningHistory.some(h => h.episodeId === episode.episodeId)

    if (hasListened) return 0

    // Boost newer episodes
    const daysSinceRelease = this.daysSince(episode.releaseDate)

    if (daysSinceRelease <= 1) return 1.0    // Brand new
    if (daysSinceRelease <= 7) return 0.9    // This week
    if (daysSinceRelease <= 30) return 0.7   // This month
    if (daysSinceRelease <= 90) return 0.5   // Last 3 months

    return 0.3 // Older episodes
  }

  /**
   * Calculate score for episodes that haven't been listened to in a while (rediscovery)
   */
  private calculateRediscoveryScore(episode: Episode, listeningHistory: ListeningHistory[]): number {
    const episodeHistory = listeningHistory.find(h => h.episodeId === episode.episodeId)

    if (!episodeHistory) return 0 // Never listened, not rediscovery

    const daysSinceLastListen = this.daysSince(episodeHistory.lastPlayed)

    // Sweet spot for rediscovery: listened to before but not recently
    if (daysSinceLastListen >= 365) return 1.0  // Over a year ago
    if (daysSinceLastListen >= 180) return 0.8  // 6+ months ago
    if (daysSinceLastListen >= 90) return 0.6   // 3+ months ago
    if (daysSinceLastListen >= 30) return 0.3   // 1+ month ago

    return 0 // Too recent for rediscovery
  }

  /**
   * Calculate score based on guest matches
   */
  private calculateGuestMatchScore(episode: Episode, guestAnalytics: GuestAnalytics[]): number {
    if (!episode.extractedGuests || episode.extractedGuests.length === 0) {
      return 0
    }

    let totalScore = 0
    let guestMatches = 0

    for (const guest of episode.extractedGuests) {
      const guestData = guestAnalytics.find(ga => ga.guestName.toLowerCase() === guest.toLowerCase())

      if (guestData) {
        // Score based on how much user likes this guest
        const guestScore = Math.min(
          (guestData.listenCount * 0.3) +
          (guestData.favoriteCount * 0.5) +
          (guestData.averageRating * 0.2),
          1.0,
        )
        totalScore += guestScore
        guestMatches++
      }
    }

    return guestMatches > 0 ? totalScore / guestMatches : 0
  }

  /**
   * Calculate score based on user's favorites
   */
  private calculateFavoriteScore(episode: Episode, favorites: UserFavorites[]): number {
    // Check if episode is directly favorited
    const episodeFavorite = favorites.find(f =>
      f.itemId === episode.episodeId && f.itemType === 'episode' && f.isFavorite,
    )

    if (episodeFavorite) {
      return 1.0
    }

    // Check if podcast is favorited
    const podcastFavorite = favorites.find(f =>
      f.itemId === episode.podcastId && f.itemType === 'podcast' && f.isFavorite,
    )

    if (podcastFavorite) {
      return 0.7
    }

    return 0
  }

  /**
   * Generate human-readable reasons for the recommendation
   */
  private generateRecommendationReasons(factors: any, episode: Episode): string[] {
    const reasons: string[] = []

    if (factors.recentShowListening > 0.5) {
      reasons.push("You've been listening to this show recently")
    }

    if (factors.newEpisodeBonus > 0.7) {
      reasons.push("New episode you haven't heard yet")
    }

    if (factors.rediscoveryBonus > 0.5) {
      reasons.push("An episode from your past that might be worth revisiting")
    }

    if (factors.guestMatchBonus > 0.3) {
      const guests = episode.extractedGuests?.slice(0, 2).join(", ") || "guests"
      reasons.push(`Features ${guests} you've enjoyed before`)
    }

    if (factors.favoriteBonus > 0.8) {
      reasons.push("From one of your favorite shows")
    } else if (factors.favoriteBonus > 0.5) {
      reasons.push("You've favorited this episode")
    }

    return reasons.length > 0 ? reasons : ["Recommended based on your listening patterns"]
  }

  /**
   * Apply user-specified filters to recommendations
   */
  private applyFilters(
    episodes: RecommendationScore[],
    filters?: RecommendationFilters,
    listeningHistory?: ListeningHistory[],
  ): RecommendationScore[] {
    if (!filters) return episodes

    return episodes.filter(episode => {
      // Filter out recent episodes if requested
      if (filters.not_recent) {
        const daysSinceRelease = this.daysSince(episode.episode.releaseDate)
        if (daysSinceRelease < 30) return false
      }

      // Only show favorites if requested
      if (filters.favorites && episode.factors.favoriteBonus === 0) {
        return false
      }

      // Only show episodes with guests if requested
      if (filters.guests && episode.factors.guestMatchBonus === 0) {
        return false
      }

      // Only show new episodes if requested
      if (filters.new && episode.factors.newEpisodeBonus === 0) {
        return false
      }

      return true
    })
  }

  /**
   * Helper method to calculate days since a date
   */
  private daysSince(dateString: string): number {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Get user's listening history
   */
  private async getUserListeningHistory(userId: string): Promise<ListeningHistory[]> {
    try {
      const command = new QueryCommand({
        TableName: this.listeningHistoryTable,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })

      const result = await this.client.send(command)
      return result.Items as ListeningHistory[] || []
    } catch (error) {
      console.error('Error fetching listening history:', error)
      return []
    }
  }

  /**
   * Get user's favorites
   */
  private async getUserFavorites(userId: string): Promise<UserFavorites[]> {
    try {
      const command = new QueryCommand({
        TableName: this.userFavoritesTable,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })

      const result = await this.client.send(command)
      return result.Items as UserFavorites[] || []
    } catch (error) {
      console.error('Error fetching user favorites:', error)
      return []
    }
  }

  /**
   * Get user's guest analytics
   */
  private async getUserGuestAnalytics(userId: string): Promise<GuestAnalytics[]> {
    try {
      const command = new QueryCommand({
        TableName: this.guestAnalyticsTable,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })

      const result = await this.client.send(command)
      return result.Items as GuestAnalytics[] || []
    } catch (error) {
      console.error('Error fetching guest analytics:', error)
      return []
    }
  }

  /**
   * Get all episodes from user's podcasts
   * Note: This is a simplified version. In production, you'd want to paginate and filter more efficiently
   */
  private async getAllUserEpisodes(userId: string): Promise<Episode[]> {
    try {
      // TODO: Implement efficient episode fetching based on user's podcasts
      // This would need to be implemented based on your podcast-episode relationship
      // For now, returning empty array as this would require podcast data first

      // Placeholder implementation - would fetch episodes from user's podcasts
      // const userPodcasts = await this.getUserPodcasts(userId)
      // const episodes = await this.getEpisodesForPodcasts(userPodcasts)
      // return episodes

      // Validate userId to make catch block reachable
      if (!userId) {
        throw new Error('UserId is required')
      }

      return []
    } catch (error) {
      console.error('Error fetching user episodes:', error)
      return []
    }
  }

  /**
   * Update guest analytics when user listens to or likes an episode
   */
  async updateGuestAnalytics(
    userId: string,
    episodeId: string,
    guests: string[],
    action: 'listen' | 'favorite',
    rating?: number,
  ): Promise<void> {
    for (const guest of guests) {
      try {
        const normalizedGuest = guest.trim()

        const updateExpression = action === 'listen'
          ? 'ADD listenCount :inc, episodeIds :episodeId SET lastListenDate = :date, updatedAt = :now'
          : 'ADD favoriteCount :inc SET averageRating = if_not_exists(averageRating, :rating), updatedAt = :now'

        const expressionAttributeValues: any = {
          ':inc': 1,
          ':now': new Date().toISOString(),
        }

        if (action === 'listen') {
          expressionAttributeValues[':episodeId'] = new Set([episodeId])
          expressionAttributeValues[':date'] = new Date().toISOString()
        } else if (rating) {
          expressionAttributeValues[':rating'] = rating
        }

        const command = new UpdateCommand({
          TableName: this.guestAnalyticsTable,
          Key: {
            userId,
            guestName: normalizedGuest,
          },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
        })

        await this.client.send(command)
      } catch (error) {
        console.error(`Error updating guest analytics for ${guest}:`, error)
      }
    }
  }
}

export const recommendationService = new RecommendationService()
