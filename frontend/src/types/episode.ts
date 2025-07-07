// Unified Episode interface that matches backend structure
export interface Episode {
  episodeId: string // Use episodeId consistently (not just 'id')
  podcastId: string // Explicit podcastId field to fix brittle extraction
  title: string
  description?: string
  audioUrl: string
  duration: string
  releaseDate: string
  imageUrl?: string
  guests?: string[]
  tags?: string[]
  createdAt?: string
  naturalKey?: string

  // Frontend-specific fields for compatibility
  podcastName?: string // For display purposes
  playbackPosition?: number // Current playback position in seconds
  podcastImageUrl?: string // Fallback image from podcast
}

// Legacy interface support for gradual migration
export interface LegacyEpisode {
  id: string
  title: string
  podcastName: string
  releaseDate: string
  duration: string
  audioUrl?: string
  imageUrl?: string
  description?: string
  playbackPosition?: number
  podcastImageUrl?: string
}

// Utility function to convert legacy episode to unified episode
export function convertLegacyEpisode(legacy: LegacyEpisode, podcastId: string): Episode {
  return {
    episodeId: legacy.id,
    podcastId,
    title: legacy.title,
    description: legacy.description,
    audioUrl: legacy.audioUrl || '',
    duration: legacy.duration,
    releaseDate: legacy.releaseDate,
    imageUrl: legacy.imageUrl,
    podcastName: legacy.podcastName,
    playbackPosition: legacy.playbackPosition,
    podcastImageUrl: legacy.podcastImageUrl,
  }
}

// Utility function to convert unified episode to legacy format (for backward compatibility)
export function convertToLegacyEpisode(episode: Episode): LegacyEpisode {
  return {
    id: episode.episodeId,
    title: episode.title,
    podcastName: episode.podcastName || '',
    releaseDate: episode.releaseDate,
    duration: episode.duration,
    audioUrl: episode.audioUrl,
    imageUrl: episode.imageUrl,
    description: episode.description,
    playbackPosition: episode.playbackPosition,
    podcastImageUrl: episode.podcastImageUrl,
  }
}
