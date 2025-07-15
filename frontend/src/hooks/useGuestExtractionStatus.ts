import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../services/api'
import type { Episode } from '../types/episode'

interface UseGuestExtractionStatusOptions {
  episodeId: string
  podcastId: string
  enabled?: boolean
  pollInterval?: number
}

interface UseGuestExtractionStatusResult {
  episode: Episode | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to poll for guest extraction status updates
 */
export const useGuestExtractionStatus = ({
  episodeId,
  podcastId,
  enabled = true,
  pollInterval = 5000, // 5 seconds
}: UseGuestExtractionStatusOptions): UseGuestExtractionStatusResult => {
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEpisode = useCallback(async () => {
    if (!enabled || !episodeId || !podcastId) return

    setLoading(true)
    setError(null)

    try {
      const episode = await apiClient.get<Episode>(`/episodes/${podcastId}/${episodeId}`)
      if (episode) {
        setEpisode(episode)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch episode')
    } finally {
      setLoading(false)
    }
  }, [episodeId, podcastId, enabled])

  const refetch = useCallback(() => {
    fetchEpisode()
  }, [fetchEpisode])

  useEffect(() => {
    if (!enabled) return

    // Initial fetch
    fetchEpisode()

    // Set up polling only if the episode is pending or processing
    const shouldPoll = episode?.guestExtractionStatus === 'pending' || episode?.guestExtractionStatus === 'processing'

    if (shouldPoll) {
      const interval = setInterval(fetchEpisode, pollInterval)
      return () => clearInterval(interval)
    }
  }, [fetchEpisode, enabled, pollInterval, episode?.guestExtractionStatus])

  return {
    episode,
    loading,
    error,
    refetch,
  }
}

export default useGuestExtractionStatus
