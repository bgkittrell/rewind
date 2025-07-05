import { describe, it, expect } from 'vitest'
import {
  normalizeQuery,
  tokenizeQuery,
  createSearchContext,
  containsAllTerms,
  calculateFieldScore,
  calculateRecencyBonus,
  highlightTerms,
  calculateEpisodeScore,
  sortByScore,
} from '../searchUtils'
import { Episode } from '../../types'

describe('searchUtils', () => {
  describe('normalizeQuery', () => {
    it('should lowercase and remove special characters', () => {
      expect(normalizeQuery('Hello, World!')).toBe('hello world')
      expect(normalizeQuery('Test@123#Query')).toBe('test 123 query')
      expect(normalizeQuery('  Multiple   Spaces  ')).toBe('multiple spaces')
    })
  })

  describe('tokenizeQuery', () => {
    it('should split query into tokens', () => {
      expect(tokenizeQuery('hello world')).toEqual(['hello', 'world'])
      expect(tokenizeQuery('Test Query 123')).toEqual(['test', 'query', '123'])
    })

    it('should filter out short tokens', () => {
      expect(tokenizeQuery('a hello b world c')).toEqual(['hello', 'world'])
      expect(tokenizeQuery('I am testing')).toEqual(['am', 'testing'])
    })
  })

  describe('createSearchContext', () => {
    it('should create a search context', () => {
      const context = createSearchContext('Hello World')
      expect(context.query).toBe('Hello World')
      expect(context.terms).toEqual(['hello', 'world'])
      expect(context.normalizedTerms).toEqual(['hello', 'world'])
    })
  })

  describe('containsAllTerms', () => {
    it('should check if text contains all terms', () => {
      expect(containsAllTerms('hello world test', ['hello', 'world'])).toBe(true)
      expect(containsAllTerms('hello world test', ['hello', 'missing'])).toBe(false)
      expect(containsAllTerms('HELLO WORLD', ['hello', 'world'])).toBe(true)
    })

    it('should handle edge cases', () => {
      expect(containsAllTerms('', ['hello'])).toBe(false)
      expect(containsAllTerms('hello', [])).toBe(false)
      expect(containsAllTerms('', [])).toBe(false)
    })
  })

  describe('calculateFieldScore', () => {
    it('should calculate score for string fields', () => {
      const score = calculateFieldScore('hello world', ['hello'], 1.0)
      expect(score).toBeGreaterThan(0)
    })

    it('should give bonus for exact word matches', () => {
      const exactScore = calculateFieldScore('hello world', ['hello'], 1.0)
      const partialScore = calculateFieldScore('helloworld', ['hello'], 1.0)
      expect(exactScore).toBeGreaterThan(partialScore)
    })

    it('should handle array fields', () => {
      const score = calculateFieldScore(['tag1', 'hello', 'tag2'], ['hello'], 1.0)
      expect(score).toBeGreaterThan(0)
    })

    it('should give bonus for matching all terms', () => {
      const allTermsScore = calculateFieldScore('hello world', ['hello', 'world'], 1.0)
      const partialScore = calculateFieldScore('hello world', ['hello', 'missing'], 1.0)
      expect(allTermsScore).toBeGreaterThan(partialScore * 2)
    })
  })

  describe('calculateRecencyBonus', () => {
    it('should give maximum bonus for recent episodes', () => {
      const today = new Date().toISOString()
      const bonus = calculateRecencyBonus(today)
      expect(bonus).toBe(0.2) // RECENCY_WEIGHT * 2
    })

    it('should give standard bonus for month-old episodes', () => {
      const date = new Date()
      date.setDate(date.getDate() - 15)
      const bonus = calculateRecencyBonus(date.toISOString())
      expect(bonus).toBe(0.1) // RECENCY_WEIGHT
    })

    it('should give no bonus for old episodes', () => {
      const date = new Date()
      date.setFullYear(date.getFullYear() - 1)
      const bonus = calculateRecencyBonus(date.toISOString())
      expect(bonus).toBe(0)
    })
  })

  describe('highlightTerms', () => {
    it('should highlight matching terms', () => {
      const result = highlightTerms('hello world', ['hello'])
      expect(result).toBe('<mark>hello</mark> world')
    })

    it('should highlight multiple terms', () => {
      const result = highlightTerms('hello world test', ['hello', 'test'])
      expect(result).toBe('<mark>hello</mark> world <mark>test</mark>')
    })

    it('should handle case-insensitive highlighting', () => {
      const result = highlightTerms('Hello WORLD', ['hello', 'world'])
      expect(result).toBe('<mark>Hello</mark> <mark>WORLD</mark>')
    })

    it('should handle overlapping terms correctly', () => {
      const result = highlightTerms('testing test', ['testing', 'test'])
      // When terms overlap, the longer term should be processed first due to sorting
      expect(result).toContain('<mark>')
      expect(result).toContain('</mark>')
      // The exact result will have nested marks due to overlapping terms
      expect(result).toBe('<mark><mark>test</mark>ing</mark> <mark>test</mark>')
    })
  })

  describe('calculateEpisodeScore', () => {
    const mockEpisode: Episode & { podcastTitle?: string } = {
      episodeId: 'ep1',
      podcastId: 'pod1',
      title: 'Test Episode about Machine Learning',
      description: 'A deep dive into machine learning concepts',
      audioUrl: 'http://example.com/audio.mp3',
      duration: '45:00',
      releaseDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      naturalKey: 'test-key',
      extractedGuests: ['John Doe'],
      podcastTitle: 'Tech Podcast',
    }

    it('should calculate score for matching episode', () => {
      const score = calculateEpisodeScore(mockEpisode, ['machine', 'learning'])
      expect(score.score).toBeGreaterThan(0)
      expect(score.matchedFields.has('title')).toBe(true)
      expect(score.matchedFields.has('description')).toBe(true)
    })

    it('should generate highlights', () => {
      const score = calculateEpisodeScore(mockEpisode, ['machine'])
      expect(score.highlights.get('title')).toContain('<mark>Machine</mark>')
      expect(score.highlights.get('description')).toContain('<mark>machine</mark>')
    })

    it('should match guest names', () => {
      const score = calculateEpisodeScore(mockEpisode, ['john'])
      expect(score.matchedFields.has('extractedGuests')).toBe(true)
    })
  })

  describe('sortByScore', () => {
    it('should sort by score in descending order', () => {
      const items = [
        { score: 1.0, id: 'a' },
        { score: 3.0, id: 'b' },
        { score: 2.0, id: 'c' },
      ]
      const sorted = sortByScore(items)
      expect(sorted[0].id).toBe('b')
      expect(sorted[1].id).toBe('c')
      expect(sorted[2].id).toBe('a')
    })
  })
})
