import { z } from 'zod'

// Add podcast schema
export const addPodcastSchema = z.object({
  rssUrl: z
    .string()
    .url('Invalid RSS URL')
    .refine(url => {
      // Ensure it's HTTP/HTTPS
      return url.startsWith('http://') || url.startsWith('https://')
    }, 'RSS URL must start with http:// or https://'),
})

// Podcast ID path parameter schema
export const podcastIdParamSchema = z.object({
  podcastId: z.string().uuid('Invalid podcast ID format'),
})

// Query parameters for podcast listing
export const podcastListQuerySchema = z
  .object({
    limit: z
      .string()
      .transform(Number)
      .refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100')
      .optional(),
    offset: z
      .string()
      .transform(Number)
      .refine(n => n >= 0, 'Offset must be non-negative')
      .optional(),
  })
  .optional()

// Export types for TypeScript
export type AddPodcastRequest = z.infer<typeof addPodcastSchema>
export type PodcastIdParam = z.infer<typeof podcastIdParamSchema>
export type PodcastListQuery = z.infer<typeof podcastListQuerySchema>
