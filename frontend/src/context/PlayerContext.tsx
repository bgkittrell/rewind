import { createContext, useContext, ReactNode } from 'react'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { Episode } from '../types/episode'
import { PlayerState } from '../types/player'

interface PlayerContextType {
  state: PlayerState
  playEpisode: (episode: Episode) => void
  togglePlayPause: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  setPlaybackRate: (rate: number) => void
  skipForward: (seconds?: number) => void
  skipBackward: (seconds?: number) => void
  minimize: () => void
  expand: () => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

interface PlayerProviderProps {
  children: ReactNode
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  const playerHook = useAudioPlayer()

  return <PlayerContext.Provider value={playerHook}>{children}</PlayerContext.Provider>
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}
