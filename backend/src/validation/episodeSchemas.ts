import { z } from 'zod'

// Episode ID path parameter schema
export const episodeIdParamSchema = z.object({
  episodeId: z.string().uuid('Invalid episode ID format'),
})

// Podcast ID path parameter schema
export const podcastIdParamSchema = z.object({
  podcastId: z.string().uuid('Invalid podcast ID format'),
})

// Save progress schema
export const saveProgressSchema = z.object({
  position: z.number().min(0, 'Position must be non-negative'),
  duration: z.number().min(0, 'Duration must be non-negative'),
  podcastId: z.string().min(1, 'Podcast ID is required'),
})

// Query parameters for episode listing
export const episodeListQuerySchema = z
  .object({
    limit: z
      .string()
      .transform(Number)
      .refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100')
      .optional(),
    lastEvaluatedKey: z.string().optional(),
  })
  .optional()

// Query parameters for listening history
export const listeningHistoryQuerySchema = z
  .object({
    limit: z
      .string()
      .transform(Number)
      .refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100')
      .optional(),
    days: z
      .string()
      .transform(Number)
      .refine(n => n > 0 && n <= 365, 'Days must be between 1 and 365')
      .optional(),
  })
  .optional()

// Export types for TypeScript
export type EpisodeIdParam = z.infer<typeof episodeIdParamSchema>
export type PodcastIdParam = z.infer<typeof podcastIdParamSchema>
export type SaveProgressRequest = z.infer<typeof saveProgressSchema>
export type EpisodeListQuery = z.infer<typeof episodeListQuerySchema>
export type ListeningHistoryQuery = z.infer<typeof listeningHistoryQuerySchema>
