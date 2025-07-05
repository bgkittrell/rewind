import { z } from 'zod'

// Common validation patterns
const uuidSchema = z.string().uuid('Invalid UUID format')
const nonEmptyStringSchema = z.string().min(1, 'String cannot be empty').max(1000, 'String too long')
const episodeIdSchema = z.string().min(1, 'Episode ID is required').max(100, 'Episode ID too long')
const podcastIdSchema = z.string().min(1, 'Podcast ID is required').max(100, 'Podcast ID too long')

// Recommendation filters schema
export const recommendationFiltersSchema = z
  .object({
    not_recent: z.boolean().optional(),
    favorites: z.boolean().optional(),
    guests: z.boolean().optional(),
    new: z.boolean().optional(),
  })
  .strict()

// Get recommendations query parameters schema
export const getRecommendationsQuerySchema = z
  .object({
    limit: z
      .string()
      .optional()
      .transform(val => (val ? parseInt(val, 10) : 20))
      .pipe(z.number().min(1, 'Limit must be at least 1').max(50, 'Limit cannot exceed 50')),
    not_recent: z
      .string()
      .optional()
      .transform(val => val === 'true'),
    favorites: z
      .string()
      .optional()
      .transform(val => val === 'true'),
    guests: z
      .string()
      .optional()
      .transform(val => val === 'true'),
    new: z
      .string()
      .optional()
      .transform(val => val === 'true'),
  })
  .strict()

// Guest extraction request schema
export const guestExtractionRequestSchema = z
  .object({
    episodeId: episodeIdSchema,
    title: nonEmptyStringSchema,
    description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description too long'),
  })
  .strict()

// Batch guest extraction request schema
export const batchGuestExtractionRequestSchema = z
  .array(guestExtractionRequestSchema)
  .min(1, 'At least one extraction request is required')
  .max(10, 'Cannot process more than 10 requests at once')

// Guest analytics update schema
export const guestAnalyticsUpdateSchema = z
  .object({
    episodeId: episodeIdSchema,
    guests: z
      .array(z.string().min(1, 'Guest name cannot be empty').max(100, 'Guest name too long'))
      .min(1, 'At least one guest is required')
      .max(10, 'Cannot track more than 10 guests per episode'),
    action: z.enum(['listen', 'favorite'], {
      errorMap: () => ({ message: 'Action must be either "listen" or "favorite"' }),
    }),
    rating: z.number().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5').optional(),
  })
  .strict()

// User favorites schema
export const userFavoritesSchema = z
  .object({
    itemId: nonEmptyStringSchema,
    itemType: z.enum(['episode', 'podcast'], {
      errorMap: () => ({ message: 'Item type must be either "episode" or "podcast"' }),
    }),
    isFavorite: z.boolean(),
    rating: z.number().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5').optional(),
    tags: z
      .array(z.string().min(1, 'Tag cannot be empty').max(50, 'Tag too long'))
      .max(10, 'Cannot have more than 10 tags')
      .optional(),
  })
  .strict()

// Episode schema for validation
export const episodeSchema = z
  .object({
    episodeId: episodeIdSchema,
    podcastId: podcastIdSchema,
    title: nonEmptyStringSchema,
    description: z.string().max(10000, 'Description too long'),
    audioUrl: z.string().url('Invalid audio URL'),
    duration: z.string().regex(/^\d{1,2}:\d{2}(:\d{2})?$/, 'Duration must be in format MM:SS or HH:MM:SS'),
    releaseDate: z.string().datetime('Invalid release date format'),
    imageUrl: z.string().url('Invalid image URL').optional(),
    guests: z.array(z.string().max(100, 'Guest name too long')).optional(),
    tags: z.array(z.string().max(50, 'Tag too long')).optional(),
    createdAt: z.string().datetime('Invalid created date format'),
    // AI Guest Extraction Fields
    extractedGuests: z.array(z.string().max(100, 'Guest name too long')).optional(),
    guestExtractionStatus: z.enum(['pending', 'completed', 'failed']).optional(),
    guestExtractionDate: z.string().datetime('Invalid extraction date format').optional(),
    guestExtractionConfidence: z.number().min(0).max(1).optional(),
    rawGuestData: z.string().max(5000, 'Raw guest data too long').optional(),
  })
  .strict()

