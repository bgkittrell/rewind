import apiClient from './api'

// Type definitions for search functionality
export interface SearchQuery {
  query: string
  limit?: number
  offset?: number
  podcastId?: string
  sortBy?: 'relevance' | 'date' | 'duration'
  dateRange?: { start: string; end: string }
}

export interface SearchResult {
  episode: {
    episodeId: string
    podcastId: string
    title: string
    description: string
    audioUrl: string
    duration: string
    releaseDate: string
    imageUrl?: string
    extractedGuests?: string[]
  }
  podcast: {
    podcastId: string
    title: string
    imageUrl?: string
  }
  relevance: {
    score: number
    matchedFields: string[]
    highlights: Record<string, string>
  }
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  hasMore: boolean
  searchTime: number
}

export interface SearchFilters {
  podcastId?: string
  dateRange?: { start: string; end: string }
  sortBy?: 'relevance' | 'date' | 'duration'
}

export class SearchService {
  /**
   * Search episodes based on query and filters
   */
  async searchEpisodes(
    query: string,
    filters: SearchFilters = {},
    pagination: { limit?: number; offset?: number } = {},
  ): Promise<SearchResponse> {
    if (!query || query.trim().length < 2) {
      return {
        results: [],
        total: 0,
        hasMore: false,
        searchTime: 0,
      }
    }

    const params: Record<string, any> = {
      q: query.trim(),
      limit: pagination.limit || 20,
      offset: pagination.offset || 0,
    }

    // Add optional filters
    if (filters.podcastId) {
      params.podcastId = filters.podcastId
    }

    try {
      const response = await apiClient.get<SearchResponse>('/search', params)
      return response
    } catch (error) {
      console.error('Search error:', error)
      throw error
    }
  }

  /**
   * Search with debouncing support
   */
  async searchWithDebounce(
    query: string,
    filters: SearchFilters = {},
    pagination: { limit?: number; offset?: number } = {},
    debounceMs: number = 300,
  ): Promise<SearchResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const result = await this.searchEpisodes(query, filters, pagination)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }, debounceMs)
    })
  }

  /**
   * Convert search result to EpisodeCard format
   */
  convertToEpisodeCard(result: SearchResult) {
    return {
      id: result.episode.episodeId,
      title: result.episode.title,
      podcastName: result.podcast.title,
      releaseDate: result.episode.releaseDate,
      duration: result.episode.duration,
      audioUrl: result.episode.audioUrl,
      imageUrl: result.episode.imageUrl || result.podcast.imageUrl,
      description: result.episode.description,
      podcastId: result.episode.podcastId,
      // Add search-specific fields
      relevanceScore: result.relevance.score,
      matchedFields: result.relevance.matchedFields,
      highlights: result.relevance.highlights,
    }
  }

  /**
   * Format search highlights for display
   */
  formatHighlights(highlights: Record<string, string>) {
    return Object.entries(highlights).map(([field, highlighted]) => ({
      field,
      text: highlighted,
    }))
  }
}

// Export singleton instance
export const searchService = new SearchService()
export default searchService
