import { useEffect, useState } from 'react'
import { EpisodeCard } from '../components/EpisodeCard'
import { useMediaPlayer } from '../context/MediaPlayerContext'
import { useAuth } from '../context/AuthContext'
import { recommendationService, RecommendationScore, RecommendationFilters } from '../services/recommendationService'

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="bg-white rounded-lg divide-y divide-gray-100">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="p-4 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
)

// Error component
const ErrorMessage = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="bg-white rounded-lg p-6 text-center">
    <div className="text-red-600 mb-4">
      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load recommendations</h3>
    <p className="text-gray-600 mb-4">{message}</p>
    <button
      onClick={onRetry}
      className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
    >
      Try again
    </button>
  </div>
)

// Empty state component
const EmptyState = () => (
  <div className="bg-white rounded-lg p-8 text-center">
    <div className="text-gray-400 mb-4">
      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">No recommendations yet</h3>
    <p className="text-gray-600">
      Add some podcasts to your library and start listening to get personalized recommendations!
    </p>
  </div>
)

// Login prompt component
const LoginPrompt = () => (
  <div className="bg-white rounded-lg p-8 text-center">
    <div className="text-gray-400 mb-4">
      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in to get recommendations</h3>
    <p className="text-gray-600 mb-4">Sign in to your account to see personalized podcast episode recommendations.</p>
    <button
      onClick={() => (window.location.href = '/login')}
      className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
    >
      Sign In
    </button>
  </div>
)

type FilterType = 'not_recent' | 'comedy' | 'favorites' | 'guests' | 'new'

interface FilterOption {
  key: FilterType
  label: string
  param: keyof RecommendationFilters
}

const filterOptions: FilterOption[] = [
  { key: 'not_recent', label: 'Not Recent', param: 'not_recent' },
  { key: 'comedy', label: 'Comedy', param: 'favorites' }, // Using favorites as proxy for comedy for now
  { key: 'favorites', label: 'Favorites', param: 'favorites' },
  { key: 'guests', label: 'Guest Matches', param: 'guests' },
  { key: 'new', label: 'New Episodes', param: 'new' },
]