// API Gateway event validation
export const apiGatewayEventSchema = z.object({
  httpMethod: z.string(),
  path: z.string(),
  queryStringParameters: z.record(z.string()).nullable(),
  body: z.string().nullable(),
  headers: z.record(z.string()),
  requestContext: z.object({
    authorizer: z.object({
      userId: z.string().min(1, 'User ID is required'),
      email: z.string().email('Invalid email format'),
      name: z.string().min(1, 'Name is required'),
    }),
  }),
})

// Rate limiting schemas
export const rateLimitKeySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  endpoint: z.string().min(1, 'Endpoint is required'),
  timeWindow: z.number().positive('Time window must be positive'),
})

// Error sanitization schema
export const sanitizedErrorSchema = z.object({
  message: z.string(),
  code: z.string(),
  timestamp: z.string().datetime(),
  path: z.string().optional(),
  details: z.string().optional(),
})

// Validation helper functions
export const validateRequest = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      throw new Error(`Validation failed: ${errorMessages}`)
    }
    throw new Error('Validation failed: Unknown error')
  }
}

export const validateQueryParams = (queryParams: Record<string, string> | null) => {
  if (!queryParams) {
    return {
      limit: 20,
      not_recent: false,
      favorites: false,
      guests: false,
      new: false,
    }
  }

  try {
    return getRecommendationsQuerySchema.parse(queryParams)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      throw new Error(`Query parameter validation failed: ${errorMessages}`)
    }
    throw new Error('Query parameter validation failed: Unknown error')
  }
}

export const validateRequestBody = <T>(schema: z.ZodSchema<T>, body: string | null): T => {
  if (!body) {
    throw new Error('Request body is required')
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(body)
  } catch {
    throw new Error('Invalid JSON in request body')
  }

  return validateRequest(schema, parsedBody)
}

// Security validation helpers
export const sanitizeString = (input: string, maxLength: number = 1000): string => {
  // Remove potentially dangerous characters and limit length
  return input
    .replace(/[<>'"&]/g, '') // Remove HTML/XML dangerous chars
    .replace(/[^\x20-\x7E]/g, '') // Remove control characters (non-printable ASCII)
    .slice(0, maxLength)
    .trim()
}

export const validateUserId = (userId: string): string => {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid user ID is required')
  }

  // Basic sanitization and validation
  const sanitized = sanitizeString(userId, 100)
  if (sanitized.length === 0) {
    throw new Error('User ID cannot be empty after sanitization')
  }

  return sanitized
}

export const validateEpisodeId = (episodeId: string): string => {
  if (!episodeId || typeof episodeId !== 'string') {
    throw new Error('Valid episode ID is required')
  }

  const sanitized = sanitizeString(episodeId, 100)
  if (sanitized.length === 0) {
    throw new Error('Episode ID cannot be empty after sanitization')
  }

  return sanitized
}

// Content validation for AI processing
export const validateContentForAI = (title: string, description: string): { title: string; description: string } => {
  const sanitizedTitle = sanitizeString(title, 500)
  const sanitizedDescription = sanitizeString(description, 5000)

  if (sanitizedTitle.length < 3) {
    throw new Error('Title must be at least 3 characters after sanitization')
  }

  if (sanitizedDescription.length < 10) {
    throw new Error('Description must be at least 10 characters after sanitization')
  }

  return {
    title: sanitizedTitle,
    description: sanitizedDescription,
  }
}

// Export all schemas for use in handlers
export { uuidSchema, nonEmptyStringSchema, episodeIdSchema, podcastIdSchema }
