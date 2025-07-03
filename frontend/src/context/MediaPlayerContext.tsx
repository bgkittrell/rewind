import { createContext, useContext, useState, ReactNode } from 'react'

interface Episode {
  id: string
  title: string
  podcastName: string
  releaseDate: string
  duration: string
  audioUrl?: string
  imageUrl?: string
  description?: string
  playbackPosition?: number
}

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
}

const MediaPlayerContext = createContext<MediaPlayerContextType | null>(null)

export function MediaPlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MediaPlayerState>({
    currentEpisode: null,
    isPlaying: false,
    currentPosition: 0,
  })

  const playEpisode = (episode: Episode) => {
    setState({
      currentEpisode: episode,
      isPlaying: true,
      currentPosition: episode.playbackPosition || 0,
    })
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

  return (
    <MediaPlayerContext.Provider
      value={{
        state,
        playEpisode,
        pause,
        resume,
        stop,
        seek,
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
