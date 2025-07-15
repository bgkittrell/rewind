import { useCallback, useRef } from 'react'
import { audioUrlRefreshService } from '../services/audioUrlRefreshService'
import type { Episode } from '../types/episode'

export interface UseAudioUrlRefreshProps {
  episode: Episode | null
  onUrlRefreshed?: (newUrl: string) => void
}

export const useAudioUrlRefresh = ({ episode, onUrlRefreshed }: UseAudioUrlRefreshProps) => {
  const isRefreshing = useRef(false)

  const handleAudioError = useCallback(
    async (error: any) => {
      if (!episode || isRefreshing.current) {
        return false
      }

      console.log('Audio error in useAudioUrlRefresh:', error)

      // Check if this is a token-based URL that might need refreshing
      if (!audioUrlRefreshService.isTokenBasedUrl(episode.audioUrl)) {
        console.log('Not a token-based URL, skipping refresh')
        return false
      }

      // Check if token is likely expired
      const isLikelyExpired = audioUrlRefreshService.isTokenLikelyExpired(episode.audioUrl)
      console.log('Token likely expired:', isLikelyExpired)

      isRefreshing.current = true

      try {
        const result = await audioUrlRefreshService.handleAudioError(
          episode.episodeId,
          episode.podcastId,
          episode.audioUrl,
          error,
        )

        if (result.success && result.newAudioUrl) {
          console.log('Audio URL refreshed successfully')
          onUrlRefreshed?.(result.newAudioUrl)
          return true
        } else {
          console.log('Audio URL refresh failed:', result.error)
          return false
        }
      } catch (error) {
        console.error('Error during audio URL refresh:', error)
        return false
      } finally {
        isRefreshing.current = false
      }
    },
    [episode, onUrlRefreshed],
  )

  const checkTokenExpiration = useCallback(() => {
    if (!episode) return false
    return audioUrlRefreshService.isTokenLikelyExpired(episode.audioUrl)
  }, [episode])

  const preemptiveRefresh = useCallback(async () => {
    if (!episode || isRefreshing.current) {
      return false
    }

    if (!audioUrlRefreshService.isTokenBasedUrl(episode.audioUrl)) {
      return false
    }

    if (!audioUrlRefreshService.isTokenLikelyExpired(episode.audioUrl)) {
      return false
    }

    isRefreshing.current = true

    try {
      const result = await audioUrlRefreshService.handleAudioError(
        episode.episodeId,
        episode.podcastId,
        episode.audioUrl,
        { status: 403, message: 'Preemptive refresh' },
      )

      if (result.success && result.newAudioUrl) {
        onUrlRefreshed?.(result.newAudioUrl)
        return true
      }

      return false
    } catch (error) {
      console.error('Error during preemptive refresh:', error)
      return false
    } finally {
      isRefreshing.current = false
    }
  }, [episode, onUrlRefreshed])

  return {
    handleAudioError,
    checkTokenExpiration,
    preemptiveRefresh,
    isRefreshing: isRefreshing.current,
  }
}
