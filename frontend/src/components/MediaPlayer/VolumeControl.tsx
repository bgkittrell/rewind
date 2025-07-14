import React from 'react'
import { IconVolume } from '@tabler/icons-react'

interface VolumeControlProps {
  volume: number
  onVolumeChange: (volume: number) => void
}

export const VolumeControl: React.FC<VolumeControlProps> = ({ volume, onVolumeChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <IconVolume />
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={volume}
        onChange={e => onVolumeChange(parseFloat(e.target.value))}
        className="w-20 h-1 bg-white bg-opacity-30 rounded-full appearance-none slider"
        aria-label="Volume"
      />
    </div>
  )
}