export default function Home() {
  const { playEpisode } = useMediaPlayer()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [recommendations, setRecommendations] = useState<RecommendationScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterType>('not_recent')
  const [userFeedback, setUserFeedback] = useState<Record<string, 'up' | 'down'>>({})

  const loadRecommendations = async (filter: FilterType = activeFilter) => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const filters: RecommendationFilters = {
        limit: 20,
        [filterOptions.find(f => f.key === filter)?.param || 'not_recent']: true,
      }

      console.log('Loading recommendations with filters:', filters)
      const data = await recommendationService.getRecommendations(filters)
      console.log('Received recommendations:', data)

      setRecommendations(data)
    } catch (err: any) {
      console.error('Failed to load recommendations:', err)
      setError(err.message || 'Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      loadRecommendations()
    }
  }, [isAuthenticated, authLoading])

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter)
    loadRecommendations(filter)
  }

  const handlePlay = (episode: RecommendationScore['episode']) => {
    // Track play event
    recommendationService
      .trackPlay(episode.episodeId, {
        source: 'home_recommendations',
        filter: activeFilter,
        score: recommendations.find(r => r.episodeId === episode.episodeId)?.score,
      })
      .catch(err => console.error('Failed to track play:', err))

    // Play episode
    playEpisode({
      episodeId: episode.episodeId,
      podcastId: episode.podcastId,
      title: episode.title,
      podcastName: episode.podcastName,
      releaseDate: episode.releaseDate,
      duration: episode.duration,
      audioUrl: episode.audioUrl,
      imageUrl: episode.imageUrl,
      description: episode.description,
      playbackPosition: episode.playbackPosition,
    })
  }

  const handleAIExplanation = (episode: RecommendationScore['episode']) => {
    // Find the recommendation data for this episode
    const recommendation = recommendations.find(r => r.episodeId === episode.episodeId)

    if (recommendation) {
      // Show explanation modal - for now, just log it
      console.log('AI Explanation for:', episode.title)
      console.log('Reasons:', recommendation.reasons)
      console.log('Factors:', recommendation.factors)
      console.log('Score:', recommendation.score)

      // TODO: Implement actual modal component
      alert(
        `Why this episode?\n\nScore: ${(recommendation.score * 100).toFixed(0)}%\n\nReasons:\n${recommendation.reasons.join('\n')}`,
      )
    }
  }

  const handleFeedback = async (episodeId: string, feedback: 'up' | 'down') => {
    try {
      setUserFeedback(prev => ({ ...prev, [episodeId]: feedback }))

      if (feedback === 'up') {
        await recommendationService.thumbsUp(episodeId, {
          source: 'home_recommendations',
          filter: activeFilter,
        })
      } else {
        await recommendationService.thumbsDown(episodeId, {
          source: 'home_recommendations',
          filter: activeFilter,
        })
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err)
      // Reset feedback state on error
      setUserFeedback(prev => {
        const newState = { ...prev }
        delete newState[episodeId]
        return newState
      })
    }
  }

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="bg-gray-50 min-h-screen pb-32">
        <div className="bg-white px-4 py-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Recommended Episodes</h1>
          <p className="text-gray-600">Rediscover older episodes from your favorite podcasts</p>
        </div>
        <div className="mt-4">
          <LoadingSkeleton />
        </div>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="bg-gray-50 min-h-screen pb-32">
        <div className="bg-white px-4 py-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Recommended Episodes</h1>
          <p className="text-gray-600">Rediscover older episodes from your favorite podcasts</p>
        </div>
        <div className="mt-4">
          <LoginPrompt />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-32">
      {/* Header Section */}
      <div className="bg-white px-4 py-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Recommended Episodes</h1>
        <p className="text-gray-600">Rediscover older episodes from your favorite podcasts</p>
      </div>

      {/* Filter Pills */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filterOptions.map(option => (
            <button
              key={option.key}
              onClick={() => handleFilterChange(option.key)}
              className={`inline-block px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === option.key ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mt-4">
        {loading && <LoadingSkeleton />}

        {error && <ErrorMessage message={error} onRetry={() => loadRecommendations()} />}

        {!loading && !error && recommendations.length === 0 && <EmptyState />}

        {!loading && !error && recommendations.length > 0 && (
          <div className="bg-white rounded-lg divide-y divide-gray-100">
            {recommendations.map(recommendation => (
              <div key={recommendation.episodeId} className="relative">
                <EpisodeCard
                  episode={{
                    episodeId: recommendation.episode.episodeId,
                    podcastId: recommendation.episode.podcastId,
                    title: recommendation.episode.title,
                    podcastName: recommendation.episode.podcastName,
                    releaseDate: recommendation.episode.releaseDate,
                    duration: recommendation.episode.duration,
                    audioUrl: recommendation.episode.audioUrl,
                    imageUrl: recommendation.episode.imageUrl,
                    description: recommendation.episode.description,
                    playbackPosition: recommendation.episode.playbackPosition,
                    podcastId: recommendation.episode.podcastId,
                  }}
                  podcastImageUrl={recommendation.episode.imageUrl}
                  onPlay={() => handlePlay(recommendation.episode)}
                  onAIExplanation={() => handleAIExplanation(recommendation.episode)}
                />

                {/* Feedback buttons */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => handleFeedback(recommendation.episodeId, 'up')}
                    className={`p-2 rounded-full transition-colors ${
                      userFeedback[recommendation.episodeId] === 'up'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                    title="I like this recommendation"
                  >
                    👍
                  </button>
                  <button
                    onClick={() => handleFeedback(recommendation.episodeId, 'down')}
                    className={`p-2 rounded-full transition-colors ${
                      userFeedback[recommendation.episodeId] === 'down'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                    title="I don't like this recommendation"
                  >
                    👎
                  </button>
                </div>

                {/* Recommendation score badge */}
                <div className="absolute bottom-4 right-4 bg-primary text-white px-2 py-1 rounded-full text-xs font-medium">
                  {(recommendation.score * 100).toFixed(0)}% match
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
