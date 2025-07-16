import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router'
import type { Episode } from '../types/episode'
import { GuestExtractionStatus } from './GuestExtractionStatus'

// Test comment for format hook

interface EpisodeCardProps {
  episode: Episode
  podcastImageUrl?: string
  onPlay?: (_episode: Episode) => void
  onAIExplanation?: (_episode: Episode) => void
  recommendationScore?: number
  referrer?: 'search' | 'library' | 'home'
}

function EpisodeCardComponent({
  episode,
  podcastImageUrl,
  onPlay,
  onAIExplanation,
  recommendationScore,
  referrer,
}: EpisodeCardProps) {
  const [imageError, setImageError] = useState(false)
  const navigate = useNavigate()

  const handlePlay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onPlay?.(episode)
    },
    [onPlay, episode],
  )

  const handleAIExplanation = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onAIExplanation?.(episode)
    },
    [onAIExplanation, episode],
  )

  const handleCardClick = useCallback(() => {
    const path = episode.podcastId
      ? `/episode/${episode.podcastId}/${episode.episodeId}`
      : `/episode/${episode.episodeId}`

    navigate(path, {
      state: { referrer: referrer || 'library' },
    })
  }, [navigate, episode.podcastId, episode.episodeId, referrer])

  const formatDate = (dateString: string) => {
    console.log('dateString', dateString)
    if (!dateString) return 'Date unknown'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Date unknown'
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const hasProgress = episode.playbackPosition && episode.playbackPosition > 0

  return (
    <div
      className="bg-white px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
      data-testid="episode-card"
      onClick={handleCardClick}
    >
      <div className="flex gap-3 sm:gap-4">
        {/* Episode/Podcast Thumbnail */}
        <div className="w-16 h-16 sm:w-18 sm:h-18 bg-gray-300 flex-shrink-0 rounded-lg overflow-hidden">
          {(episode.imageUrl || podcastImageUrl) && !imageError ? (
            <img
              src={episode.imageUrl || podcastImageUrl}
              alt={`${episode.title} artwork`}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gray-300 flex items-center justify-center rounded-lg">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
          )}
        </div>

        {/* Episode Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight flex-1 line-clamp-2 break-words">
              {episode.title}
            </h3>
          </div>

          <p className="text-sm text-gray-600 truncate mb-2">{episode.podcastName}</p>

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-gray-500">
                {formatDate(episode.releaseDate)} • {episode.duration}
              </p>
              {/* Guest extraction status */}
              <GuestExtractionStatus episode={episode} />
            </div>

            <div className="flex items-center gap-2">
              {/* Match percentage for recommendations */}
              {recommendationScore !== undefined && (
                <button
                  onClick={handleAIExplanation}
                  className="bg-primary text-white px-2 py-1 rounded-full text-xs font-medium hover:bg-secondary transition-colors active:bg-red-700"
                  title="Click for AI explanation of this recommendation"
                >
                  {(recommendationScore * 100).toFixed(0)}%
                </button>
              )}

              {/* Play Button */}
              <button
                onClick={handlePlay}
                className={
                  'flex items-center gap-1 bg-primary text-white px-4 py-2 text-xs rounded-lg ' +
                  'font-medium hover:bg-secondary transition-colors min-w-[60px] min-h-[32px] active:bg-red-700'
                }
                aria-label={`Play ${episode.title}`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          {hasProgress && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className="bg-primary h-1 rounded-full transition-all"
                  style={{ width: `${episode.playbackPosition!}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{Math.round(episode.playbackPosition!)}% complete</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
// Only re-render if episode data, image URL, or callbacks change
export const EpisodeCard = React.memo(EpisodeCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.episode.episodeId === nextProps.episode.episodeId &&
    prevProps.episode.playbackPosition === nextProps.episode.playbackPosition &&
    prevProps.episode.guestExtractionStatus === nextProps.episode.guestExtractionStatus &&
    prevProps.episode.extractedGuests?.length === nextProps.episode.extractedGuests?.length &&
    prevProps.episode.guestExtractionConfidence === nextProps.episode.guestExtractionConfidence &&
    prevProps.podcastImageUrl === nextProps.podcastImageUrl &&
    prevProps.onPlay === nextProps.onPlay &&
    prevProps.onAIExplanation === nextProps.onAIExplanation &&
    prevProps.recommendationScore === nextProps.recommendationScore &&
    prevProps.referrer === nextProps.referrer
  )
})

// Add displayName for better debugging
EpisodeCard.displayName = 'EpisodeCard'

export default EpisodeCard
