import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import AddPodcastModal from '../components/AddPodcastModal'
import { podcastService, Podcast } from '../services/podcastService'
import { APIError } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { stripAndTruncate } from '../utils/textUtils'

export default function Library() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const navigate = useNavigate()
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  // Load podcasts only after authentication is complete
  useEffect(() => {
    console.log('Library: Auth state changed', { authLoading, isAuthenticated, user })
    if (!authLoading && isAuthenticated) {
      console.log('Library: Loading podcasts for authenticated user')
      loadPodcasts()
    } else if (!authLoading && !isAuthenticated) {
      console.log('Library: User not authenticated, showing error')
      setIsLoading(false)
      setError('Please sign in to view your library')
    }
  }, [authLoading, isAuthenticated])

  const loadPodcasts = async () => {
    try {
      console.log('Library: Starting to load podcasts')
      setIsLoading(true)
      setError(null)
      const response = await podcastService.getPodcasts()
      console.log('Library: Podcasts loaded successfully', response)
      setPodcasts(response.podcasts)
    } catch (err) {
      console.log('Library: Failed to load podcasts', err)
      if (err instanceof APIError) {
        setError(err.message)
      } else {
        setError('Failed to load podcasts')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddPodcast = async (result: { podcastId: string; title: string; message: string }) => {
    // Refresh the podcast list after adding
    await loadPodcasts()

    // Show success message (could be a toast notification)
    console.log('Podcast added:', result.message)
  }

  const handleImageError = (podcastId: string) => {
    setImageErrors((prev: Set<string>) => new Set([...prev, podcastId]))
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Header Section */}
      <div className="bg-white px-4 py-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Library</h1>
        <p className="text-gray-600">Manage your podcast subscriptions</p>
      </div>

      {/* Add Podcast Button */}
      {!authLoading && isAuthenticated && (
        <div className="bg-white px-4 py-4 border-b border-gray-200">
          <button onClick={() => setIsAddModalOpen(true)} className="btn-primary w-full rounded-lg">
            Add Podcast
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="text-sm text-red-600 hover:text-red-800 mt-1">
            Dismiss
          </button>
        </div>
      )}

      {/* Loading State */}
      {(authLoading || isLoading) && (
        <div className="flex justify-center items-center py-8 px-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-gray-600">
            {authLoading ? 'Checking authentication...' : 'Loading podcasts...'}
          </span>
        </div>
      )}

      {/* Empty State */}
      {!authLoading && !isLoading && isAuthenticated && podcasts.length === 0 && !error && (
        <div className="bg-white mx-4 mt-4 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No podcasts yet</h3>
          <p className="text-gray-600 mb-4">Add your first podcast to get started</p>
          <button onClick={() => setIsAddModalOpen(true)} className="btn-primary rounded-lg">
            Add Your First Podcast
          </button>
        </div>
      )}

      {/* Podcast List */}
      {!authLoading && !isLoading && isAuthenticated && podcasts.length > 0 && (
        <div className="bg-white mx-4 mt-4 rounded-lg divide-y divide-gray-100">
          {podcasts.map(podcast => (
            <div key={podcast.podcastId}>
              {/* Enhanced Podcast Card */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center space-x-4 flex-1 cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded-lg transition-colors"
                    onClick={() => navigate(`/library/${podcast.podcastId}`)}
                  >
                    {/* Podcast Image */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-300 rounded-lg flex-shrink-0 overflow-hidden">
                      {podcast.imageUrl && !imageErrors.has(podcast.podcastId) ? (
                        <img
                          src={podcast.imageUrl}
                          alt={`${podcast.title} artwork`}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(podcast.podcastId)}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-300 flex items-center justify-center rounded-lg">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Podcast Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2 break-words pr-2">
                        {podcast.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2 break-words">
                        {stripAndTruncate(podcast.description, 150)}
                      </p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span>{podcast.episodeCount} episodes</span>
                        <span>Added {new Date(podcast.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Podcast Modal */}
      <AddPodcastModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={handleAddPodcast} />
    </div>
  )
}
