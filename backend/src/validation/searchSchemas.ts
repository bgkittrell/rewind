import { z } from 'zod'

// Search query parameters schema
export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200, 'Search query must be less than 200 characters'),
  filter: z.enum(['title', 'description', 'author', 'all']).optional().default('all'),
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

// Export types for TypeScript
export type SearchQuery = z.infer<typeof searchQuerySchema>
