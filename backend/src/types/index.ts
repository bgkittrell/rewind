export interface User {
  userId: string
  email: string
  name: string
  createdAt: string
  updatedAt: string
  preferences: {
    theme?: 'light' | 'dark'
    autoPlay: boolean
    playbackSpeed: number
    skipIntro: boolean
    skipOutro: boolean
    downloadQuality?: 'low' | 'medium' | 'high'
  }
  subscriptions: string[]
}

export interface Podcast {
  podcastId: string
  userId: string
  title: string
  description: string
  rssUrl: string
  imageUrl: string
  createdAt: string
  lastUpdated: string
  episodeCount: number
}

export interface Episode {
  episodeId: string
  podcastId: string
  title: string
  description: string
  audioUrl: string
  duration: string
  releaseDate: string
  imageUrl?: string
  guests?: string[]
  tags?: string[]
  createdAt: string
}

// Re-export EpisodeData from RSS service to avoid duplication
export type { EpisodeData } from '../services/rssService'

export interface ListeningHistory {
  userId: string
  episodeId: string
  podcastId: string
  playbackPosition: number
  duration: number
  isCompleted: boolean
  lastPlayed: string
  firstPlayed: string
  playCount: number
  createdAt: string
  updatedAt: string
}

export interface ListeningHistoryItem {
  userId: string
  episodeId: string
  podcastId: string
  playbackPosition: number
  duration: number
  isCompleted: boolean
  lastPlayed: string
  firstPlayed: string
  playCount: number
  createdAt: string
  updatedAt: string
}

export interface ShareLink {
  shareId: string
  userId: string
  podcastIds: string[]
  expiresAt: string
  createdAt: string
}

// Recommendation Engine Types
export interface RecommendationResult {
  episodeId: string
  podcastId: string
  title: string
  description: string
  audioUrl: string
  duration: string
  releaseDate: string
  imageUrl?: string
  podcastName: string
  podcastImageUrl?: string
  score: number
  reason: string
  category: RecommendationCategory
  confidence: number
  tags?: string[]
  guests?: string[]
}

export enum RecommendationCategory {
  REDISCOVERY = 'rediscovery',
  MISSED_GEMS = 'missed_gems',
  COMEDY_GOLD = 'comedy_gold',
  GUEST_FAVORITES = 'guest_favorites',
  SERIES_CONTINUATION = 'series_continuation',
  TRENDING = 'trending'
}

export interface UserFeedback {
  userId: string
  episodeId: string
  podcastId: string
  feedbackType: FeedbackType
  rating?: number
  comment?: string
  createdAt: string
}

export enum FeedbackType {
  LIKE = 'like',
  DISLIKE = 'dislike',
  FAVORITE = 'favorite',
  NOT_INTERESTED = 'not_interested'
}

export interface UserPreferences {
  userId: string
  preferences: {
    favoriteGenres: string[]
    favoriteGuests: string[]
    preferredDuration: 'short' | 'medium' | 'long' | 'any'
    preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | 'any'
    avoidExplicitContent: boolean
    prioritizeComedy: boolean
  }
  listeningPatterns: {
    averageSessionLength: number
    mostActiveTimeOfDay: string
    weeklyListeningHours: number
    completionRate: number
    skipRate: number
  }
  updatedAt: string
}

export interface RecommendationFilters {
  category?: RecommendationCategory
  limit?: number
  minAge?: number // minimum age in days
  maxAge?: number // maximum age in days
  excludeListened?: boolean
  includeIncomplete?: boolean
  preferredGenres?: string[]
}

export interface APIResponse<T = any> {
  data?: T
  error?: {
    message: string
    code: string
    details?: any
  }
  timestamp: string
  path?: string
}

export interface APIGatewayAuthorizerEvent {
  userId: string
  email: string
  name: string
}
