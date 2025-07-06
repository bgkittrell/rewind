import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import type { Episode } from '../types/episode'

interface EpisodeCardProps {
  episode: Episode,
  podcastImageUrl?: string
  onPlay?: (_episode: Episode) => void
  onAIExplanation?: (_episode: Episode) => void
}

export function EpisodeCard({ episode, podcastImageUrl, onPlay, onAIExplanation }: EpisodeCardProps) {
  const [imageError, setImageError] = useState(false)
  const navigate = useNavigate()

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    onPlay?.(episode)
  }

  const handleAIExplanation = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAIExplanation?.(episode)
  }

  const handleCardClick = () => {
    if (episode.podcastId) {
      navigate(`/episode/${episode.podcastId}/${episode.id}`)
    } else {
      navigate(`/episode/${episode.episodeId}`)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
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

            {/* AI Explanation Button */}
            <button
              onClick={handleAIExplanation}
              className={
                'flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center ' +
                'hover:bg-gray-200 transition-colors active:bg-gray-300'
              }
              aria-label="Get AI explanation"
              title="Get AI explanation"
            >
              <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d={
                    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2z' +
                    'm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 ' +
                    '0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z'
                  }
                />
              </svg>
            </button>
          </div>

          <p className="text-sm text-gray-600 truncate mb-2">{episode.podcastName}</p>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {formatDate(episode.releaseDate)} • {episode.duration}
            </p>

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

export default EpisodeCard
