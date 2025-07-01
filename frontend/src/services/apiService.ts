import { fetchAuthSession } from 'aws-amplify/auth'

export interface PodcastAPI {
  id: string
  name: string
  description: string
  imageUrl: string
  category?: string
  author?: string
  rssUrl: string
  addedAt: string
}

export interface EpisodeAPI {
  id: string
  podcastId: string
  title: string
  description?: string
  audioUrl: string
  duration?: number
  publishedAt: string
  guests?: string[]
  episodeNumber?: number
  seasonNumber?: number
}

export interface PlaybackPosition {
  episodeId: string
  position: number
  duration: number
  lastPlayedAt: string
}

export interface EpisodeFeedback {
  episodeId: string
  rating: number
  feedback?: string
}

class APIService {
  private baseUrl: string

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1'
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
      const session = await fetchAuthSession()
      const token = session.tokens?.accessToken?.toString()
      
      return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error)
      return {
        'Content-Type': 'application/json',
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getAuthHeaders()
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Podcast Management
  async getUserPodcasts(params: {
    limit?: number
    offset?: number
    category?: string
  } = {}): Promise<{ podcasts: PodcastAPI[]; total: number }> {
    const queryParams = new URLSearchParams()
    if (params.limit) queryParams.set('limit', params.limit.toString())
    if (params.offset) queryParams.set('offset', params.offset.toString())
    if (params.category) queryParams.set('category', params.category)

    const query = queryParams.toString()
    return this.request(`/podcasts${query ? `?${query}` : ''}`)
  }

  async addPodcast(rssUrl: string): Promise<PodcastAPI> {
    return this.request('/podcasts', {
      method: 'POST',
      body: JSON.stringify({ rssUrl }),
    })
  }

  async removePodcast(podcastId: string): Promise<void> {
    await this.request(`/podcasts/${podcastId}`, {
      method: 'DELETE',
    })
  }

  // Episode Management
  async getPodcastEpisodes(
    podcastId: string,
    params: {
      limit?: number
      offset?: number
      sortBy?: 'publishedAt' | 'title'
      sortOrder?: 'asc' | 'desc'
    } = {}
  ): Promise<{ episodes: EpisodeAPI[]; total: number }> {
    const queryParams = new URLSearchParams()
    if (params.limit) queryParams.set('limit', params.limit.toString())
    if (params.offset) queryParams.set('offset', params.offset.toString())
    if (params.sortBy) queryParams.set('sortBy', params.sortBy)
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder)

    const query = queryParams.toString()
    return this.request(`/podcasts/${podcastId}/episodes${query ? `?${query}` : ''}`)
  }

  // Playback Tracking
  async getPlaybackPosition(episodeId: string): Promise<PlaybackPosition | null> {
    try {
      return await this.request(`/episodes/${episodeId}/playback`)
    } catch (error) {
      // Return null if no playback position found
      return null
    }
  }

  async savePlaybackPosition(
    episodeId: string,
    position: number,
    duration: number
  ): Promise<void> {
    await this.request(`/episodes/${episodeId}/playback`, {
      method: 'PUT',
      body: JSON.stringify({ position, duration }),
    })
  }

  // Episode Feedback
  async submitEpisodeFeedback(
    episodeId: string,
    rating: number,
    feedback?: string
  ): Promise<void> {
    await this.request(`/episodes/${episodeId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ rating, feedback }),
    })
  }

  // Recommendations
  async getRecommendations(params: {
    limit?: number
    category?: string
  } = {}): Promise<{ episodes: EpisodeAPI[] }> {
    const queryParams = new URLSearchParams()
    if (params.limit) queryParams.set('limit', params.limit.toString())
    if (params.category) queryParams.set('category', params.category)

    const query = queryParams.toString()
    return this.request(`/recommendations${query ? `?${query}` : ''}`)
  }

  // Library Sharing
  async createShareLink(expiresInHours = 24): Promise<{ shareId: string; shareUrl: string }> {
    return this.request('/share', {
      method: 'POST',
      body: JSON.stringify({ expiresInHours }),
    })
  }

  async getSharedLibrary(shareId: string): Promise<{ podcasts: PodcastAPI[] }> {
    return this.request(`/share/${shareId}`)
  }

  async addSharedPodcasts(shareId: string, podcastIds: string[]): Promise<void> {
    await this.request(`/share/${shareId}/add`, {
      method: 'POST',
      body: JSON.stringify({ podcastIds }),
    })
  }
}

export const apiService = new APIService()
export default apiService