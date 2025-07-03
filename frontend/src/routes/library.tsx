import { useState, useEffect } from 'react'
import AddPodcastModal from '../components/AddPodcastModal'
import PodcastCard from '../components/PodcastCard'
import { podcastService, Podcast } from '../services/podcastService'
import { APIError } from '../services/api'

export default function Library() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deletingPodcastId, setDeletingPodcastId] = useState<string | null>(null)

  // Load podcasts on component mount
  useEffect(() => {
    loadPodcasts()
  }, [])

  const loadPodcasts = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await podcastService.getPodcasts()
      setPodcasts(response.podcasts)
    } catch (err) {
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

  const handlePlayPodcast = (podcastId: string) => {
    // TODO: Implement play functionality
    console.log('Play podcast:', podcastId)
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Library</h1>
        <p className="text-gray-600">Manage your podcast subscriptions</p>
      </div>

      {/* Add Podcast Button */}
      <div className="mb-6">
        <button onClick={() => setIsAddModalOpen(true)} className="btn-primary w-full">
          Add Podcast
        </button>
      </div>

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
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-gray-600">Loading podcasts...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && podcasts.length === 0 && !error && (
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
      {!isLoading && podcasts.length > 0 && (
        <div className="space-y-4">
          {podcasts.map(podcast => (
            <PodcastCard
              key={podcast.podcastId}
              podcast={podcast}
              onDelete={handleDeletePodcast}
              onPlay={handlePlayPodcast}
              isDeleting={deletingPodcastId === podcast.podcastId}
            />
          ))}
        </div>
      )}

      {/* Add Podcast Modal */}
      <AddPodcastModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={handleAddPodcast} />
    </div>
  )
}
