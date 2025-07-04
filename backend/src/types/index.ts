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
