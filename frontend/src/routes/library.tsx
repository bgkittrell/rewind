import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import AddPodcastModal from '../components/AddPodcastModal'
import { podcastService, Podcast } from '../services/podcastService'
import { episodeService } from '../services/episodeService'
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
  const [deletingPodcastId, setDeletingPodcastId] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const [syncingEpisodes, setSyncingEpisodes] = useState<Set<string>>(new Set())

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

  const handleDeletePodcast = async (podcastId: string) => {
    try {
      setDeletingPodcastId(podcastId)
      await podcastService.deletePodcast(podcastId)

      // Remove from local state
      setPodcasts(prev => prev.filter(p => p.podcastId !== podcastId))

      console.log('Podcast deleted successfully')
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message)
      } else {
        setError('Failed to delete podcast')
      }
    } finally {
      setDeletingPodcastId(null)
    }
  }

  const syncEpisodes = async (podcastId: string) => {
    try {
      setSyncingEpisodes((prev: Set<string>) => new Set([...prev, podcastId]))
      const response = await episodeService.syncEpisodes(podcastId)

      if (response.episodeCount > 0) {
        // Episodes synced successfully - user will see them when navigating to podcast detail
        console.log(`Successfully synced ${response.episodeCount} episodes`)
      }
    } catch (err) {
      console.error('Failed to sync episodes:', err)
      if (err instanceof APIError) {
        setError(`Failed to sync episodes: ${err.message}`)
      } else {
        setError('Failed to sync episodes')
      }
    } finally {
      setSyncingEpisodes((prev: Set<string>) => {
        const newSet = new Set(prev)
        newSet.delete(podcastId)
        return newSet
      })
    }
  }

  const handleImageError = (podcastId: string) => {
    setImageErrors((prev: Set<string>) => new Set([...prev, podcastId]))
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Library</h1>
        <p className="text-gray-600">Manage your podcast subscriptions</p>
      </div>

      {/* Add Podcast Button */}
      {!authLoading && isAuthenticated && (
        <div className="mb-6">
          <button onClick={() => setIsAddModalOpen(true)} className="btn-primary w-full">
            Add Podcast
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="text-sm text-red-600 hover:text-red-800 mt-1">
            Dismiss
          </button>
        </div>
      )}

      {/* Loading State */}
      {(authLoading || isLoading) && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-gray-600">
            {authLoading ? 'Checking authentication...' : 'Loading podcasts...'}
          </span>
        </div>
      )}

      {/* Empty State */}
      {!authLoading && !isLoading && isAuthenticated && podcasts.length === 0 && !error && (
        <div className="text-center py-8">
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
          <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
            Add Your First Podcast
          </button>
        </div>
      )}

      {/* Podcast List */}
      {!authLoading && !isLoading && isAuthenticated && podcasts.length > 0 && (
        <div className="space-y-4">
          {podcasts.map(podcast => {
            const isSyncing = syncingEpisodes.has(podcast.podcastId)

            return (
              <div key={podcast.podcastId} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                {/* Enhanced Podcast Card */}
                <div className="p-4">
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
                          <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                            <svg
                              className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
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

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {/* Sync Episodes Button */}
                      <button
                        onClick={() => syncEpisodes(podcast.podcastId)}
                        disabled={isSyncing}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                        title="Sync episodes"
                      >
                        {isSyncing ? (
                          <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        )}
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeletePodcast(podcast.podcastId)}
                        disabled={deletingPodcastId === podcast.podcastId}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors"
                        title="Delete podcast"
                      >
                        {deletingPodcastId === podcast.podcastId ? (
                          <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-red-600 rounded-full" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Podcast Modal */}
      <AddPodcastModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={handleAddPodcast} />
    </div>
  )
}
