import { describe, it, expect } from '@jest/globals'
import { addPodcastSchema, podcastIdParamSchema, podcastListQuerySchema } from '../../validation/podcastSchemas'

describe('Podcast Validation Schemas', () => {
  describe('addPodcastSchema', () => {
    it('should validate correct podcast data with https URL', () => {
      const validData = {
        rssUrl: 'https://example.com/feed.xml',
      }
      const result = addPodcastSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should validate correct podcast data with http URL', () => {
      const validData = {
        rssUrl: 'http://example.com/feed.xml',
      }
      const result = addPodcastSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should reject invalid URL format', () => {
      const invalidData = {
        rssUrl: 'not-a-url',
      }
      const result = addPodcastSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Invalid RSS URL')
    })

    it('should reject URL without http/https protocol', () => {
      const invalidData = {
        rssUrl: 'ftp://example.com/feed.xml',
      }
      const result = addPodcastSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('RSS URL must start with http:// or https://')
    })

    it('should reject empty URL', () => {
      const invalidData = {
        rssUrl: '',
      }
      const result = addPodcastSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject missing rssUrl field', () => {
      const invalidData = {}
      const result = addPodcastSchema.safeParse(invalidData)
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

  describe('podcastListQuerySchema', () => {
    it('should validate correct query parameters', () => {
      const validData = {
        limit: '50',
        offset: '10',
      }
      const result = podcastListQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        limit: 50,
        offset: 10,
      })
    })

    it('should validate with only limit parameter', () => {
      const validData = {
        limit: '25',
      }
      const result = podcastListQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        limit: 25,
      })
    })

    it('should validate with only offset parameter', () => {
      const validData = {
        offset: '20',
      }
      const result = podcastListQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        offset: 20,
      })
    })

    it('should validate with empty query parameters', () => {
      const validData = {}
      const result = podcastListQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({})
    })

    it('should validate with undefined', () => {
      const result = podcastListQuerySchema.safeParse(undefined)
      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })

    it('should reject limit greater than 100', () => {
      const invalidData = {
        limit: '101',
      }
      const result = podcastListQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Limit must be between 1 and 100')
    })

    it('should reject limit of 0', () => {
      const invalidData = {
        limit: '0',
      }
      const result = podcastListQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Limit must be between 1 and 100')
    })

    it('should reject negative limit', () => {
      const invalidData = {
        limit: '-5',
      }
      const result = podcastListQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Limit must be between 1 and 100')
    })

    it('should reject negative offset', () => {
      const invalidData = {
        offset: '-10',
      }
      const result = podcastListQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Offset must be non-negative')
    })

    it('should reject non-numeric limit', () => {
      const invalidData = {
        limit: 'not-a-number',
      }
      const result = podcastListQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject non-numeric offset', () => {
      const invalidData = {
        offset: 'not-a-number',
      }
      const result = podcastListQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
