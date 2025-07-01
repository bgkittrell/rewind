import { useReducer, useRef, useEffect } from 'react'
import { PlayerState, PlayerAction } from '../types/player'
import { Episode } from '../types/episode'

const initialState: PlayerState = {
  currentEpisode: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  isMinimized: true,
}

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'PLAY_EPISODE':
      return {
        ...state,
        currentEpisode: action.episode,
        isPlaying: true,
        currentTime: 0,
        isMinimized: true,
      }
    case 'PLAY':
      return { ...state, isPlaying: true }
    case 'PAUSE':
      return { ...state, isPlaying: false }
    case 'SEEK':
      return { ...state, currentTime: action.time }
    case 'SET_VOLUME':
      return { ...state, volume: action.volume }
    case 'SET_PLAYBACK_RATE':
      return { ...state, playbackRate: action.rate }
    case 'SKIP_FORWARD':
      return { ...state, currentTime: Math.min(state.currentTime + action.seconds, state.duration) }
    case 'SKIP_BACKWARD':
      return { ...state, currentTime: Math.max(state.currentTime - action.seconds, 0) }
    case 'MINIMIZE':
      return { ...state, isMinimized: true }
    case 'EXPAND':
      return { ...state, isMinimized: false }
    case 'UPDATE_TIME':
      return { ...state, currentTime: action.currentTime, duration: action.duration }
    default:
      return state
  }
}

export function useAudioPlayer() {
  const [state, dispatch] = useReducer(playerReducer, initialState)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
    }

    const audio = audioRef.current

    const handleTimeUpdate = () => {
      dispatch({
        type: 'UPDATE_TIME',
        currentTime: audio.currentTime,
        duration: audio.duration || 0,
      })
    }

    const handleLoadedMetadata = () => {
      dispatch({
        type: 'UPDATE_TIME',
        currentTime: audio.currentTime,
        duration: audio.duration || 0,
      })
    }

    const handleEnded = () => {
      dispatch({ type: 'PAUSE' })
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  useEffect(() => {
    if (audioRef.current && state.currentEpisode) {
      audioRef.current.src = state.currentEpisode.audioUrl
      audioRef.current.load()
    }
  }, [state.currentEpisode])

  useEffect(() => {
    if (audioRef.current) {
      if (state.isPlaying) {
        audioRef.current.play().catch(console.error)
      } else {
        audioRef.current.pause()
      }
    }
  }, [state.isPlaying])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = state.currentTime
    }
  }, [state.currentTime])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume
    }
  }, [state.volume])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = state.playbackRate
    }
  }, [state.playbackRate])

  const playEpisode = (episode: Episode) => {
    dispatch({ type: 'PLAY_EPISODE', episode })
  }

  const togglePlayPause = () => {
    dispatch({ type: state.isPlaying ? 'PAUSE' : 'PLAY' })
  }

  const seek = (time: number) => {
    dispatch({ type: 'SEEK', time })
  }

  const setVolume = (volume: number) => {
    dispatch({ type: 'SET_VOLUME', volume })
  }

  const setPlaybackRate = (rate: number) => {
    dispatch({ type: 'SET_PLAYBACK_RATE', rate })
  }

  const skipForward = (seconds: number = 15) => {
    dispatch({ type: 'SKIP_FORWARD', seconds })
  }

  const skipBackward = (seconds: number = 15) => {
    dispatch({ type: 'SKIP_BACKWARD', seconds })
  }

  const minimize = () => {
    dispatch({ type: 'MINIMIZE' })
  }

  const expand = () => {
    dispatch({ type: 'EXPAND' })
  }

  return {
    state,
    playEpisode,
    togglePlayPause,
    seek,
    setVolume,
    setPlaybackRate,
    skipForward,
    skipBackward,
    minimize,
    expand,
  }
}
