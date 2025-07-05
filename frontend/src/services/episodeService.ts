import { apiClient } from './api'

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
  naturalKey: string
}

export interface EpisodeListResponse {
  episodes: Episode[]
  pagination: {
    hasMore: boolean
    nextCursor?: string
    limit: number
  }
}

export interface EpisodeSyncResponse {
  message: string
  episodeCount: number
  episodes: Episode[]
  stats: {
    newEpisodes: number
    updatedEpisodes: number
    totalProcessed: number
    duplicatesFound: number
  }
}

export interface ProgressResponse {
  position: number
  duration: number
  progressPercentage: number
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

export interface ListeningHistoryResponse {
  history: ListeningHistoryItem[]
  total: number
}

export class EpisodeService {
  async getEpisodes(podcastId: string, limit = 20, cursor?: string): Promise<EpisodeListResponse> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
      })

      if (cursor) {
        params.append('cursor', cursor)
      }

      const response = await apiClient.get<EpisodeListResponse>(`/episodes/${podcastId}?${params}`)
      return response
    } catch (error) {
      console.error('Error fetching episodes:', error)
      throw new Error('Failed to fetch episodes')
    }
  }

  async getEpisodeById(episodeId: string): Promise<Episode> {
    try {
      const response = await apiClient.get<Episode>(`/episodes/${episodeId}`)
      return response
    } catch (error) {
      console.error('Error fetching episode:', error)
      throw new Error('Failed to fetch episode')
    }
  }

  async syncEpisodes(podcastId: string): Promise<EpisodeSyncResponse> {
    try {
      const response = await apiClient.post<EpisodeSyncResponse>(`/episodes/${podcastId}/sync`)
      return response
    } catch (error) {
      console.error('Error syncing episodes:', error)
      throw new Error('Failed to sync episodes')
    }
  }

  async saveProgress(
    episodeId: string,
    position: number,
    duration: number,
    podcastId: string,
  ): Promise<ProgressResponse> {
    try {
      const response = await apiClient.put<ProgressResponse>(`/episodes/${episodeId}/progress`, {
        position,
        duration,
        podcastId,
      })
      return response
    } catch (error) {
      console.error('Error saving progress:', error)
      throw new Error('Failed to save progress')
    }
  }

  async getProgress(episodeId: string): Promise<ProgressResponse> {
    try {
      const response = await apiClient.get<ProgressResponse>(`/episodes/${episodeId}/progress`)
      return response
    } catch (error) {
      console.error('Error getting progress:', error)
      // Return default progress if error (episode not started)
      return {
        position: 0,
        duration: 0,
        progressPercentage: 0,
      }
    }
  }

  async getListeningHistory(limit = 20): Promise<ListeningHistoryResponse> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
      })

      const response = await apiClient.get<ListeningHistoryResponse>(`/listening-history?${params}`)
      return response
    } catch (error) {
      console.error('Error fetching listening history:', error)
      throw new Error('Failed to fetch listening history')
    }
  }

  async deleteEpisodes(podcastId: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete<{ message: string }>(`/episodes/${podcastId}`)
      return response
    } catch (error) {
      console.error('Error deleting episodes:', error)
      throw new Error('Failed to delete episodes')
    }
  }

  async fixEpisodeImages(podcastId: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post<{ message: string }>(`/episodes/${podcastId}/fix-images`)
      return response
    } catch (error) {
      console.error('Error fixing episode images:', error)
      throw new Error('Failed to fix episode images')
    }
  }

  // Utility method to format duration from seconds to MM:SS
  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Utility method to parse duration string to seconds
  parseDurationToSeconds(duration: string): number {
    const parts = duration.split(':')
    if (parts.length === 2) {
      // MM:SS format
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
    } else if (parts.length === 3) {
      // HH:MM:SS format
      return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10)
    }
    return 0
  }

  // Utility method to check if episode is recently released (within last 30 days)
  isRecentEpisode(releaseDate: string): boolean {
    const episodeDate = new Date(releaseDate)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return episodeDate > thirtyDaysAgo
  }

  // Utility method to format release date for display
  formatReleaseDate(releaseDate: string): string {
    const date = new Date(releaseDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      })
    }
  }
}

// Export singleton instance
export const episodeService = new EpisodeService()
export default episodeService
