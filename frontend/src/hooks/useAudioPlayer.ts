import { useRef, useState, useEffect, useCallback } from 'react'
import type { Episode } from '../types/episode'

interface UseAudioPlayerProps {
  episode: Episode | null
  onTimeUpdate?: (time: number) => void
  onDurationChange?: (duration: number) => void
  onEnded?: () => void
}

export function useAudioPlayer({ episode, onTimeUpdate, onDurationChange, onEnded }: UseAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    const handleError = () => {
      setIsLoading(false)
      setError('Failed to load audio')
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
