import { Link } from 'react-router'
import { useState, useEffect } from 'react'
import { samplePodcasts } from '../data/samplePodcasts'
import { IconChevronRight, IconPlus } from '@tabler/icons-react'
import { apiService, PodcastAPI } from '../services/apiService'
import { getCurrentUser } from 'aws-amplify/auth'

export function LibraryPage() {
  const [podcasts, setPodcasts] = useState<PodcastAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [rssUrl, setRssUrl] = useState('')
  const [addingPodcast, setAddingPodcast] = useState(false)

  useEffect(() => {
    checkAuthAndLoadPodcasts()
  }, [])

  const checkAuthAndLoadPodcasts = async () => {
    try {
      await getCurrentUser()
      setIsAuthenticated(true)
      await loadUserPodcasts()
    } catch (error) {
      console.log('User not authenticated, using sample data')
      setIsAuthenticated(false)
      // Use sample data when not authenticated
      const sortedSamplePodcasts = [...samplePodcasts].sort((a, b) => 
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      )
      setPodcasts(sortedSamplePodcasts.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl: p.thumbnail,
        category: p.category,
        author: p.author,
        rssUrl: '', // Not available in sample data
        addedAt: p.lastUpdated
      })))
    } finally {
      setLoading(false)
    }
  }

  const loadUserPodcasts = async () => {
    try {
      setError(null)
      const response = await apiService.getUserPodcasts({ limit: 50 })
      setPodcasts(response.podcasts.sort((a, b) => 
        new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      ))
    } catch (error) {
      console.error('Failed to load podcasts:', error)
      setError('Failed to load podcasts. Please try again.')
    }
  }

  const handleAddPodcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rssUrl.trim()) return

    setAddingPodcast(true)
    try {
      await apiService.addPodcast(rssUrl.trim())
      setRssUrl('')
      setShowAddForm(false)
      await loadUserPodcasts() // Reload podcasts
    } catch (error) {
      console.error('Failed to add podcast:', error)
      setError('Failed to add podcast. Please check the RSS URL and try again.')
    } finally {
      setAddingPodcast(false)
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading your podcasts...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Library</h1>
            <p className="text-gray-600">
              {isAuthenticated ? 'Your podcast subscriptions' : 'Sample podcasts (sign in to sync your library)'}
            </p>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-red text-white rounded-lg hover:bg-red/90 transition-colors"
            >
              <IconPlus className="w-4 h-4" />
              Add Podcast
            </button>
          )}
        </div>
      </div>

      {/* Add Podcast Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="text-lg font-semibold mb-3">Add New Podcast</h3>
          <form onSubmit={handleAddPodcast} className="space-y-3">
            <div>
              <label htmlFor="rssUrl" className="block text-sm font-medium text-gray-700 mb-1">
                RSS Feed URL
              </label>
              <input
                type="url"
                id="rssUrl"
                value={rssUrl}
                onChange={(e) => setRssUrl(e.target.value)}
                placeholder="https://example.com/podcast/rss"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red/50 focus:border-red"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addingPodcast}
                className="px-4 py-2 bg-red text-white rounded-md hover:bg-red/90 disabled:opacity-50 transition-colors"
              >
                {addingPodcast ? 'Adding...' : 'Add Podcast'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Podcasts List */}
      <div className="space-y-3">
        {podcasts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">
              {isAuthenticated ? "You haven't added any podcasts yet." : "Sign in to see your personal podcast library."}
            </p>
            {isAuthenticated && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-red text-white rounded-lg hover:bg-red/90 transition-colors"
              >
                Add Your First Podcast
              </button>
            )}
          </div>
        ) : (
          podcasts.map((podcast) => (
            <Link
              key={podcast.id}
              to={`/library/podcast/${podcast.id}`}
              className="block bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                {/* Podcast Thumbnail */}
                <div className="flex-shrink-0">
                  <img
                    src={podcast.imageUrl}
                    alt={`${podcast.name} thumbnail`}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                </div>

                {/* Podcast Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{podcast.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{podcast.description}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>Added {formatDate(podcast.addedAt)}</span>
                        {podcast.author && (
                          <>
                            <span>•</span>
                            <span>{podcast.author}</span>
                          </>
                        )}
                        {podcast.category && (
                          <>
                            <span>•</span>
                            <span>{podcast.category}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Arrow Icon */}
                    <div className="flex-shrink-0 ml-2">
                      <IconChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
