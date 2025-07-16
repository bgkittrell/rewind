import { describe, it, expect } from 'vitest'
import {
  episodeIdParamSchema,
  podcastIdParamSchema,
  saveProgressSchema,
  episodeListQuerySchema,
  listeningHistoryQuerySchema,
} from '../../validation/episodeSchemas'

describe('Episode Validation Schemas', () => {
  describe('episodeIdParamSchema', () => {
    it('should validate correct UUID format', () => {
      const validData = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
      }
      const result = episodeIdParamSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should reject invalid UUID format', () => {
      const invalidData = {
        episodeId: 'not-a-uuid',
      }
      const result = episodeIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Invalid episode ID format')
    })

    it('should reject empty episodeId', () => {
      const invalidData = {
        episodeId: '',
      }
      const result = episodeIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject missing episodeId field', () => {
      const invalidData = {}
      const result = episodeIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('podcastIdParamSchema', () => {
    it('should validate correct UUID format', () => {
      const validData = {
        podcastId: '123e4567-e89b-12d3-a456-426614174000',
      }
      const result = podcastIdParamSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should reject invalid UUID format', () => {
      const invalidData = {
        podcastId: 'not-a-uuid',
      }
      const result = podcastIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Invalid podcast ID format')
    })

    it('should reject empty podcastId', () => {
      const invalidData = {
        podcastId: '',
      }
      const result = podcastIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject missing podcastId field', () => {
      const invalidData = {}
      const result = podcastIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('saveProgressSchema', () => {
    it('should validate correct progress data', () => {
      const validData = {
        position: 120.5,
        duration: 1800,
        podcastId: 'test-podcast-id',
      }
      const result = saveProgressSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should validate with zero position', () => {
      const validData = {
        position: 0,
        duration: 1800,
        podcastId: 'test-podcast-id',
      }
      const result = saveProgressSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should validate with zero duration', () => {
      const validData = {
        position: 120,
        duration: 0,
        podcastId: 'test-podcast-id',
      }
      const result = saveProgressSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should reject negative position', () => {
      const invalidData = {
        position: -10,
        duration: 1800,
        podcastId: 'test-podcast-id',
      }
      const result = saveProgressSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Position must be non-negative')
    })

    it('should reject negative duration', () => {
      const invalidData = {
        position: 120,
        duration: -100,
        podcastId: 'test-podcast-id',
      }
      const result = saveProgressSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Duration must be non-negative')
    })

    it('should reject non-numeric position', () => {
      const invalidData = {
        position: 'not-a-number',
        duration: 1800,
        podcastId: 'test-podcast-id',
      }
      const result = saveProgressSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject non-numeric duration', () => {
      const invalidData = {
        position: 120,
        duration: 'not-a-number',
        podcastId: 'test-podcast-id',
      }
      const result = saveProgressSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject missing fields', () => {
      const invalidData = {
        position: 120,
      }
      const result = saveProgressSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('episodeListQuerySchema', () => {
    it('should validate correct query parameters', () => {
      const validData = {
        limit: '50',
        lastEvaluatedKey: 'some-key',
      }
      const result = episodeListQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        limit: 50,
        lastEvaluatedKey: 'some-key',
      })
    })

    it('should validate with only limit parameter', () => {
      const validData = {
        limit: '25',
      }
      const result = episodeListQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        limit: 25,
      })
    })

    it('should validate with only lastEvaluatedKey parameter', () => {
      const validData = {
        lastEvaluatedKey: 'some-key',
      }
      const result = episodeListQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        lastEvaluatedKey: 'some-key',
      })
    })

    it('should validate with empty query parameters', () => {
      const validData = {}
      const result = episodeListQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({})
    })

    it('should validate with undefined', () => {
      const result = episodeListQuerySchema.safeParse(undefined)
      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })

    it('should reject limit greater than 100', () => {
      const invalidData = {
        limit: '101',
      }
      const result = episodeListQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Limit must be between 1 and 100')
    })

    it('should reject limit of 0', () => {
      const invalidData = {
        limit: '0',
      }
      const result = episodeListQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Limit must be between 1 and 100')
    })

    it('should reject negative limit', () => {
      const invalidData = {
        limit: '-5',
      }
      const result = episodeListQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Limit must be between 1 and 100')
    })

    it('should reject non-numeric limit', () => {
      const invalidData = {
        limit: 'not-a-number',
      }
      const result = episodeListQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('listeningHistoryQuerySchema', () => {
    it('should validate correct query parameters', () => {
      const validData = {
        limit: '50',
        days: '30',
      }
      const result = listeningHistoryQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        limit: 50,
        days: 30,
      })
    })

    it('should validate with only limit parameter', () => {
      const validData = {
        limit: '25',
      }
      const result = listeningHistoryQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        limit: 25,
      })
    })

    it('should validate with only days parameter', () => {
      const validData = {
        days: '7',
      }
      const result = listeningHistoryQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        days: 7,
      })
    })

    it('should validate with empty query parameters', () => {
      const validData = {}
      const result = listeningHistoryQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({})
    })

    it('should validate with undefined', () => {
      const result = listeningHistoryQuerySchema.safeParse(undefined)
      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })

    it('should reject limit greater than 100', () => {
      const invalidData = {
        limit: '101',
      }
      const result = listeningHistoryQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Limit must be between 1 and 100')
    })

    it('should reject limit of 0', () => {
      const invalidData = {
        limit: '0',
      }
      const result = listeningHistoryQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Limit must be between 1 and 100')
    })

    it('should reject days greater than 365', () => {
      const invalidData = {
        days: '366',
      }
      const result = listeningHistoryQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Days must be between 1 and 365')
    })

    it('should reject days of 0', () => {
      const invalidData = {
        days: '0',
      }
      const result = listeningHistoryQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Days must be between 1 and 365')
    })

    it('should reject negative days', () => {
      const invalidData = {
        days: '-5',
      }
      const result = listeningHistoryQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Days must be between 1 and 365')
    })

    it('should reject non-numeric limit', () => {
      const invalidData = {
        limit: 'not-a-number',
      }
      const result = listeningHistoryQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject non-numeric days', () => {
      const invalidData = {
        days: 'not-a-number',
      }
      const result = listeningHistoryQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
