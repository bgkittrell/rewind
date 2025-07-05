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
  // AI Guest Extraction Fields
  extractedGuests?: string[]
  guestExtractionStatus?: 'pending' | 'completed' | 'failed'
  guestExtractionDate?: string
  guestExtractionConfidence?: number
  rawGuestData?: string
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

export interface UserFavorites {
  userId: string
  itemId: string
  itemType: 'episode' | 'podcast'
  isFavorite: boolean
  rating?: number
  tags?: string[]
  favoritedAt: string
  createdAt: string
  updatedAt: string
}

export interface GuestAnalytics {
  userId: string
  guestName: string
  episodeIds: string[]
  listenCount: number
  favoriteCount: number
  lastListenDate: string
  averageRating: number
  createdAt: string
  updatedAt: string
}

export interface UserFeedback {
  userId: string
  episodeId: string
  feedbackId: string
  type: 'like' | 'dislike' | 'favorite'
  rating?: number
  comment?: string
  createdAt: string
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

// Recommendation Engine Types
export interface RecommendationScore {
  episodeId: string
  episode: Episode
  score: number
  reasons: string[]
  factors: {
    recentShowListening: number
    newEpisodeBonus: number
    rediscoveryBonus: number
    guestMatchBonus: number
    favoriteBonus: number
  }
}

export interface GuestExtractionRequest {
  episodeId: string
  title: string
  description: string
}

export interface GuestExtractionResult {
  guests: string[]
  confidence: number
  reasoning: string
  rawResponse: string
}

export interface RecommendationFilters {
  not_recent?: boolean
  favorites?: boolean
  guests?: boolean
  new?: boolean
}
