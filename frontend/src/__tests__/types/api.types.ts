// Shared API types for integration tests

// Auth API types
export interface SignupRequest {
  email: string
  password: string
  name: string
}

export interface SignupResponse {
  message: string
  userId: string
}

export interface SigninRequest {
  email: string
  password: string
}

export interface SigninResponse {
  accessToken: string
  idToken: string
  refreshToken: string
  expiresIn: number
}

export interface ConfirmRequest {
  email: string
  code: string
}

export interface ConfirmResponse {
  message: string
}

export interface ResendRequest {
  email: string
}

export interface ResendResponse {
  message: string
}

export interface ErrorResponse {
  error: string
  details?: unknown
}

// Podcast API types
export interface Podcast {
  podcastId: string
  userId: string
  title: string
  author: string
  description: string
  imageUrl: string
  rssUrl: string
  categories: string[]
  createdAt: string
  lastFetched: string
}

export interface AddPodcastRequest {
  rssUrl: string
}

export interface AddPodcastResponse {
  podcast: Podcast
  episodeCount: number
}

// Episode API types
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
}

export interface PlaybackProgressRequest {
  position: number
  duration: number
}

export interface PlaybackProgressResponse {
  message: string
}

// Recommendation API types
export interface RecommendationScore {
  episodeId: string
  podcastId: string
  score: number
  reasons: string[]
  factors: {
    content_similarity: number
    listening_history: number
    popularity: number
  }
  episode: {
    episodeId: string
    podcastId: string
    title: string
    podcastName: string
    releaseDate: string
    duration: string
    audioUrl: string
    imageUrl?: string
    description: string
    playbackPosition?: number
  }
}

export interface RecommendationFeedback {
  episodeId: string
  feedback: 'up' | 'down'
}

// Search API types
export interface SearchRequest {
  query: string
  filter?: 'all' | 'title' | 'description' | 'author'
}

export interface SearchResult {
  episodeId: string
  podcastId: string
  episodeTitle: string
  podcastTitle: string
  description: string
  releaseDate: string
  imageUrl?: string
  relevanceScore: number
}

export interface SearchResponse {
  results: SearchResult[]
  totalResults: number
  searchTime: number
}
