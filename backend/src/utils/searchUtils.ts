import { SearchContext, SearchScore, SEARCH_CONFIG, SEARCH_FIELD_WEIGHTS } from '../types/search'
import { Episode } from '../types'

/**
 * Normalize a search query by lowercasing and removing special characters
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Tokenize a search query into individual terms
 */
export function tokenizeQuery(query: string): string[] {
  const normalized = normalizeQuery(query)
  return normalized.split(' ').filter(term => term.length >= SEARCH_CONFIG.MIN_SEARCH_LENGTH)
}

/**
 * Create a search context from a query string
 */
export function createSearchContext(query: string): SearchContext {
  const terms = tokenizeQuery(query)
  const normalizedTerms = terms.map(term => term.toLowerCase())

  return {
    query,
    terms,
    normalizedTerms,
  }
}

/**
 * Check if a text contains all search terms
 */
export function containsAllTerms(text: string, terms: string[]): boolean {
  if (!text || terms.length === 0) return false

  const normalizedText = text.toLowerCase()
  return terms.every(term => normalizedText.includes(term.toLowerCase()))
}

/**
 * Calculate the score for a single field match
 */
export function calculateFieldScore(
  fieldValue: string | string[] | undefined,
  terms: string[],
  weight: number,
): number {
  if (!fieldValue) return 0

  const text = Array.isArray(fieldValue) ? fieldValue.join(' ') : fieldValue
  const normalizedText = text.toLowerCase()

  let score = 0
  let matchCount = 0

  for (const term of terms) {
    const termLower = term.toLowerCase()
    if (normalizedText.includes(termLower)) {
      matchCount++

      // Bonus for exact word match vs partial match
      const wordBoundaryRegex = new RegExp(`\\b${termLower}\\b`, 'i')
      if (wordBoundaryRegex.test(text)) {
        score += weight * 1.5
      } else {
        score += weight
      }

      // Bonus for multiple occurrences
      const occurrences = (normalizedText.match(new RegExp(termLower, 'g')) || []).length
      score += weight * 0.1 * (occurrences - 1)
    }
  }

  // Bonus for matching all terms
  if (matchCount === terms.length) {
    score *= 1.2
  }

  return score
}

/**
 * Calculate recency bonus for episodes
 */
export function calculateRecencyBonus(releaseDate: string): number {
  const now = new Date()
  const episodeDate = new Date(releaseDate)
  const daysDiff = (now.getTime() - episodeDate.getTime()) / (1000 * 60 * 60 * 24)

  // Episodes from the last 7 days get maximum bonus
  if (daysDiff <= 7) return SEARCH_CONFIG.RECENCY_WEIGHT * 2
  // Episodes from the last 30 days get standard bonus
  if (daysDiff <= 30) return SEARCH_CONFIG.RECENCY_WEIGHT
  // Episodes from the last 90 days get half bonus
  if (daysDiff <= 90) return SEARCH_CONFIG.RECENCY_WEIGHT * 0.5
  // Older episodes get no bonus
  return 0
}

/**
 * Highlight search terms in text
 */
export function highlightTerms(text: string, terms: string[]): string {
  if (!text || terms.length === 0) return text

  let highlightedText = text

  // Sort terms by length (longest first) to avoid partial replacements
  const sortedTerms = [...terms].sort((a, b) => b.length - a.length)

  for (const term of sortedTerms) {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi')
    highlightedText = highlightedText.replace(
      regex,
      `${SEARCH_CONFIG.HIGHLIGHT_TAG_OPEN}$1${SEARCH_CONFIG.HIGHLIGHT_TAG_CLOSE}`,
    )
  }

  return highlightedText
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Calculate search score for an episode
 */
export function calculateEpisodeScore(episode: Episode & { podcastTitle?: string }, terms: string[]): SearchScore {
  let totalScore = 0
  const matchedFields = new Set<string>()
  const highlights = new Map<string, string>()

  // Calculate score for each field
  for (const { field, weight } of SEARCH_FIELD_WEIGHTS) {
    const fieldValue = (episode as any)[field]
    const fieldScore = calculateFieldScore(fieldValue, terms, weight)

    if (fieldScore > 0) {
      totalScore += fieldScore
      matchedFields.add(field)

      // Generate highlights for title and description
      if (field === 'title' || field === 'description') {
        const highlightedText = highlightTerms(fieldValue as string, terms)
        highlights.set(field, truncateHighlight(highlightedText, terms))
      }
    }
  }

  // Add recency bonus
  totalScore += calculateRecencyBonus(episode.releaseDate)

  return {
    episodeId: episode.episodeId,
    score: totalScore,
    matchedFields,
    highlights,
  }
}

/**
 * Truncate highlighted text around the first match
 */
function truncateHighlight(text: string, terms: string[], maxLength: number = 200): string {
  if (text.length <= maxLength) return text

  // Find the position of the first highlighted term
  const firstHighlight = text.indexOf(SEARCH_CONFIG.HIGHLIGHT_TAG_OPEN)

  if (firstHighlight === -1) {
    // No highlights, just truncate from the beginning
    return text.substring(0, maxLength) + '...'
  }

  // Calculate context window around the first highlight
  const contextBefore = 50
  const start = Math.max(0, firstHighlight - contextBefore)
  const end = Math.min(text.length, start + maxLength)

  let truncated = text.substring(start, end)

  // Add ellipsis if needed
  if (start > 0) truncated = '...' + truncated
  if (end < text.length) truncated = truncated + '...'

  return truncated
}

/**
 * Sort search results by score (descending)
 */
export function sortByScore<T extends { score: number }>(results: T[]): T[] {
  return results.sort((a, b) => b.score - a.score)
}
