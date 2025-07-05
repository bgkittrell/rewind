import { dynamoService } from './dynamoService'

export interface SearchResult {
  episodeId: string
  title: string
  description: string
  podcastName: string
  podcastId: string
  releaseDate: string
  duration: string
  audioUrl: string
  imageUrl?: string
  extractedGuests?: string[]
  relevanceScore: number
  matchType: 'title' | 'description' | 'guest' | 'podcast'
}

export interface SearchResponse {
  results: SearchResult[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export class SearchService {
  private searchCache = new Map<string, { results: SearchResult[]; timestamp: number }>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  async searchEpisodes(
    userId: string,
    query: string,
    limit: number = 20,
    offset: number = 0,
    type: 'episodes' | 'podcasts' | 'all' = 'episodes',
  ): Promise<SearchResponse> {
    if (!query.trim()) {
      return {
        results: [],
        pagination: { total: 0, limit, offset, hasMore: false },
      }
    }

    const cacheKey = `${userId}:${query.toLowerCase()}:${type}`
    const cached = this.searchCache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return this.paginateResults(cached.results, limit, offset)
    }

    try {
      let allResults: SearchResult[] = []

      if (type === 'episodes' || type === 'all') {
        const episodeResults = await this.searchUserEpisodes(userId, query)
        allResults = [...allResults, ...episodeResults]
      }

      if (type === 'podcasts' || type === 'all') {
        const podcastResults = await this.searchUserPodcasts(userId, query)
        allResults = [...allResults, ...podcastResults]
      }

      // Rank results by relevance
      const rankedResults = this.rankResults(allResults, query)

      // Cache results
      this.searchCache.set(cacheKey, {
        results: rankedResults,
        timestamp: Date.now(),
      })

      return this.paginateResults(rankedResults, limit, offset)
    } catch (error) {
      console.error('Search error:', error)
      throw new Error('Search failed')
    }
  }

  private async searchUserEpisodes(userId: string, query: string): Promise<SearchResult[]> {
    // Get user's podcasts first
    const userPodcasts = await dynamoService.getPodcastsByUser(userId)
    const podcastMap = new Map(userPodcasts.map(p => [p.podcastId, p]))

    if (userPodcasts.length === 0) {
      return []
    }

    // Search across all user's episodes in parallel
    const searchPromises = userPodcasts.map(async podcast => {
      try {
        const episodesResponse = await dynamoService.getEpisodesByPodcast(podcast.podcastId, 1000)
        const episodes = episodesResponse.episodes || []

        return episodes
          .filter(episode => this.matchesQuery(episode, query))
          .map(episode => this.mapToSearchResult(episode, podcast.title, query))
      } catch (error) {
        console.error(`Error searching podcast ${podcast.podcastId}:`, error)
        return []
      }
    })

    const results = await Promise.all(searchPromises)
    return results.flat()
  }

  private async searchUserPodcasts(userId: string, query: string): Promise<SearchResult[]> {
    const userPodcasts = await dynamoService.getPodcastsByUser(userId)
    const matchingPodcasts = userPodcasts.filter(podcast => this.matchesPodcastQuery(podcast, query))

    // For podcast matches, return recent episodes from matching podcasts
    const podcastEpisodePromises = matchingPodcasts.map(async podcast => {
      try {
        const episodesResponse = await dynamoService.getEpisodesByPodcast(podcast.podcastId, 5)
        const episodes = episodesResponse.episodes || []

        return episodes.map(episode => ({
          ...this.mapToSearchResult(episode, podcast.title, query),
          matchType: 'podcast' as const,
          relevanceScore: 0.6, // Lower score for podcast matches
        }))
      } catch (error) {
        console.error(`Error getting episodes for podcast ${podcast.podcastId}:`, error)
        return []
      }
    })

    const results = await Promise.all(podcastEpisodePromises)
    return results.flat()
  }

  private matchesQuery(episode: any, query: string): boolean {
    const queryLower = query.toLowerCase()
    const title = (episode.title || '').toLowerCase()
    const description = (episode.description || '').toLowerCase()
    const guests = (episode.extractedGuests || []).map((g: string) => g.toLowerCase())

    return (
      title.includes(queryLower) ||
      description.includes(queryLower) ||
      guests.some((guest: string) => guest.includes(queryLower))
    )
  }

  private matchesPodcastQuery(podcast: any, query: string): boolean {
    const queryLower = query.toLowerCase()
    const title = (podcast.title || '').toLowerCase()
    const description = (podcast.description || '').toLowerCase()

    return title.includes(queryLower) || description.includes(queryLower)
  }

  private mapToSearchResult(episode: any, podcastName: string, query: string): SearchResult {
    return {
      episodeId: episode.episodeId,
      title: episode.title,
      description: episode.description,
      podcastName,
      podcastId: episode.podcastId,
      releaseDate: episode.releaseDate,
      duration: episode.duration,
      audioUrl: episode.audioUrl,
      imageUrl: episode.imageUrl,
      extractedGuests: episode.extractedGuests,
      relevanceScore: this.calculateRelevanceScore(episode, query),
      matchType: this.getMatchType(episode, query),
    }
  }

  private calculateRelevanceScore(episode: any, query: string): number {
    const queryLower = query.toLowerCase()
    const title = (episode.title || '').toLowerCase()
    const description = (episode.description || '').toLowerCase()
    const guests = (episode.extractedGuests || []).map((g: string) => g.toLowerCase())

    let score = 0

    // Title match (highest priority)
    if (title.includes(queryLower)) {
      score += 1.0
      // Bonus for exact match or match at beginning
      if (title === queryLower) score += 0.5
      else if (title.startsWith(queryLower)) score += 0.3
    }

    // Description match
    if (description.includes(queryLower)) {
      score += 0.5
    }

    // Guest match
    if (guests.some((guest: string) => guest.includes(queryLower))) {
      score += 0.7
      // Bonus for exact guest name match
      if (guests.some((guest: string) => guest === queryLower)) score += 0.3
    }

    // Boost score for longer matches
    const matchLength = query.length
    if (matchLength > 10) score += 0.1
    if (matchLength > 20) score += 0.1

    return Math.min(score, 2.0) // Cap at 2.0
  }

  private getMatchType(episode: any, query: string): SearchResult['matchType'] {
    const queryLower = query.toLowerCase()
    const title = (episode.title || '').toLowerCase()
    const guests = (episode.extractedGuests || []).map((g: string) => g.toLowerCase())

    if (title.includes(queryLower)) return 'title'
    if (guests.some((guest: string) => guest.includes(queryLower))) return 'guest'
    return 'description'
  }

  private rankResults(results: SearchResult[], query: string): SearchResult[] {
    return results.sort((a, b) => {
      // First sort by relevance score (descending)
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore
      }
      // Then by match type priority
      const matchTypePriority = { title: 3, guest: 2, description: 1, podcast: 0 }
      const aPriority = matchTypePriority[a.matchType]
      const bPriority = matchTypePriority[b.matchType]
      if (bPriority !== aPriority) {
        return bPriority - aPriority
      }
      // Finally by release date (newer first)
      return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
    })
  }

  private paginateResults(results: SearchResult[], limit: number, offset: number): SearchResponse {
    const paginatedResults = results.slice(offset, offset + limit)

    return {
      results: paginatedResults,
      pagination: {
        total: results.length,
        limit,
        offset,
        hasMore: offset + limit < results.length,
      },
    }
  }

  // Clean up old cache entries
  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, value] of this.searchCache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.searchCache.delete(key)
      }
    }
  }
}

export const searchService = new SearchService()
