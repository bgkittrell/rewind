import React from 'react'

interface ProgressBarProps {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  size?: 'mini' | 'full'
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ currentTime, duration, onSeek, size = 'full' }) => {
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration
    onSeek(newTime)
  }

  if (size === 'mini') {
    return (
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white bg-opacity-30">
        <div className="h-1 bg-white transition-all" style={{ width: `${progressPercentage}%` }} />
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="w-full h-2 bg-white bg-opacity-30 rounded-full cursor-pointer" onClick={handleProgressClick}>
        <div className="h-2 bg-white rounded-full transition-all" style={{ width: `${progressPercentage}%` }} />
      </div>
      <div className="flex justify-between text-xs text-white text-opacity-80 mt-2">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}
