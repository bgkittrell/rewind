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

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-gray-600">Loading podcast...</span>
        </div>
      </div>
    )
  }

  if (error || !podcast) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
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
    <div className="container mx-auto px-4 py-6">
      {/* Back Button */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/library')}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Library
        </button>
      </div>

      {/* Podcast Details Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="p-6">
          <div className="flex items-start space-x-6">
            {/* Podcast Artwork */}
            <div className="w-32 h-32 bg-gray-300 rounded-lg flex-shrink-0 overflow-hidden">
              {podcast.imageUrl && !imageError ? (
                <img
                  src={podcast.imageUrl}
                  alt={`${podcast.title} artwork`}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Podcast Information */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{podcast.title}</h1>
              <p className="text-gray-600 mb-4 leading-relaxed">{stripAndTruncate(podcast.description, 300)}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{podcast.episodeCount} episodes</span>
                <span>•</span>
                <span>Added {new Date(podcast.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center space-x-4">
            <button
              onClick={() => syncEpisodes()}
              disabled={isSyncing}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {isSyncing ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
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
          </div>
        </div>
      </div>

      {/* Episodes Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
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
                <div key={episode.episodeId} className="p-4">
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
              <div className="p-4 text-center">
                {isLoadingEpisodes ? (
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2 text-gray-600">Loading more episodes...</span>
                  </div>
                ) : (
                  <button onClick={handleLoadMore} className="text-primary hover:text-secondary font-medium">
                    Load More Episodes
                  </button>
                )}
              </div>
            )}

            {/* End of Episodes */}
            {!hasMore && episodes.length > 0 && (
              <div className="p-4 text-center text-gray-500">
                <p>You've reached the end of the episodes</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
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
              className="text-primary hover:text-secondary font-medium"
            >
              {isSyncing ? 'Syncing...' : 'Sync Episodes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
