import React, { useState, useEffect, useCallback } from 'react'
import { IconChevronDown, IconX, IconChevronUp } from '@tabler/icons-react'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { useProgressSaving } from '../hooks/useProgressSaving'
import { mediaSessionService } from '../services/mediaSessionService'
import { MediaControls } from './MediaPlayer/MediaControls'
import { ProgressBar } from './MediaPlayer/ProgressBar'
import { VolumeControl } from './MediaPlayer/VolumeControl'
import { MediaInfo } from './MediaPlayer/MediaInfo'
import { PlaybackRateControl } from './MediaPlayer/PlaybackRateControl'
import type { Episode } from '../types/episode'

interface FloatingMediaPlayerProps {
  episode: Episode | null
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onClose: () => void
  onSeek: (_position: number) => void
}

export function FloatingMediaPlayer({
  episode,
  isPlaying,
  onPlay,
  onPause,
  onClose,
  onSeek,
}: FloatingMediaPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volume, setVolume] = useState(1)

  const {
    audioRef,
    play,
    pause,
    seek,
    setVolume: setAudioVolume,
    setPlaybackRate: setAudioPlaybackRate,
  } = useAudioPlayer({
    episode,
    onTimeUpdate: time => {
      setCurrentTime(time)
      onSeek(time)
    },
    onDurationChange: setDuration,
    onEnded: () => {
      onPause()
      seek(0)
    },
  })

  // Use progress saving hook
  useProgressSaving({
    episode,
    currentTime,
    duration,
    isPlaying,
  })

  // Setup MediaSession API
  useEffect(() => {
    if (!episode) return

    mediaSessionService.setMetadata(episode)
    mediaSessionService.setActionHandlers({
      play: onPlay,
      pause: onPause,
      seekbackward: () => {
        const newTime = Math.max(0, currentTime - 15)
        seek(newTime)
        onSeek(newTime)
      },
      seekforward: () => {
        const newTime = Math.min(duration, currentTime + 15)
        seek(newTime)
        onSeek(newTime)
      },
    })

    return () => {
      mediaSessionService.clearActionHandlers()
    }
  }, [episode, onPlay, onPause, currentTime, duration, seek, onSeek])

  // Update MediaSession position state
  useEffect(() => {
    if (episode && duration > 0) {
      mediaSessionService.setPositionState(duration, currentTime, playbackRate)
    }
  }, [episode, duration, currentTime, playbackRate])

  // Initialize audio position on episode change
  useEffect(() => {
    if (episode && episode.playbackPosition) {
      seek(episode.playbackPosition)
      setCurrentTime(episode.playbackPosition)
    }
  }, [episode, seek])

  // Handle play/pause state
  useEffect(() => {
    if (isPlaying) {
      play()
    } else {
      pause()
    }
  }, [isPlaying, play, pause])

  // Handle volume changes
  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      setVolume(newVolume)
      setAudioVolume(newVolume)
    },
    [setAudioVolume],
  )

  // Handle playback rate changes
  const handlePlaybackRateChange = useCallback(
    (newRate: number) => {
      setPlaybackRate(newRate)
      setAudioPlaybackRate(newRate)
    },
    [setAudioPlaybackRate],
  )

  // Handle skip controls
  const handleSkipBack = useCallback(() => {
    const newTime = Math.max(0, currentTime - 15)
    seek(newTime)
    onSeek(newTime)
  }, [currentTime, seek, onSeek])

  const handleSkipForward = useCallback(() => {
    const newTime = Math.min(duration, currentTime + 15)
    seek(newTime)
    onSeek(newTime)
  }, [currentTime, duration, seek, onSeek])

  // Handle seek from progress bar
  const handleSeek = useCallback(
    (time: number) => {
      seek(time)
      onSeek(time)
    },
    [seek, onSeek],
  )

  // Handle visibility change for background audio support
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (audioRef.current && episode && isPlaying) {
        if (document.visibilityState === 'visible' && audioRef.current.paused) {
          play().catch(error => {
            console.warn('Failed to resume audio playback:', error)
          })
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [audioRef, episode, isPlaying, play])

  if (!episode) return null

  return (
    <>
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" playsInline data-testid="audio-element" />

      {/* Overlay for expanded view */}
      {isExpanded && <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsExpanded(false)} />}

      {/* Player Container */}
      <div
        className={`fixed left-0 right-0 bg-primary text-white z-50 transition-all duration-300 ${
          isExpanded ? 'bottom-0 h-screen' : 'bottom-16 h-20 shadow-lg'
        }`}
        data-testid="floating-media-player"
      >
        {isExpanded ? (
          /* Expanded Player */
          <div className="h-full flex flex-col p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                aria-label="Minimize player"
                data-testid="minimize-player"
              >
                <IconChevronDown />
              </button>
              <div></div>
            </div>

            {/* Center Content */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <MediaInfo episode={episode} size="full" />

              <ProgressBar currentTime={currentTime} duration={duration} onSeek={handleSeek} size="full" />

              <MediaControls
                isPlaying={isPlaying}
                onPlay={onPlay}
                onPause={onPause}
                onSkipBack={handleSkipBack}
                onSkipForward={handleSkipForward}
                size="full"
              />

              {/* Secondary Controls */}
              <div className="flex items-center space-x-4">
                <VolumeControl volume={volume} onVolumeChange={handleVolumeChange} />
                <PlaybackRateControl playbackRate={playbackRate} onPlaybackRateChange={handlePlaybackRateChange} />
              </div>
            </div>
          </div>
        ) : (
          /* Mini Player */
          <div className="h-full flex items-center px-2">
            <MediaInfo episode={episode} size="mini" />

            {/* Controls */}
            <div className="flex items-center space-x-1 flex-shrink-0">
              <MediaControls
                isPlaying={isPlaying}
                onPlay={onPlay}
                onPause={onPause}
                onSkipBack={handleSkipBack}
                onSkipForward={handleSkipForward}
                size="mini"
              />

              <button
                onClick={() => setIsExpanded(true)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                aria-label="Expand player"
                data-testid="expand-player"
              >
                <IconChevronUp />
              </button>

              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                aria-label="Close player"
                data-testid="mini-close-player"
              >
                <IconX />
              </button>
            </div>

            <ProgressBar currentTime={currentTime} duration={duration} onSeek={handleSeek} size="mini" />
          </div>
        )}
      </div>
    </>
  )
}

export default FloatingMediaPlayer
