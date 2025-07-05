import { DynamoService } from './dynamoService'
import { Episode, Podcast } from '../types'
import { SearchQuery, SearchResponse, SearchResult, SearchableEpisode, SEARCH_CONFIG } from '../types/search'
import { createSearchContext, calculateEpisodeScore, sortByScore } from '../utils/searchUtils'

// Simple in-memory cache for episode data
interface CacheEntry {
  data: any
  timestamp: number
}

const cache = new Map<string, CacheEntry>()

export class SearchService {
  constructor(private dynamoService: DynamoService) {}

  /**
   * Search episodes across user's podcast library
   */
  async searchEpisodes(userId: string, searchQuery: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now()

    // Validate search query
    if (!searchQuery.query || searchQuery.query.trim().length < SEARCH_CONFIG.MIN_SEARCH_LENGTH) {
      return {
        results: [],
        total: 0,
        hasMore: false,
        searchTime: 0,
      }
    }

    if (searchQuery.query.length > SEARCH_CONFIG.MAX_SEARCH_LENGTH) {
      throw new Error(`Search query too long. Maximum length is ${SEARCH_CONFIG.MAX_SEARCH_LENGTH} characters.`)
    }

    // Set defaults
    const limit = Math.min(searchQuery.limit || SEARCH_CONFIG.DEFAULT_LIMIT, SEARCH_CONFIG.MAX_LIMIT)
    const offset = searchQuery.offset || 0

    // Get all episodes for the user
    const episodes = await this.getUserEpisodes(userId, searchQuery.podcastId)

    // Get user's podcasts for enrichment
    const podcasts = await this.getUserPodcasts(userId)
    const podcastMap = new Map(podcasts.map(p => [p.podcastId, p]))

    // Enrich episodes with podcast titles
    const searchableEpisodes: SearchableEpisode[] = episodes.map(episode => ({
      ...episode,
      podcastTitle: podcastMap.get(episode.podcastId)?.title,
    }))

    // Create search context
    const searchContext = createSearchContext(searchQuery.query)

    // Score and filter episodes
    const scoredResults = searchableEpisodes
      .map(episode => {
        const score = calculateEpisodeScore(episode, searchContext.terms)
        return {
          episode,
          score: score.score,
          matchedFields: Array.from(score.matchedFields),
          highlights: Object.fromEntries(score.highlights),
        }
      })
      .filter(result => result.score > 0)

    // Sort by relevance
    const sortedResults = sortByScore(scoredResults)

    // Apply pagination
    const paginatedResults = sortedResults.slice(offset, offset + limit)

    // Format results (filter out episodes with missing podcasts)
    const results: SearchResult[] = paginatedResults
      .filter(({ episode }) => podcastMap.has(episode.podcastId))
      .map(({ episode, score, matchedFields, highlights }) => {
        const podcast = podcastMap.get(episode.podcastId)!
        return {
          episode: this.cleanEpisode(episode),
          podcast: this.cleanPodcast(podcast),
          relevance: {
            score,
            matchedFields,
            highlights,
          },
        }
      })

    const searchTime = (Date.now() - startTime) / 1000

    return {
      results,
      total: sortedResults.length,
      hasMore: offset + limit < sortedResults.length,
      searchTime,
    }
  }

  /**
   * Get all episodes for a user with caching
   */
  private async getUserEpisodes(userId: string, podcastId?: string): Promise<Episode[]> {
    const cacheKey = `episodes:${userId}:${podcastId || 'all'}`
    const cached = this.getFromCache<Episode[]>(cacheKey)

    if (cached) {
      return cached
    }

    let allEpisodes: Episode[] = []

    if (podcastId) {
      // Search within a specific podcast
      const result = await this.dynamoService.getEpisodesByPodcast(podcastId, 1000)
      allEpisodes = result.episodes
    } else {
      // Get all user's podcasts
      const podcasts = await this.dynamoService.getPodcastsByUser(userId)

      // Fetch episodes for each podcast in parallel
      const episodePromises = podcasts.map(podcast => this.dynamoService.getEpisodesByPodcast(podcast.podcastId, 1000))

      const episodeResults = await Promise.all(episodePromises)
      allEpisodes = episodeResults.flatMap(result => result.episodes)
    }

    // Cache the results
    this.setCache(cacheKey, allEpisodes)

    return allEpisodes
  }

  /**
   * Get user's podcasts with caching
   */
  private async getUserPodcasts(userId: string): Promise<Podcast[]> {
    const cacheKey = `podcasts:${userId}`
    const cached = this.getFromCache<Podcast[]>(cacheKey)

    if (cached) {
      return cached
    }

    const podcasts = await this.dynamoService.getPodcastsByUser(userId)
    this.setCache(cacheKey, podcasts)

    return podcasts
  }

  /**
   * Clean episode data for response
   */
  private cleanEpisode(episode: SearchableEpisode): Episode {
    const { podcastTitle, searchableText, ...cleanEpisode } = episode
    return cleanEpisode
  }

  /**
   * Clean podcast data for response
   */
  private cleanPodcast(podcast: Podcast): Pick<Podcast, 'podcastId' | 'title' | 'imageUrl'> {
    return {
      podcastId: podcast.podcastId,
      title: podcast.title,
      imageUrl: podcast.imageUrl,
    }
  }

  /**
   * Get data from cache if not expired
   */
  private getFromCache<T>(key: string): T | null {
    const entry = cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > SEARCH_CONFIG.CACHE_TTL_SECONDS * 1000) {
      cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set data in cache
   */
  private setCache(key: string, data: any): void {
    cache.set(key, {
      data,
      timestamp: Date.now(),
    })

    // Clean up old cache entries periodically
    if (cache.size > 100) {
      const now = Date.now()
      for (const [k, entry] of cache.entries()) {
        if (now - entry.timestamp > SEARCH_CONFIG.CACHE_TTL_SECONDS * 1000) {
          cache.delete(k)
        }
      }
    }
  }

  /**
   * Clear cache for a specific user
   */
  clearUserCache(userId: string): void {
    for (const key of cache.keys()) {
      if (key.includes(userId)) {
        cache.delete(key)
      }
    }
  }
}

// Export singleton instance
export const searchService = new SearchService(new DynamoService())
