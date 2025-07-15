import { z } from 'zod'

// Feedback schema
export const feedbackSchema = z.object({
  episodeId: z.string().uuid('Invalid episode ID format'),
  feedback: z.enum(['up', 'down'], {
    errorMap: () => ({ message: 'Feedback must be either "up" or "down"' }),
  }),
})

// Track play schema
export const trackPlaySchema = z.object({
  episodeId: z.string().uuid('Invalid episode ID format'),
  context: z.object({
    source: z.string().min(1, 'Source is required'),
    filter: z.string().optional(),
    score: z.number().optional(),
  }),
})

// Extract guests schema
export const extractGuestsSchema = z.object({
  episodeId: z.string().uuid('Invalid episode ID format'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
})

// Batch extract guests schema
export const batchExtractGuestsSchema = z.object({
  requests: z
    .array(extractGuestsSchema)
    .min(1, 'At least one request is required')
    .max(10, 'Maximum 10 requests allowed'),
})

// Query parameters for recommendations
export const recommendationQuerySchema = z
  .object({
    limit: z
      .string()
      .transform(Number)
      .refine(n => n > 0 && n <= 50, 'Limit must be between 1 and 50')
      .optional(),
    filter: z.enum(['recent', 'popular', 'trending']).optional(),
  })
  .optional()

// Export types for TypeScript
export type FeedbackRequest = z.infer<typeof feedbackSchema>
export type TrackPlayRequest = z.infer<typeof trackPlaySchema>
export type ExtractGuestsRequest = z.infer<typeof extractGuestsSchema>
export type BatchExtractGuestsRequest = z.infer<typeof batchExtractGuestsSchema>
export type RecommendationQuery = z.infer<typeof recommendationQuerySchema>
