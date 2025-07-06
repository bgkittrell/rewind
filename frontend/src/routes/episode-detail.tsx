import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { episodeService, Episode } from '../services/episodeService'
import { podcastService, Podcast } from '../services/podcastService'
import { APIError } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useMediaPlayer } from '../context/MediaPlayerContext'
import type { Episode as MediaPlayerEpisode } from '../types/episode'

export default function EpisodeDetail() {
  const { episodeId } = useParams<{ episodeId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { playEpisode } = useMediaPlayer()

  const [episode, setEpisode] = useState<Episode | null>(null)
  const [podcast, setPodcast] = useState<Podcast | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [lastListenedDate, setLastListenedDate] = useState<string | null>(null)
  const [playbackProgress, setPlaybackProgress] = useState<number>(0)

  // Load episode details
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/library')
      return
    }

    if (!authLoading && isAuthenticated && episodeId) {
      loadEpisodeDetails()
    }
  }, [authLoading, isAuthenticated, episodeId, navigate])

  const loadEpisodeDetails = async () => {
    if (!episodeId) return

    try {
      setIsLoading(true)
      setError(null)

      // Get the episode
      const episodeData = await episodeService.getEpisodeById(episodeId)
      setEpisode(episodeData)

      // Get the podcast details
      const podcastsResponse = await podcastService.getPodcasts()
      const podcastData = podcastsResponse.podcasts.find(p => p.podcastId === episodeData.podcastId)
      setPodcast(podcastData || null)

      // Get playback progress
      try {
        const progress = await episodeService.getProgress(episodeId)
        setPlaybackProgress(progress.progressPercentage)
      } catch (progressError) {
        console.warn('Could not load playback progress:', progressError)
      }

      // Get listening history to find last listened date
      try {
        const history = await episodeService.getListeningHistory(100)
        const episodeHistory = history.history.find(h => h.episodeId === episodeId)
        if (episodeHistory) {
          setLastListenedDate(episodeHistory.lastPlayed)
        }
      } catch (historyError) {
        console.warn('Could not load listening history:', historyError)
      }
    } catch (err) {
      console.error('Failed to load episode details:', err)
      if (err instanceof APIError) {
        setError(err.message)
      } else {
        setError('Failed to load episode details')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlayEpisode = () => {
    if (!episode || !podcast) return

    const episodeForPlayer: MediaPlayerEpisode = {
      episodeId: episode.episodeId,
      podcastId: episode.podcastId,
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

  const handleAIExplanation = () => {
    // TODO: Implement AI explanation modal
    console.log('AI explanation for:', episode?.title)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatLastListened = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      })
    }
  }

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

  if (authLoading || isLoading) {
    return (
      <div className="px-4 py-6">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-gray-600">Loading episode...</span>
        </div>
      </div>
    )
  }

  if (error || !episode) {
    return (
      <div className="px-4 py-6">
        <div className="mb-4 py-4 px-4 bg-red-50 border-l-4 border-red-500">
          <p className="text-sm text-red-800">{error || 'Episode not found'}</p>
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

      {/* Episode Details Header */}
      <div className="bg-white px-4 py-6 border-b border-gray-200">
        <div className="flex items-start space-x-4">
          {/* Episode Artwork */}
          <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gray-300 flex-shrink-0 rounded-lg overflow-hidden">
            {(episode.imageUrl || podcast?.imageUrl) && !imageError ? (
              <img
                src={episode.imageUrl || podcast?.imageUrl}
                alt={`${episode.title} artwork`}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gray-300 flex items-center justify-center rounded-lg">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
              </div>
            )}
          </div>

          {/* Episode Information */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 leading-tight">{episode.title}</h1>
                <p className="text-lg text-gray-700 mb-3 font-medium">{podcast?.title || 'Unknown Podcast'}</p>
                <div className="flex items-center space-x-3 text-sm text-gray-500 mb-4">
                  <span>{formatDate(episode.releaseDate)}</span>
                  <span>•</span>
                  <span>{episode.duration}</span>
                  {episode.guests && episode.guests.length > 0 && (
                    <>
                      <span>•</span>
                      <span>
                        {episode.guests.length} guest{episode.guests.length > 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
                {lastListenedDate && (
                  <p className="text-sm text-gray-500 mb-3">Last listened: {formatLastListened(lastListenedDate)}</p>
                )}
                {playbackProgress > 0 && (
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${playbackProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{playbackProgress}% complete</p>
                  </div>
                )}
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
                          if (podcast) {
                            navigate(`/library/${podcast.podcastId}`)
                          }
                          setIsDropdownOpen(false)
                        }}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          />
                        </svg>
                        <span>View Podcast</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handlePlayEpisode}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-secondary transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play Episode
          </button>

          <button
            onClick={handleAIExplanation}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
            </svg>
            AI Summary
          </button>
        </div>
      </div>

      {/* Episode Description */}
      <div className="bg-white px-4 py-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
        <div className="prose max-w-none">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{episode.description}</p>
        </div>
      </div>

      {/* Guests Section */}
      {episode.guests && episode.guests.length > 0 && (
        <div className="bg-white px-4 py-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Guests</h2>
          <div className="flex flex-wrap gap-2">
            {episode.guests.map((guest, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
              >
                {guest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tags Section */}
      {episode.tags && episode.tags.length > 0 && (
        <div className="bg-white px-4 py-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {episode.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
