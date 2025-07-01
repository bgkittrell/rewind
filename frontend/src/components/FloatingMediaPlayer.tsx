import { PlayerState } from '../types/player'
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconChevronDown,
  IconMaximize,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
} from '@tabler/icons-react'

interface FloatingMediaPlayerProps {
  state: PlayerState
  onTogglePlayPause: () => void
  onSeek: (time: number) => void
  onSkipForward: () => void
  onSkipBackward: () => void
  onExpand: () => void
  onMinimize: () => void
  onSetVolume: (volume: number) => void
  onSetPlaybackRate: (rate: number) => void
}

export function FloatingMediaPlayer({
  state,
  onTogglePlayPause,
  onSeek,
  onSkipForward,
  onSkipBackward,
  onExpand,
  onMinimize,
  onSetVolume,
  onSetPlaybackRate,
}: FloatingMediaPlayerProps) {
  if (!state.currentEpisode) {
    return null
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const progressPercentage = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0

  if (state.isMinimized) {
    return (
      <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="px-4 py-3">
          {/* Progress Bar */}
          <div
            className="w-full bg-gray-200 h-1 rounded-full mb-3 cursor-pointer"
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left
              const percentage = x / rect.width
              onSeek(percentage * state.duration)
            }}
          >
            <div
              className="bg-red h-1 rounded-full transition-all duration-150"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img
                src={state.currentEpisode.podcast.thumbnail || '/default-podcast.png'}
                alt={state.currentEpisode.podcast.name}
                className="w-10 h-10 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">{state.currentEpisode.title}</h4>
                <p className="text-xs text-gray-500 truncate">{state.currentEpisode.podcast.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onTogglePlayPause}
                className="p-2 text-red hover:bg-red/10 rounded-full transition-colors"
                aria-label={state.isPlaying ? 'Pause' : 'Play'}
              >
                {state.isPlaying ? <IconPlayerPause className="w-6 h-6" /> : <IconPlayerPlay className="w-6 h-6" />}
              </button>

              <button
                onClick={onExpand}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Expand player"
              >
                <IconMaximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Expanded Player
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={onMinimize}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Minimize player"
        >
          <IconChevronDown className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold">Now Playing</h2>
        <div className="w-10" />
      </div>

      {/* Episode Info */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <img
          src={state.currentEpisode.podcast.thumbnail || '/default-podcast.png'}
          alt={state.currentEpisode.podcast.name}
          className="w-64 h-64 rounded-lg object-cover shadow-lg mb-8"
        />

        <div className="text-center mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{state.currentEpisode.title}</h3>
          <p className="text-lg text-gray-600">{state.currentEpisode.podcast.name}</p>
        </div>

        {/* Progress */}
        <div className="w-full max-w-sm mb-8">
          <div
            className="w-full bg-gray-200 h-2 rounded-full cursor-pointer mb-2"
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left
              const percentage = x / rect.width
              onSeek(percentage * state.duration)
            }}
          >
            <div
              className="bg-red h-2 rounded-full transition-all duration-150"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>{formatTime(state.currentTime)}</span>
            <span>{formatTime(state.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 mb-8">
          <button
            onClick={onSkipBackward}
            className="p-3 text-gray-600 hover:text-red transition-colors"
            aria-label="Skip backward 15 seconds"
          >
            <IconPlayerSkipBack className="w-8 h-8" />
          </button>

          <button
            onClick={onTogglePlayPause}
            className="p-4 bg-red text-white rounded-full hover:bg-red-600 transition-colors"
            aria-label={state.isPlaying ? 'Pause' : 'Play'}
          >
            {state.isPlaying ? <IconPlayerPause className="w-8 h-8" /> : <IconPlayerPlay className="w-8 h-8" />}
          </button>

          <button
            onClick={onSkipForward}
            className="p-3 text-gray-600 hover:text-red transition-colors"
            aria-label="Skip forward 15 seconds"
          >
            <IconPlayerSkipForward className="w-8 h-8" />
          </button>
        </div>

        {/* Additional Controls */}
        <div className="flex items-center gap-4 w-full max-w-sm">
          <span className="text-sm text-gray-500">Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={state.volume}
            onChange={e => onSetVolume(Number(e.target.value))}
            className="flex-1"
          />
          <select
            value={state.playbackRate}
            onChange={e => onSetPlaybackRate(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>
      </div>
    </div>
  )
}
