import { useEffect, useRef } from 'react'
import { PROGRESS_SAVE_INTERVAL } from '../constants/resume'
import type { Episode } from '../types/episode'

interface UseProgressSavingProps {
  episode: Episode | null
  currentTime: number
  duration: number
  isPlaying: boolean
}

export function useProgressSaving({ episode, currentTime, duration, isPlaying }: UseProgressSavingProps) {
  const lastSavedTimeRef = useRef<number>(0)

  // Save progress periodically while playing
  useEffect(() => {
    if (!isPlaying || !episode) return

    const saveProgress = async () => {
      if (episode && Math.abs(currentTime - lastSavedTimeRef.current) > 5 && duration > 0) {
        try {
          const { episodeService } = await import('../services/episodeService')
          await episodeService.saveProgress(episode.episodeId, currentTime, duration, episode.podcastId)
          lastSavedTimeRef.current = currentTime
        } catch (error) {
          console.error('Error saving progress:', error)
        }
      }
    }

    const interval = setInterval(saveProgress, PROGRESS_SAVE_INTERVAL)
    return () => clearInterval(interval)
  }, [isPlaying, episode, currentTime, duration])

  // Save progress on pause
  useEffect(() => {
    if (!episode || isPlaying) return

    const saveProgressOnPause = async () => {
      if (currentTime > 0 && Math.abs(currentTime - lastSavedTimeRef.current) > 5 && duration > 0) {
        try {
          const { episodeService } = await import('../services/episodeService')
          await episodeService.saveProgress(episode.episodeId, currentTime, duration, episode.podcastId)
          lastSavedTimeRef.current = currentTime
        } catch (error) {
          console.error('Error saving progress on pause:', error)
        }
      }
    }

    saveProgressOnPause()
  }, [isPlaying, episode, currentTime, duration])

  // Save progress on unmount
  useEffect(() => {
    return () => {
      if (episode && currentTime > 0 && duration > 0) {
        import('../services/episodeService').then(({ episodeService }) => {
          episodeService
            .saveProgress(episode.episodeId, currentTime, duration, episode.podcastId)
            .catch(error => console.error('Error saving progress on unmount:', error))
        })
      }
    }
  }, [episode, currentTime, duration])
}
