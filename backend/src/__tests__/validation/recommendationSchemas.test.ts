import { describe, it, expect } from '@jest/globals'
import {
  feedbackSchema,
  trackPlaySchema,
  extractGuestsSchema,
  batchExtractGuestsSchema,
  recommendationQuerySchema,
} from '../../validation/recommendationSchemas'

describe('Recommendation Validation Schemas', () => {
  describe('feedbackSchema', () => {
    it('should validate correct feedback data with "up"', () => {
      const validData = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
        feedback: 'up' as const,
      }
      const result = feedbackSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should validate correct feedback data with "down"', () => {
      const validData = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
        feedback: 'down' as const,
      }
      const result = feedbackSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should reject invalid episode ID format', () => {
      const invalidData = {
        episodeId: 'not-a-uuid',
        feedback: 'up',
      }
      const result = feedbackSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Invalid episode ID format')
    })

    it('should reject invalid feedback value', () => {
      const invalidData = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
        feedback: 'invalid',
      }
      const result = feedbackSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Feedback must be either "up" or "down"')
    })

    it('should reject missing fields', () => {
      const invalidData = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
      }
      const result = feedbackSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('trackPlaySchema', () => {
    it('should validate correct track play data with all fields', () => {
      const validData = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
        context: {
          source: 'recommendations',
          filter: 'recent',
          score: 0.85,
        },
      }
      const result = trackPlaySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should validate correct track play data with required fields only', () => {
      const validData = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
        context: {
          source: 'search',
        },
      }
      const result = trackPlaySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should reject invalid episode ID format', () => {
      const invalidData = {
        episodeId: 'not-a-uuid',
        context: {
          source: 'recommendations',
        },
      }
      const result = trackPlaySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Invalid episode ID format')
    })

    it('should reject empty source', () => {
      const invalidData = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
        context: {
          source: '',
        },
      }
      const result = trackPlaySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Source is required')
    })

    it('should reject missing context', () => {
      const invalidData = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
      }
      const result = trackPlaySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject missing source in context', () => {
      const invalidData = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
        context: {
          filter: 'recent',
        },
      }
      const result = trackPlaySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('extractGuestsSchema', () => {
    it('should validate correct extract guests data', () => {
      const validData = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Episode Title',
        description: 'Episode description with guest information',
      }
      const result = extractGuestsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should reject invalid episode ID format', () => {
      const invalidData = {
        episodeId: 'not-a-uuid',
        title: 'Episode Title',
        description: 'Episode description',
      }
      const result = extractGuestsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Invalid episode ID format')
    })

    it('should reject empty title', () => {
      const invalidData = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
        title: '',
        description: 'Episode description',
      }
      const result = extractGuestsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Title is required')
    })

    it('should reject empty description', () => {
      const invalidData = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Episode Title',
        description: '',
      }
      const result = extractGuestsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Description is required')
    })

    it('should reject missing fields', () => {
      const invalidData = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
      }
      const result = extractGuestsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('batchExtractGuestsSchema', () => {
    it('should validate correct batch extract guests data', () => {
      const validData = {
        requests: [
          {
            episodeId: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Episode 1',
            description: 'Description 1',
          },
          {
            episodeId: '123e4567-e89b-12d3-a456-426614174001',
            title: 'Episode 2',
            description: 'Description 2',
          },
        ],
      }
      const result = batchExtractGuestsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should validate with single request', () => {
      const validData = {
        requests: [
          {
            episodeId: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Episode 1',
            description: 'Description 1',
          },
        ],
      }
      const result = batchExtractGuestsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should validate with maximum 10 requests', () => {
      const validData = {
        requests: Array.from({ length: 10 }, (_, i) => ({
          episodeId: `123e4567-e89b-12d3-a456-42661417400${i}`,
          title: `Episode ${i + 1}`,
          description: `Description ${i + 1}`,
        })),
      }
      const result = batchExtractGuestsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should reject empty requests array', () => {
      const invalidData = {
        requests: [],
      }
      const result = batchExtractGuestsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('At least one request is required')
    })

    it('should reject more than 10 requests', () => {
      const invalidData = {
        requests: Array.from({ length: 11 }, (_, i) => ({
          episodeId: `123e4567-e89b-12d3-a456-42661417400${i}`,
          title: `Episode ${i + 1}`,
          description: `Description ${i + 1}`,
        })),
      }
      const result = batchExtractGuestsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Maximum 10 requests allowed')
    })

    it('should reject invalid request in array', () => {
      const invalidData = {
        requests: [
          {
            episodeId: 'not-a-uuid',
            title: 'Episode 1',
            description: 'Description 1',
          },
        ],
      }
      const result = batchExtractGuestsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Invalid episode ID format')
    })

    it('should reject missing requests field', () => {
      const invalidData = {}
      const result = batchExtractGuestsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('recommendationQuerySchema', () => {
    it('should validate correct query parameters', () => {
      const validData = {
        limit: '25',
        filter: 'recent' as const,
      }
      const result = recommendationQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        limit: 25,
        filter: 'recent',
      })
    })

    it('should validate with only limit parameter', () => {
      const validData = {
        limit: '10',
      }
      const result = recommendationQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        limit: 10,
      })
    })

    it('should validate with only filter parameter', () => {
      const validData = {
        filter: 'popular' as const,
      }
      const result = recommendationQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        filter: 'popular',
      })
    })

    it('should validate with empty query parameters', () => {
      const validData = {}
      const result = recommendationQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({})
    })

    it('should validate with undefined', () => {
      const result = recommendationQuerySchema.safeParse(undefined)
      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })

    it('should validate with all filter options', () => {
      const filters = ['recent', 'popular', 'trending'] as const
      filters.forEach(filter => {
        const validData = { filter }
        const result = recommendationQuerySchema.safeParse(validData)
        expect(result.success).toBe(true)
        expect(result.data).toEqual({ filter })
      })
    })

    it('should reject limit greater than 50', () => {
      const invalidData = {
        limit: '51',
      }
      const result = recommendationQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Limit must be between 1 and 50')
    })

    it('should reject limit of 0', () => {
      const invalidData = {
        limit: '0',
      }
      const result = recommendationQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Limit must be between 1 and 50')
    })

    it('should reject negative limit', () => {
      const invalidData = {
        limit: '-5',
      }
      const result = recommendationQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Limit must be between 1 and 50')
    })

    it('should reject invalid filter value', () => {
      const invalidData = {
        filter: 'invalid',
      }
      const result = recommendationQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject non-numeric limit', () => {
      const invalidData = {
        limit: 'not-a-number',
      }
      const result = recommendationQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
