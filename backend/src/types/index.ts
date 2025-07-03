export interface User {
  userId: string
  email: string
  name: string
  createdAt: string
  preferences: {
    theme: 'light' | 'dark'
    autoPlay: boolean
    downloadQuality: 'low' | 'medium' | 'high'
  }
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
  imageUrl?: string
  duration: number
  releaseDate: string
  createdAt: string
}

export interface ListeningHistory {
  userId: string
  episodeId: string
  podcastId: string
  position: number
  duration: number
  completedAt?: string
  lastPlayedAt: string
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
