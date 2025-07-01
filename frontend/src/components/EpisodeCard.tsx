import { Episode } from '../types/episode'
import { IconInfoCircle, IconPlayerPlay } from '@tabler/icons-react'

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
              className="flex-shrink-0 ml-2 p-2 text-gray-400 hover:text-red hover:bg-red/10 rounded-full transition-colors"
              aria-label="Get AI explanation"
              title="Get AI explanation"
            >
              <IconInfoCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          {episode.progress && episode.progress > 0 && (
            <div className="mb-3">
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div className="bg-red h-1 rounded-full transition-all duration-300" style={{ width: progressWidth }} />
              </div>
            </div>
          )}

          {/* Play Button */}
          <button
            onClick={() => onPlay(episode)}
            className="w-full bg-red text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            aria-label={`Play ${episode.title}`}
          >
            <IconPlayerPlay className="w-5 h-5" />
            Play Episode
          </button>
        </div>
      </div>
    </div>
  )
}
