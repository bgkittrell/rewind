import { useState, useEffect, useCallback } from 'react'
import { recommendationService, RecommendationScore, RecommendationFilters } from '../services/recommendationService'
import { FilterType, filterOptions } from '../components/Home/FilterPills'

interface UseRecommendationsProps {
  isAuthenticated: boolean
  isLoading: boolean
}

export function useRecommendations({ isAuthenticated, isLoading }: UseRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendationScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterType>('not_recent')
  const [userFeedback, setUserFeedback] = useState<Record<string, 'up' | 'down'>>({})

  const loadRecommendations = useCallback(
    async (filter: FilterType = activeFilter) => {
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
      } catch (err) {
        console.error('Failed to load recommendations:', err)
        setError(err instanceof Error ? err.message : 'Failed to load recommendations')
      } finally {
        setLoading(false)
      }
    },
    [isAuthenticated, activeFilter],
  )

  useEffect(() => {
    if (!isLoading) {
      loadRecommendations()
    }
  }, [isAuthenticated, isLoading, loadRecommendations])

  const handleFilterChange = useCallback(
    (filter: FilterType) => {
      setActiveFilter(filter)
      loadRecommendations(filter)
    },
    [loadRecommendations],
  )

  const handleFeedback = useCallback(
    async (episodeId: string, feedback: 'up' | 'down') => {
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
    },
    [activeFilter],
  )

  return {
    recommendations,
    loading,
    error,
    activeFilter,
    userFeedback,
    loadRecommendations,
    handleFilterChange,
    handleFeedback,
  }
}
