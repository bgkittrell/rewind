// Export all validation schemas
export * from './authSchemas'
export * from './podcastSchemas'
export * from './recommendationSchemas'
export * from './searchSchemas'
export * from './middleware'

// Export episode schemas with renamed duplicates
export {
  episodeIdParamSchema,
  saveProgressSchema,
  episodeListQuerySchema,
  listeningHistoryQuerySchema,
  podcastIdParamSchema as episodePodcastIdParamSchema,
} from './episodeSchemas'

export type {
  EpisodeIdParam,
  SaveProgressRequest,
  EpisodeListQuery,
  ListeningHistoryQuery,
  PodcastIdParam as EpisodePodcastIdParam,
} from './episodeSchemas'
