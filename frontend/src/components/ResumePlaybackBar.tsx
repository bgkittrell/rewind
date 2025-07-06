import { useState, useEffect } from 'react'
import { IconPlayerPlay, IconX, IconMusic } from '@tabler/icons-react'
import { ResumeData } from '../services/resumeService'

interface ResumePlaybackBarProps {
  resumeData: ResumeData
  onResume: () => void
  onDismiss: () => void
}

export function ResumePlaybackBar({ resumeData, onResume, onDismiss }: ResumePlaybackBarProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    if (!isVisible) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Auto-dismiss after 10 seconds
          setIsVisible(false)
          onDismiss()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isVisible, onDismiss])

  const handleResume = () => {
    setIsVisible(false)
    onResume()
  }

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss()
  }

  if (!isVisible) return null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-white shadow-lg animate-slide-down">
      <div className="flex items-center p-4 space-x-4">
        {/* Episode thumbnail */}
        <div className="w-12 h-12 bg-gray-300 rounded-lg flex-shrink-0 overflow-hidden">
          {resumeData.imageUrl || resumeData.podcastImageUrl ? (
            <img
              src={resumeData.imageUrl || resumeData.podcastImageUrl}
              alt={`${resumeData.podcastTitle} artwork`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-300 flex items-center justify-center">
              <IconMusic className="w-6 h-6 text-gray-500" data-testid="music-icon" />
            </div>
          )}
        </div>

        {/* Episode info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{resumeData.title}</h3>
          <p className="text-xs text-white text-opacity-80 truncate">{resumeData.podcastTitle}</p>
          <div className="flex items-center space-x-2 mt-1">
            <div
              className="flex-1 bg-white bg-opacity-30 rounded-full h-2"
              role="progressbar"
              aria-valuenow={resumeData.progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="bg-white h-2 rounded-full transition-all"
                style={{ width: `${resumeData.progressPercentage}%` }}
              />
            </div>
            <span className="text-xs text-white text-opacity-80">
              {formatTime(resumeData.playbackPosition)} / {formatTime(resumeData.duration)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={handleResume}
            className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-full transition-colors"
            aria-label="Resume playback"
          >
            <IconPlayerPlay className="w-4 h-4" />
            <span className="text-sm font-medium">Resume</span>
          </button>

          <button
            onClick={handleDismiss}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="px-4 pb-2">
        <div className="text-xs text-white text-opacity-60 text-center">Auto-dismissing in {countdown}s</div>
      </div>
    </div>
  )
}

export default ResumePlaybackBar
