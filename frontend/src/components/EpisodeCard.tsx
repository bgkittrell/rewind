import { useState } from 'react'

interface EpisodeCardProps {
  episode: {
    id: string
    title: string
    podcastName: string
    releaseDate: string
    duration: string
    audioUrl?: string
    imageUrl?: string
    description?: string
    playbackPosition?: number
  }
  podcastImageUrl?: string
  onPlay?: (_episode: EpisodeCardProps['episode']) => void
  onAIExplanation?: (_episode: EpisodeCardProps['episode']) => void
}

export function EpisodeCard({ episode, podcastImageUrl, onPlay, onAIExplanation }: EpisodeCardProps) {
  const [imageError, setImageError] = useState(false)

  const handlePlay = () => {
    onPlay?.(episode)
  }

  const handleAIExplanation = () => {
    onAIExplanation?.(episode)
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
      className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 sm:p-4 hover:shadow-md transition-shadow"
      data-testid="episode-card"
    >
      <div className="flex gap-3 sm:gap-4">
        {/* Episode/Podcast Thumbnail */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-300 rounded-lg flex-shrink-0 overflow-hidden">
          {(episode.imageUrl || podcastImageUrl) && !imageError ? (
            <img
              src={episode.imageUrl || podcastImageUrl}
              alt={`${episode.title} artwork`}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gray-300 flex items-center justify-center">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
          )}
        </div>

        {/* Episode Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight flex-1 line-clamp-2 break-words pr-1">
              {episode.title}
            </h3>

            {/* AI Explanation Button */}
            <button
              onClick={handleAIExplanation}
              className={
                'flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center ' +
                'hover:bg-gray-200 transition-colors'
              }
              aria-label="Get AI explanation"
              title="Get AI explanation"
            >
              <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
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

          <p className="text-sm text-gray-600 truncate mb-1">{episode.podcastName}</p>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {formatDate(episode.releaseDate)} • {episode.duration}
            </p>

            {/* Play Button */}
            <button
              onClick={handlePlay}
              className={
                'flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-full text-xs ' +
                'font-medium hover:bg-secondary transition-colors min-w-[48px] min-h-[32px]'
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
            <div className="mt-2">
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
