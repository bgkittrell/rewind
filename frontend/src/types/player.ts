import { Episode } from './episode'

export interface PlayerState {
  currentEpisode: Episode | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playbackRate: number
  isMinimized: boolean
}

export type PlayerAction =
  | { type: 'PLAY_EPISODE'; episode: Episode }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SEEK'; time: number }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'SET_PLAYBACK_RATE'; rate: number }
  | { type: 'SKIP_FORWARD'; seconds: number }
  | { type: 'SKIP_BACKWARD'; seconds: number }
  | { type: 'MINIMIZE' }
  | { type: 'EXPAND' }
  | { type: 'UPDATE_TIME'; currentTime: number; duration: number }
