import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { episodeService, Episode } from '../services/episodeService'
import { podcastService, Podcast } from '../services/podcastService'
import { APIError } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useMediaPlayer } from '../context/MediaPlayerContext'

export default function EpisodeDetail() {
  const { episodeId } = useParams<{ episodeId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { playEpisode, state, pause, resume } = useMediaPlayer()

  const [episode, setEpisode] = useState<Episode | null>(null)
  const [podcast, setPodcast] = useState<Podcast | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [lastListened, setLastListened] = useState<string | null>(null)
  const [playbackProgress, setPlaybackProgress] = useState<number>(0)

  // Load episode and podcast details
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

      // First, get listening history to find which podcast this episode belongs to
      const historyResponse = await episodeService.getListeningHistory(100)
      const historyItem = historyResponse.history.find(item => item.episodeId === episodeId)

      if (!historyItem) {
        // If not in history, we need to find it another way
        // For now, we'll need to get all podcasts and search through their episodes
        const podcastsResponse = await podcastService.getPodcasts()
        
        for (const podcast of podcastsResponse.podcasts) {
          const episodesResponse = await episodeService.getEpisodes(podcast.podcastId, 100)
          const foundEpisode = episodesResponse.episodes.find(ep => ep.episodeId === episodeId)
          
          if (foundEpisode) {
            setEpisode(foundEpisode)
            setPodcast(podcast)
            break
          }
        }
      } else {
        // Found in history
        const podcastResponse = await podcastService.getPodcasts()
        const foundPodcast = podcastResponse.podcasts.find(p => p.podcastId === historyItem.podcastId)
        
        if (foundPodcast) {
          setPodcast(foundPodcast)
          
          // Get the episode details
          const episodesResponse = await episodeService.getEpisodes(foundPodcast.podcastId, 100)
          const foundEpisode = episodesResponse.episodes.find(ep => ep.episodeId === episodeId)
          
          if (foundEpisode) {
            setEpisode(foundEpisode)
            setLastListened(historyItem.lastPlayed)
            setPlaybackProgress(historyItem.playbackPosition || 0)
          }
        }
      }

      if (!episode) {
        setError('Episode not found')
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

    if (state.currentEpisode?.id === episode.episodeId && state.isPlaying) {
      pause()
    } else if (state.currentEpisode?.id === episode.episodeId && !state.isPlaying) {
      resume()
    } else {
      const episodeForPlayer = {
        id: episode.episodeId,
        title: episode.title,
        podcastName: podcast.title,
        releaseDate: episode.releaseDate,
        duration: episode.duration,
        audioUrl: episode.audioUrl,
        imageUrl: episode.imageUrl || podcast.imageUrl,
        description: episode.description,
        podcastImageUrl: podcast.imageUrl,
        playbackPosition: playbackProgress,
      }

      playEpisode(episodeForPlayer)
    }
  }

  const handleShare = () => {
    if (!episode) return

    if (navigator.share) {
      navigator.share({
        title: episode.title,
        text: episode.description,
        url: window.location.href,
      }).catch(console.error)
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const handleAIExplanation = () => {
    // TODO: Implement AI explanation modal
    console.log('AI explanation for:', episode?.title)
  }

  const formatLastListened = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
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
      if (isDropdownOpen && !(event.target as Element).closest('.dropdown-container')) {
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

  if (error || !episode || !podcast) {
    return (
      <div className="px-4 py-6">
        <div className="mb-4 py-4 px-4 bg-red-50 border-l-4 border-red-500">
          <p className="text-sm text-red-800">{error || 'Episode not found'}</p>
          <div className="mt-2 space-x-2">
            <button onClick={() => navigate(-1)} className="text-sm text-red-600 hover:text-red-800">
              Go Back
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

  const isCurrentlyPlaying = state.currentEpisode?.id === episode.episodeId && state.isPlaying

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Back Button */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* Episode Details Header */}
      <div className="bg-white px-4 py-6 border-b border-gray-200">
        <div className="flex items-start space-x-4">
          {/* Episode/Podcast Artwork */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-300 flex-shrink-0 rounded-lg overflow-hidden">
            {(episode.imageUrl || podcast.imageUrl) && !imageError ? (
              <img
                src={episode.imageUrl || podcast.imageUrl}
                alt={`${episode.title} artwork`}
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

          {/* Episode Information */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{episode.title}</h1>
                <p className="text-gray-600 text-sm mb-1">
                  From: <button
                    onClick={() => navigate(`/library/${podcast.podcastId}`)}
                    className="text-primary hover:text-secondary underline"
                  >
                    {podcast.title}
                  </button>
                </p>
                <div className="flex items-center space-x-3 text-sm text-gray-500">
                  <span>{episodeService.formatReleaseDate(episode.releaseDate)}</span>
                  <span>•</span>
                  <span>{episode.duration}</span>
                  {lastListened && (
                    <>
                      <span>•</span>
                      <span>Last listened: {formatLastListened(lastListened)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Dropdown Menu */}
              <div className="relative dropdown-container">
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
                          navigate(`/library/${podcast.podcastId}`)
                          setIsDropdownOpen(false)
                        }}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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

        {/* Action Buttons */}
        <div className="mt-4 flex items-center space-x-3">
          <button
            onClick={handlePlayEpisode}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              isCurrentlyPlaying
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-primary text-white hover:bg-secondary'
            }`}
          >
            {isCurrentlyPlaying ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play
              </>
            )}
          </button>

          <button
            onClick={() => console.log('Save episode')}
            className="p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            title="Save episode"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>

          <button
            onClick={handleShare}
            className="p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            title="Share episode"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.632 4.658a3 3 0 11-2.632-2.632m0 0a3 3 0 00-2.684 0m2.684 0l-6.632 3.316m0-10.632l6.632 3.316m0 0a3 3 0 102.632-2.632m0 0a3 3 0 00-2.632-2.632" />
            </svg>
          </button>

          <button
            onClick={handleAIExplanation}
            className="p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            title="Get AI explanation"
          >
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
            </svg>
          </button>
        </div>

        {/* Progress Indicator */}
        {playbackProgress > 0 && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${playbackProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{Math.round(playbackProgress)}% complete</p>
          </div>
        )}
      </div>

      {/* Episode Details Content */}
      <div className="bg-white mx-4 my-6 p-6 rounded-lg shadow-sm">
        {/* Guests */}
        {episode.guests && episode.guests.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Guests</h2>
            <div className="flex flex-wrap gap-2">
              {episode.guests.map((guest, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                >
                  {guest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{episode.description}</p>
        </div>

        {/* Tags */}
        {episode.tags && episode.tags.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {episode.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}