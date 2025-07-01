import { z } from 'zod'

// Common validation schemas
export const addPodcastSchema = z.object({
  rssUrl: z.string().url('Invalid RSS URL format'),
})

export const episodeFeedbackSchema = z.object({
  type: z.enum(['like', 'dislike', 'favorite'], {
    errorMap: () => ({ message: 'Type must be one of: like, dislike, favorite' })
  }),
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().max(1000, 'Comment must be less than 1000 characters').optional(),
})

export const playbackPositionSchema = z.object({
  position: z.number().min(0, 'Position must be non-negative'),
  duration: z.number().min(0, 'Duration must be non-negative'),
  isCompleted: z.boolean().optional().default(false),
})

export const shareLibrarySchema = z.object({
  podcastIds: z.array(z.string()).min(1, 'At least one podcast ID is required'),
})

// Validation utility function
export function validateRequestBody<T>(body: string, schema: z.ZodSchema<T>): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const parsed = JSON.parse(body)
    const result = schema.safeParse(parsed)
    
    if (result.success) {
      return { success: true, data: result.data }
    } else {
      const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      return { success: false, errors }
    }
  } catch (error) {
    return { success: false, errors: ['Invalid JSON format'] }
  }
}

// Query parameter validation
export const queryParamsSchema = z.object({
  limit: z.string().transform(val => {
    const num = parseInt(val, 10)
    return isNaN(num) ? 50 : Math.min(Math.max(num, 1), 100)
  }).optional().default('50'),
  offset: z.string().optional(),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
})

export function validateQueryParams(queryStringParameters: Record<string, string | undefined> | null) {
  const params = queryStringParameters || {}
  // Filter out undefined values
  const filteredParams: Record<string, string> = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      filteredParams[key] = value
    }
  })
  
  const result = queryParamsSchema.safeParse(filteredParams)
  
  if (result.success) {
    return {
      limit: typeof result.data.limit === 'string' ? parseInt(result.data.limit) : result.data.limit,
      offset: result.data.offset,
      sort: result.data.sort as 'newest' | 'oldest',
    }
  }
  
  // Return defaults if validation fails
  return {
    limit: 50,
    offset: undefined,
    sort: 'newest' as const,
  }
}

// Pagination utilities
export function createPaginationToken(lastKey: Record<string, any>): string {
  return Buffer.from(JSON.stringify(lastKey)).toString('base64')
}

export function parsePaginationToken(token: string): Record<string, any> | null {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString())
  } catch {
    return null
  }
}

// UUID validation
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// URL validation
export function isValidUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

// RSS URL validation (more specific than general URL)
export function isValidRssUrl(url: string): boolean {
  if (!isValidUrl(url)) return false
  
  // Basic RSS URL patterns
  const rssPatterns = [
    /\.rss$/i,
    /\.xml$/i,
    /feed/i,
    /rss/i,
  ]
  
  return rssPatterns.some(pattern => pattern.test(url))
}