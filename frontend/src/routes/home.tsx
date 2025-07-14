import { useCallback } from 'react'
import { useMediaPlayer } from '../context/MediaPlayerContext'
import { useAuth } from '../context/AuthContext'
import { recommendationService } from '../services/recommendationService'
import { useRecommendations } from '../hooks/useRecommendations'
import { PageHeader } from '../components/Home/PageHeader'
import { FilterPills } from '../components/Home/FilterPills'
import { LoadingSkeleton } from '../components/Home/LoadingSkeleton'
import { ErrorMessage } from '../components/Home/ErrorMessage'
import { EmptyState } from '../components/Home/EmptyState'
import { LoginPrompt } from '../components/Home/LoginPrompt'
import { RecommendationCard } from '../components/Home/RecommendationCard'
import type { RecommendationScore } from '../services/recommendationService'

export default function Home() {
  const { playEpisode } = useMediaPlayer()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const {
    recommendations,
    loading,
    error,
    activeFilter,
    userFeedback,
    loadRecommendations,
    handleFilterChange,
    handleFeedback,
  } = useRecommendations({ isAuthenticated, isLoading: authLoading })

  const handlePlay = useCallback(
    (episode: RecommendationScore['episode']) => {
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
    },
    [playEpisode, activeFilter, recommendations],
  )

  const handleAIExplanation = useCallback(
    (episode: RecommendationScore['episode']) => {
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
    },
    [recommendations],
  )

  const handleSignInClick = useCallback(() => {
    window.location.href = '/login'
  }, [])

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="bg-gray-50 min-h-screen pb-32">
        <PageHeader />
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
        <PageHeader />
        <div className="mt-4">
          <LoginPrompt onSignInClick={handleSignInClick} />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-32">
      <PageHeader />
      <FilterPills activeFilter={activeFilter} onFilterChange={handleFilterChange} />

      {/* Content */}
      <div className="mt-4">
        {loading && <LoadingSkeleton />}

        {error && <ErrorMessage message={error} onRetry={() => loadRecommendations()} />}

        {!loading && !error && recommendations.length === 0 && <EmptyState />}

        {!loading && !error && recommendations.length > 0 && (
          <div className="bg-white rounded-lg divide-y divide-gray-100">
            {recommendations.map(recommendation => (
              <RecommendationCard
                key={recommendation.episodeId}
                recommendation={recommendation}
                onPlay={handlePlay}
                onAIExplanation={handleAIExplanation}
                onFeedback={handleFeedback}
                userFeedback={userFeedback[recommendation.episodeId]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
