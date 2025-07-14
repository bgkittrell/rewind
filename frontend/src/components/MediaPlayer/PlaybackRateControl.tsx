import React from 'react'

interface PlaybackRateControlProps {
  playbackRate: number
  onPlaybackRateChange: (rate: number) => void
}

export const PlaybackRateControl: React.FC<PlaybackRateControlProps> = ({ playbackRate, onPlaybackRateChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-white text-opacity-80">Speed:</span>
      <select
        value={playbackRate}
        onChange={e => onPlaybackRateChange(parseFloat(e.target.value))}
        className="bg-white bg-opacity-20 text-white text-sm rounded px-2 py-1 appearance-none"
        aria-label="Playback speed"
      >
        <option value="0.5">0.5x</option>
        <option value="0.75">0.75x</option>
        <option value="1">1x</option>
        <option value="1.25">1.25x</option>
        <option value="1.5">1.5x</option>
        <option value="2">2x</option>
      </select>
    </div>
  )
}
