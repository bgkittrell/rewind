import React from 'react'
import { IconPlayerPlay, IconPlayerPause, IconPlayerSkipBack, IconPlayerSkipForward } from '@tabler/icons-react'

interface MediaControlsProps {
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onSkipBack: () => void
  onSkipForward: () => void
  size?: 'mini' | 'full'
}

export const MediaControls: React.FC<MediaControlsProps> = ({
  isPlaying,
  onPlay,
  onPause,
  onSkipBack,
  onSkipForward,
  size = 'full',
}) => {
  if (size === 'mini') {
    return (
      <button
        onClick={isPlaying ? onPause : onPlay}
        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        data-testid="mini-play-pause-button"
      >
        {isPlaying ? <IconPlayerPause /> : <IconPlayerPlay />}
      </button>
    )
  }

  return (
    <div className="flex items-center space-x-6">
      <button
        onClick={onSkipBack}
        className="p-3 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
        aria-label="Skip back 15 seconds"
        data-testid="skip-back-button"
      >
        <IconPlayerSkipBack />
      </button>

      <button
        onClick={isPlaying ? onPause : onPlay}
        className="p-4 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        data-testid="main-play-pause-button"
      >
        {isPlaying ? <IconPlayerPause /> : <IconPlayerPlay />}
      </button>

      <button
        onClick={onSkipForward}
        className="p-3 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
        aria-label="Skip forward 15 seconds"
        data-testid="skip-forward-button"
      >
        <IconPlayerSkipForward />
      </button>
    </div>
  )
}
