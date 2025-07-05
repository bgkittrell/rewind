import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import { podcastService, Podcast } from '../services/podcastService'
import { episodeService, Episode } from '../services/episodeService'
import { APIError } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useMediaPlayer } from '../context/MediaPlayerContext'
import EpisodeCard from '../components/EpisodeCard'
import { stripAndTruncate } from '../utils/textUtils'

// Import the Episode type from MediaPlayerContext to avoid confusion
type MediaPlayerEpisode = {
  id: string
  title: string
  podcastName: string
  releaseDate: string
  duration: string
  audioUrl?: string
  imageUrl?: string
  description?: string
  playbackPosition?: number
  podcastImageUrl?: string
}

export default function PodcastDetail() {
  const { podcastId } = useParams<{ podcastId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { playEpisode } = useMediaPlayer()

  const [podcast, setPodcast] = useState<Podcast | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | undefined>()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isFixingImages, setIsFixingImages] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const EPISODES_PER_PAGE = 20

  // Load podcast details
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/library')
      return
    }

    if (!authLoading && isAuthenticated && podcastId) {
      loadPodcastDetails()
    }
  }, [authLoading, isAuthenticated, podcastId, navigate])

  // Load initial episodes
  useEffect(() => {
    if (podcast && episodes.length === 0) {
      loadEpisodes(undefined, true)
    }
  }, [podcast])

  const loadPodcastDetails = async () => {
    if (!podcastId) return

    try {
      setIsLoading(true)
      setError(null)

      // Get all podcasts and find the one we need
      const response = await podcastService.getPodcasts()
      const foundPodcast = response.podcasts.find(p => p.podcastId === podcastId)

      if (!foundPodcast) {
        setError('Podcast not found')
        return
      }

      setPodcast(foundPodcast)
    } catch (err) {
      console.error('Failed to load podcast details:', err)
      if (err instanceof APIError) {
        setError(err.message)
      } else {
        setError('Failed to load podcast details')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const loadEpisodes = async (nextCursor?: string, isInitialLoad = false) => {
    if (!podcastId || (!isInitialLoad && isLoadingEpisodes)) return

    try {
      setIsLoadingEpisodes(true)
      const response = await episodeService.getEpisodes(podcastId, EPISODES_PER_PAGE, nextCursor)

      if (!nextCursor) {
        setEpisodes(response.episodes)
      } else {
        setEpisodes((prev: Episode[]) => [...prev, ...response.episodes])
      }

      setHasMore(response.pagination.hasMore)
      setCursor(response.pagination.nextCursor)
    } catch (err) {
      console.error('Failed to load episodes:', err)
      if (!nextCursor) {
        // If no episodes found on first load, try to sync them
        await syncEpisodes()
      }
    } finally {
      setIsLoadingEpisodes(false)
    }
  }

  const syncEpisodes = async () => {
    if (!podcastId) return

    try {
      setIsSyncing(true)
      setSuccessMessage(null)
      const response = await episodeService.syncEpisodes(podcastId)

      if (response.episodeCount > 0) {
        // Reload episodes after successful sync
        await loadEpisodes(undefined, true)
      }
    } catch (err) {
      console.error('Failed to sync episodes:', err)
      if (err instanceof APIError) {
        setError(`Failed to sync episodes: ${err.message}`)
      } else {
        setError('Failed to sync episodes')
      }
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDeletePodcast = async () => {
    if (!podcastId) return

    try {
      setIsDeleting(true)
      await podcastService.deletePodcast(podcastId)

      // Navigate back to library after successful deletion
      navigate('/library')
    } catch (err) {
      console.error('Failed to delete podcast:', err)
      if (err instanceof APIError) {
        setError(`Failed to delete podcast: ${err.message}`)
      } else {
        setError('Failed to delete podcast')
      }
    } finally {
      setIsDeleting(false)
      setIsDropdownOpen(false)
    }
  }

  const handleFixEpisodeImages = async () => {
    if (!podcastId) return

    try {
      setIsFixingImages(true)
      setError(null)
      setSuccessMessage(null)

      await episodeService.fixEpisodeImages(podcastId)

      // Show success message and reload episodes to see the fixed images
      setSuccessMessage('Episode images fixed successfully!')
      await loadEpisodes(undefined, true)
    } catch (err) {
      console.error('Failed to fix episode images:', err)
      if (err instanceof APIError) {
        setError(`Failed to fix episode images: ${err.message}`)
      } else {
        setError('Failed to fix episode images')
      }
    } finally {
      setIsFixingImages(false)
      setIsDropdownOpen(false)
    }
  }

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingEpisodes && cursor) {
      loadEpisodes(cursor)
    }
  }, [hasMore, isLoadingEpisodes, cursor])

  const handlePlayEpisode = (episode: Episode) => {
    if (!podcast) return

    const episodeForPlayer: MediaPlayerEpisode = {
      id: episode.episodeId,
      title: episode.title,
      podcastName: podcast.title,
      releaseDate: episode.releaseDate,
      duration: episode.duration,
      audioUrl: episode.audioUrl,
      imageUrl: episode.imageUrl,
      description: episode.description,
      podcastImageUrl: podcast.imageUrl,
    }

    playEpisode(episodeForPlayer)
  }

  const handleAIExplanation = (episode: Episode) => {
    // TODO: Implement AI explanation modal
    console.log('AI explanation for:', episode.title)
  }

  const transformEpisodeForCard = (episode: Episode): MediaPlayerEpisode => {
    return {
      id: episode.episodeId,
      title: episode.title,
      podcastName: podcast?.title || 'Unknown Podcast',
      releaseDate: episode.releaseDate,
      duration: episode.duration,
      audioUrl: episode.audioUrl,
      imageUrl: episode.imageUrl,
      description: episode.description,
      podcastImageUrl: podcast?.imageUrl,
    }
  }

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight) {
        return
      }
      handleLoadMore()
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleLoadMore])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen && !(event.target as Element).closest('.relative')) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDropdownOpen])

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  if (authLoading || isLoading) {
    return (
      <div className="px-4 py-6">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-gray-600">Loading podcast...</span>
        </div>
      </div>
    )
  }

  if (error || !podcast) {
    return (
      <div className="px-4 py-6">
        <div className="mb-4 py-4 px-4 bg-red-50 border-l-4 border-red-500">
          <p className="text-sm text-red-800">{error || 'Podcast not found'}</p>
          <div className="mt-2 space-x-2">
            <button onClick={() => navigate('/library')} className="text-sm text-red-600 hover:text-red-800">
              Back to Library
            </button>
            {error && (
              <button onClick={() => window.location.reload()} className="text-sm text-red-600 hover:text-red-800">
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 m-4 rounded">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-green-800">{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} className="ml-auto text-green-600 hover:text-green-800">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 rounded">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <button
          onClick={() => navigate('/library')}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Library
        </button>
      </div>

      {/* Podcast Details Header */}
      <div className="bg-white px-4 py-6 border-b border-gray-200">
        <div className="flex items-start space-x-4">
          {/* Podcast Artwork */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-300 flex-shrink-0 overflow-hidden">
            {podcast.imageUrl && !imageError ? (
              <img
                src={podcast.imageUrl}
                alt={`${podcast.title} artwork`}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                <svg className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
              </div>
            )}
          </div>

          {/* Podcast Information */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{podcast.title}</h1>
                <p className="text-gray-600 mb-3 leading-relaxed text-sm">
                  {stripAndTruncate(podcast.description, 250)}
                </p>
                <div className="flex items-center space-x-3 text-sm text-gray-500">
                  <span>{podcast.episodeCount} episodes</span>
                  <span>•</span>
                  <span>Added {new Date(podcast.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Dropdown Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                  title="More options"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>

                {/* Dropdown Content */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          syncEpisodes()
                          setIsDropdownOpen(false)
                        }}
                        disabled={isSyncing}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <span>{isSyncing ? 'Syncing...' : 'Sync Episodes'}</span>
                      </button>

                      <button
                        onClick={handleFixEpisodeImages}
                        disabled={isFixingImages}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isFixingImages ? (
                          <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                        <span>{isFixingImages ? 'Fixing Images...' : 'Fix Episode Images'}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to delete "${podcast.title}"? This action cannot be undone.`,
                            )
                          ) {
                            handleDeletePodcast()
                          } else {
                            setIsDropdownOpen(false)
                          }
                        }}
                        disabled={isDeleting}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? (
                          <div className="animate-spin w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full" />
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
                        <span>{isDeleting ? 'Deleting...' : 'Delete Podcast'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Episodes Section */}
      <div className="bg-white">
        <div className="px-4 py-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Episodes
            {podcast && <span className="text-gray-500 ml-2">({podcast.episodeCount})</span>}
          </h2>
        </div>

        {/* Episodes List */}
        {episodes.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {episodes.map(episode => {
              const episodeCardData = transformEpisodeForCard(episode)
              return (
                <div key={episode.episodeId}>
                  <EpisodeCard
                    episode={episodeCardData}
                    podcastImageUrl={podcast.imageUrl}
                    onPlay={() => handlePlayEpisode(episode)}
                    onAIExplanation={() => handleAIExplanation(episode)}
                  />
                </div>
              )
            })}

            {/* Load More / Loading State */}
            {hasMore && (
              <div className="py-6 text-center bg-gray-50">
                {isLoadingEpisodes ? (
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2 text-gray-600">Loading more episodes...</span>
                  </div>
                ) : (
                  <button onClick={handleLoadMore} className="text-primary hover:text-secondary font-medium px-4 py-2">
                    Load More Episodes
                  </button>
                )}
              </div>
            )}

            {/* End of Episodes */}
            {!hasMore && episodes.length > 0 && (
              <div className="py-6 text-center text-gray-500 bg-gray-50">
                <p>You've reached the end of the episodes</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No episodes found</h3>
            <p className="text-gray-600 mb-4">Try syncing episodes to fetch the latest content</p>
            <button
              onClick={() => syncEpisodes()}
              disabled={isSyncing}
              className="text-primary hover:text-secondary font-medium px-4 py-2"
            >
              {isSyncing ? 'Syncing...' : 'Sync Episodes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
