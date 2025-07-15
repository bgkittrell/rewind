import { useRef, useState, useEffect, useCallback } from 'react'
import { useAudioUrlRefresh } from './useAudioUrlRefresh'
import type { Episode } from '../types/episode'

interface UseAudioPlayerProps {
  episode: Episode | null
  onTimeUpdate?: (time: number) => void
  onDurationChange?: (duration: number) => void
  onEnded?: () => void
  onEpisodeUpdate?: (updatedEpisode: Episode) => void
}

export function useAudioPlayer({
  episode,
  onTimeUpdate,
  onDurationChange,
  onEnded,
  onEpisodeUpdate,
}: UseAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasTriedRefresh, setHasTriedRefresh] = useState(false)

  // URL refresh functionality
  const { handleAudioError } = useAudioUrlRefresh({
    episode,
    onUrlRefreshed: newUrl => {
      if (episode && onEpisodeUpdate) {
        console.log('Audio URL refreshed, updating episode')
        const updatedEpisode = { ...episode, audioUrl: newUrl }
        onEpisodeUpdate(updatedEpisode)

        // Update the current audio element
        if (audioRef.current) {
          const currentTime = audioRef.current.currentTime
          const wasPlaying = !audioRef.current.paused

          audioRef.current.src = newUrl
          audioRef.current.currentTime = currentTime

          if (wasPlaying) {
            audioRef.current.play().catch(console.error)
          }
        }
      }
    },
  })

  // Handle audio element events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      onTimeUpdate?.(audio.currentTime)
    }

    const handleDurationChange = () => {
      onDurationChange?.(audio.duration)
    }

    const handleLoadStart = () => {
      setIsLoading(true)
      setError(null)
    }

    const handleCanPlay = () => {
      setIsLoading(false)
    }

    const handleError = async () => {
      setIsLoading(false)

      // Don't try to refresh if we already attempted it for this episode
      if (hasTriedRefresh) {
        setError('Failed to load audio')
        return
      }

      // Try to refresh the URL if it's a token-based URL
      const refreshSuccess = await handleAudioError({
        status: 403,
        message: 'Audio element error',
        originalError: 'Audio failed to load',
      })

      if (!refreshSuccess) {
        setError('Failed to load audio')
        setHasTriedRefresh(true)
      }
    }

    const handleEnded = () => {
      onEnded?.()
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('error', handleError)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [onTimeUpdate, onDurationChange, onEnded])

  // Update audio source when episode changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !episode) return

    if (audio.src !== episode.audioUrl) {
      audio.src = episode.audioUrl
      audio.load()
      setHasTriedRefresh(false) // Reset refresh flag for new episode
    }
  }, [episode])

  const play = useCallback(async () => {
    if (!audioRef.current) return
    try {
      await audioRef.current.play()
    } catch (error) {
      console.error('Failed to play audio:', error)
      setError('Failed to play audio')
    }
  }, [])

  const pause = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.pause()
  }, [])

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = time
  }, [])

  const setVolume = useCallback((volume: number) => {
    if (!audioRef.current) return
    audioRef.current.volume = Math.max(0, Math.min(1, volume))
  }, [])

  const setPlaybackRate = useCallback((rate: number) => {
    if (!audioRef.current) return
    audioRef.current.playbackRate = rate
  }, [])

  return {
    audioRef,
    isLoading,
    error,
    play,
    pause,
    seek,
    setVolume,
    setPlaybackRate,
  }
}
