import { Episode, Podcast } from './index'

export interface SearchQuery {
  query: string
  limit?: number
  offset?: number
  podcastId?: string
}

export interface SearchResult {
  episode: Episode
  podcast: Pick<Podcast, 'podcastId' | 'title' | 'imageUrl'>
  relevance: {
    score: number
    matchedFields: string[]
    highlights: {
      title?: string
      description?: string
    }
  }
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  hasMore: boolean
  searchTime: number
}

export interface SearchableEpisode extends Episode {
  podcastTitle?: string
  searchableText?: string
}

export interface SearchScore {
  episodeId: string
  score: number
  matchedFields: Set<string>
  highlights: Map<string, string>
}

export interface SearchContext {
  query: string
  terms: string[]
  normalizedTerms: string[]
}

export interface FieldWeight {
  field: string
  weight: number
}

export const SEARCH_FIELD_WEIGHTS: FieldWeight[] = [
  { field: 'title', weight: 3.0 },
  { field: 'extractedGuests', weight: 2.0 },
  { field: 'guests', weight: 2.0 },
  { field: 'description', weight: 1.0 },
  { field: 'tags', weight: 1.5 },
  { field: 'podcastTitle', weight: 1.5 },
]

export const SEARCH_CONFIG = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  HIGHLIGHT_TAG_OPEN: '<mark>',
  HIGHLIGHT_TAG_CLOSE: '</mark>',
  CACHE_TTL_SECONDS: 300, // 5 minutes
  MIN_SEARCH_LENGTH: 2,
  MAX_SEARCH_LENGTH: 100,
  RECENCY_WEIGHT: 0.1, // Bonus for newer episodes
}
