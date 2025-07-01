import { Episode } from '../types/episode'

interface EpisodeCardProps {
  episode: Episode
  onPlay: (episode: Episode) => void
  onAIExplanation: (episode: Episode) => void
}

export function EpisodeCard({ episode, onPlay, onAIExplanation }: EpisodeCardProps) {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const progressWidth = episode.progress ? `${episode.progress * 100}%` : '0%'

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
      <div className="flex gap-3">
        {/* Podcast Thumbnail */}
        <div className="flex-shrink-0">
          <img
            src={episode.podcast.thumbnail || '/default-podcast.png'}
            alt={`${episode.podcast.name} thumbnail`}
            className="w-20 h-20 rounded-lg object-cover"
          />
        </div>

        {/* Episode Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 leading-tight mb-1">{episode.title}</h3>
              <p className="text-sm text-gray-600 mb-1">{episode.podcast.name}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{formatDate(episode.releaseDate)}</span>
                <span>•</span>
                <span>{formatDuration(episode.duration)}</span>
              </div>
            </div>

            {/* AI Explanation Button */}
            <button
              onClick={() => onAIExplanation(episode)}
              className="flex-shrink-0 ml-2 p-2 text-gray-400 hover:text-teal hover:bg-teal/10 rounded-full transition-colors"
              aria-label="Get AI explanation"
              title="Get AI explanation"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          {episode.progress && episode.progress > 0 && (
            <div className="mb-3">
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className="bg-teal h-1 rounded-full transition-all duration-300"
                  style={{ width: progressWidth }}
                />
              </div>
            </div>
          )}

          {/* Play Button */}
          <button
            onClick={() => onPlay(episode)}
            className="w-full bg-teal text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-600 transition-colors flex items-center justify-center gap-2"
            aria-label={`Play ${episode.title}`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
            Play Episode
          </button>
        </div>
      </div>
    </div>
  )
}
