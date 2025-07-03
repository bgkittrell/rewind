import { useState } from 'react'
import { Podcast } from '../services/podcastService'

interface PodcastCardProps {
  podcast: Podcast
  onDelete: (_podcastId: string) => void
  onPlay?: (_podcastId: string) => void
  isDeleting?: boolean
}

export default function PodcastCard({ podcast, onDelete, onPlay, isDeleting = false }: PodcastCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = () => {
    onDelete(podcast.podcastId)
    setShowDeleteConfirm(false)
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  const handlePlayClick = () => {
    if (onPlay) {
      onPlay(podcast.podcastId)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
      data-testid="podcast-card"
    >
      <div className="flex gap-4">
        {/* Podcast Image */}
        <div className="w-16 h-16 bg-gray-300 rounded-lg flex-shrink-0 overflow-hidden">
          {podcast.imageUrl ? (
            <img src={podcast.imageUrl} alt={`${podcast.title} artwork`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-300 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
          )}
        </div>

        {/* Podcast Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate" title={podcast.title}>
            {podcast.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {podcast.episodeCount} episodes
            {podcast.unreadCount && podcast.unreadCount > 0 && (
              <span className="ml-2 text-primary">• {podcast.unreadCount} unread</span>
            )}
          </p>
          <p className="text-xs text-gray-500 mt-1">Last updated {formatDate(podcast.lastUpdated)}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {onPlay && (
            <button
              onClick={handlePlayClick}
              className={`p-2 text-gray-600 hover:text-primary hover:bg-gray-50 
                 rounded-md transition-colors`}
              aria-label="Play latest episode"
              title="Play latest episode"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}

          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className={`p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md 
               transition-colors disabled:opacity-50`}
            aria-label="Delete podcast"
            title="Delete podcast"
          >
            {isDeleting ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Podcast</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete "{podcast.title}"? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
