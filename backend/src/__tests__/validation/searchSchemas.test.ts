import { describe, it, expect } from '@jest/globals'
import { searchQuerySchema } from '../../validation/searchSchemas'

describe('Search Validation Schemas', () => {
  describe('searchQuerySchema', () => {
    it('should validate correct search query with all parameters', () => {
      const validData = {
        q: 'test query',
        filter: 'title' as const,
        limit: '25',
        offset: '10',
      }
      const result = searchQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        q: 'test query',
        filter: 'title',
        limit: 25,
        offset: 10,
      })
    })

    it('should validate with only required query parameter', () => {
      const validData = {
        q: 'test query',
      }
      const result = searchQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        q: 'test query',
        filter: 'all', // default value
      })
    })

    it('should validate with query and filter only', () => {
      const validData = {
        q: 'test query',
        filter: 'description' as const,
      }
      const result = searchQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        q: 'test query',
        filter: 'description',
      })
    })

    it('should validate with query and limit only', () => {
      const validData = {
        q: 'test query',
        limit: '50',
      }
      const result = searchQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        q: 'test query',
        filter: 'all',
        limit: 50,
      })
    })

    it('should validate with query and offset only', () => {
      const validData = {
        q: 'test query',
        offset: '20',
      }
      const result = searchQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        q: 'test query',
        filter: 'all',
        offset: 20,
      })
    })

    it('should validate all filter options', () => {
      const filters = ['title', 'description', 'author', 'all'] as const
      filters.forEach(filter => {
        const validData = {
          q: 'test query',
          filter,
        }
        const result = searchQuerySchema.safeParse(validData)
        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          q: 'test query',
          filter,
        })
      })
    })

    it('should reject empty query', () => {
      const invalidData = {
        q: '',
      }
      const result = searchQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Search query is required')
    })

    it('should reject query that is too long', () => {
      const invalidData = {
        q: 'a'.repeat(201),
      }
      const result = searchQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Search query must be less than 200 characters')
    })

    it('should reject missing query parameter', () => {
      const invalidData = {
        filter: 'title',
      }
      const result = searchQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid filter value', () => {
      const invalidData = {
        q: 'test query',
        filter: 'invalid',
      }
      const result = searchQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject limit greater than 100', () => {
      const invalidData = {
        q: 'test query',
        limit: '101',
      }
      const result = searchQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Limit must be between 1 and 100')
    })

    it('should reject limit of 0', () => {
      const invalidData = {
        q: 'test query',
        limit: '0',
      }
      const result = searchQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Limit must be between 1 and 100')
    })

    it('should reject negative limit', () => {
      const invalidData = {
        q: 'test query',
        limit: '-5',
      }
      const result = searchQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Limit must be between 1 and 100')
    })

    it('should reject negative offset', () => {
      const invalidData = {
        q: 'test query',
        offset: '-10',
      }
      const result = searchQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Offset must be non-negative')
    })

    it('should reject non-numeric limit', () => {
      const invalidData = {
        q: 'test query',
        limit: 'not-a-number',
      }
      const result = searchQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject non-numeric offset', () => {
      const invalidData = {
        q: 'test query',
        offset: 'not-a-number',
      }
      const result = searchQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate maximum length query', () => {
      const validData = {
        q: 'a'.repeat(200),
      }
      const result = searchQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        q: 'a'.repeat(200),
        filter: 'all',
      })
    })

    it('should validate limit at maximum (100)', () => {
      const validData = {
        q: 'test query',
        limit: '100',
      }
      const result = searchQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        q: 'test query',
        filter: 'all',
        limit: 100,
      })
    })

    it('should validate offset at zero', () => {
      const validData = {
        q: 'test query',
        offset: '0',
      }
      const result = searchQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        q: 'test query',
        filter: 'all',
        offset: 0,
      })
    })
  })
})
