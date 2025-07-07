import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { episodeService } from '../services/episodeService'
import { resumeService, ResumeData } from '../services/resumeService'
import { RESUME_THRESHOLD } from '../constants/resume'
import type { Episode } from '../types/episode'

interface MediaPlayerState {
  currentEpisode: Episode | null
  isPlaying: boolean
  currentPosition: number
}

interface MediaPlayerContextType {
  state: MediaPlayerState
  playEpisode: (_episode: Episode) => void
  pause: () => void
  resume: () => void
  stop: () => void
  seek: (_position: number) => void
  resumePlayback: (_resumeData: ResumeData) => void
  canResume: boolean
  resumeData: ResumeData | null
}

const MediaPlayerContext = createContext<MediaPlayerContextType | null>(null)

export function MediaPlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MediaPlayerState>({
    currentEpisode: null,
    isPlaying: false,
    currentPosition: 0,
  })
  const [resumeData, setResumeData] = useState<ResumeData | null>(null)

  // Load resume data on mount
  useEffect(() => {
    resumeService.getResumeData().then(data => {
      setResumeData(data)
    })
  }, [])

  const playEpisode = async (episode: Episode) => {
    // Get saved progress for this episode
    try {
      const progress = await episodeService.getProgress(episode.episodeId)
      const playbackPosition = progress.position > RESUME_THRESHOLD ? progress.position : 0

      setState({
        currentEpisode: { ...episode, playbackPosition },
        isPlaying: true,
        currentPosition: playbackPosition,
      })
    } catch (error) {
      // If progress fetch fails, play from the beginning
      setState({
        currentEpisode: episode,
        isPlaying: true,
        currentPosition: episode.playbackPosition || 0,
      })
    }
  }

  const pause = () => {
    setState(prev => ({
      ...prev,
      isPlaying: false,
    }))
  }

  const resume = () => {
    setState(prev => ({
      ...prev,
      isPlaying: true,
    }))
  }

  const stop = () => {
    setState({
      currentEpisode: null,
      isPlaying: false,
      currentPosition: 0,
    })
  }

  const seek = (position: number) => {
    setState(prev => ({
      ...prev,
      currentPosition: position,
    }))
  }

  const resumePlayback = (data: ResumeData) => {
    const episode: Episode = {
      episodeId: data.episodeId,
      podcastId: data.podcastId,
      title: data.title,
      podcastName: data.podcastTitle,
      releaseDate: '',
      duration: data.duration.toString(),
      audioUrl: data.audioUrl,
      imageUrl: data.imageUrl,
      playbackPosition: data.playbackPosition,
      podcastImageUrl: data.podcastImageUrl,
    }

    setState({
      currentEpisode: episode,
      isPlaying: true,
      currentPosition: data.playbackPosition,
    })

    // Clear resume data after resuming
    setResumeData(null)
    resumeService.clearResumeData()
  }

  return (
    <MediaPlayerContext.Provider
      value={{
        state,
        playEpisode,
        pause,
        resume,
        stop,
        seek,
        resumePlayback,
        canResume: resumeData !== null,
        resumeData,
      }}
    >
      {children}
    </MediaPlayerContext.Provider>
  )
}

export function useMediaPlayer() {
  const context = useContext(MediaPlayerContext)
  if (!context) {
    throw new Error('useMediaPlayer must be used within a MediaPlayerProvider')
  }
  return context
}

export default MediaPlayerContext
