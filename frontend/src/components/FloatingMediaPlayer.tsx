import React, { useState, useEffect, useRef } from 'react'
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconVolume,
  IconChevronDown,
  IconX,
  IconMusic,
  IconChevronUp,
} from '@tabler/icons-react'

interface Episode {
  id: string
  title: string
  podcastName: string
  releaseDate: string
  duration: string
  audioUrl?: string
  imageUrl?: string
  description?: string
  playbackPosition?: number
  podcastImageUrl?: string
}

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
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY EARLY RETURNS
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volume, setVolume] = useState(1)
  const audioRef = useRef<HTMLAudioElement>(null)
  const mediaSessionSetupRef = useRef<boolean>(false)

  // Setup MediaSession API for lock screen controls
  useEffect(() => {
    if (!episode || !('mediaSession' in navigator)) return

    // Set up MediaSession metadata
    const artworkUrl = episode.imageUrl || episode.podcastImageUrl
    navigator.mediaSession.metadata = new MediaMetadata({
      title: episode.title,
      artist: episode.podcastName,
      album: 'Rewind - Rediscover Podcasts',
      artwork: artworkUrl
        ? [
            { src: artworkUrl, sizes: '96x96', type: 'image/png' },
            { src: artworkUrl, sizes: '128x128', type: 'image/png' },
            { src: artworkUrl, sizes: '192x192', type: 'image/png' },
            { src: artworkUrl, sizes: '256x256', type: 'image/png' },
            { src: artworkUrl, sizes: '384x384', type: 'image/png' },
            { src: artworkUrl, sizes: '512x512', type: 'image/png' },
          ]
        : [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
    })

    // Set up action handlers only once
    if (!mediaSessionSetupRef.current) {
      navigator.mediaSession.setActionHandler('play', () => {
        onPlay()
      })
      
      navigator.mediaSession.setActionHandler('pause', () => {
        onPause()
      })
      
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (audioRef.current) {
          const seekTime = details.seekOffset || 15
          const newTime = Math.max(0, audioRef.current.currentTime - seekTime)
          audioRef.current.currentTime = newTime
          onSeek(newTime)
        }
      })
      
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (audioRef.current) {
          const seekTime = details.seekOffset || 15
          const newTime = Math.min(duration, audioRef.current.currentTime + seekTime)
          audioRef.current.currentTime = newTime
          onSeek(newTime)
        }
      })

      // Set up additional handlers for better iOS integration
      navigator.mediaSession.setActionHandler('previoustrack', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
      
      mediaSessionSetupRef.current = true
    }

    // Update playback state
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'

    // Cleanup function
    return () => {
      // Don't clear handlers here as they should persist while the component is mounted
      // Only clear metadata when episode changes
      if (navigator.mediaSession.metadata) {
        navigator.mediaSession.metadata = null
      }
    }
  }, [episode, isPlaying, onPlay, onPause, onSeek, duration])

  // Update MediaSession playback state when playing state changes
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
    }
  }, [isPlaying])

  // Update MediaSession position state
  useEffect(() => {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      if (duration > 0) {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: playbackRate,
          position: currentTime,
        })
      }
    }
  }, [currentTime, duration, playbackRate])

  // Cleanup MediaSession when component unmounts
  useEffect(() => {
    return () => {
      if ('mediaSession' in navigator) {
        // Clear all handlers when component unmounts
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)
        navigator.mediaSession.setActionHandler('seekbackward', null)
        navigator.mediaSession.setActionHandler('seekforward', null)
        navigator.mediaSession.setActionHandler('previoustrack', null)
        navigator.mediaSession.setActionHandler('nexttrack', null)
        navigator.mediaSession.metadata = null
        navigator.mediaSession.playbackState = 'none'
      }
    }
  }, [])

  // Update audio element when episode changes
  useEffect(() => {
    if (audioRef.current && episode?.audioUrl) {
      audioRef.current.src = episode.audioUrl
      audioRef.current.currentTime = episode.playbackPosition || 0
      audioRef.current.playbackRate = playbackRate
      audioRef.current.volume = volume
    }
  }, [episode, playbackRate, volume])

  // Handle play/pause state
  useEffect(() => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.play()
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying])

  // EARLY RETURN AFTER ALL HOOKS - THIS FIXES THE HOOKS ERROR
  if (!episode) return null

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      onSeek(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration

    audioRef.current.currentTime = newTime
    onSeek(newTime)
  }

  const handleSkipBack = () => {
    if (audioRef.current) {
      const newTime = Math.max(0, audioRef.current.currentTime - 15)
      audioRef.current.currentTime = newTime
      onSeek(newTime)
    }
  }

  const handleSkipForward = () => {
    if (audioRef.current) {
      const newTime = Math.min(duration, audioRef.current.currentTime + 15)
      audioRef.current.currentTime = newTime
      onSeek(newTime)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        preload="metadata"
        data-testid="audio-element"
      />

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
              {/* Large Album Art */}
              <div className="w-48 h-48 bg-gray-300 rounded-lg flex-shrink-0 overflow-hidden">
                {episode?.imageUrl || episode?.podcastImageUrl ? (
                  <img
                    src={episode?.imageUrl || episode?.podcastImageUrl}
                    alt={`${episode.podcastName} artwork`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                    <IconMusic />
                  </div>
                )}
              </div>

              {/* Episode Info */}
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white mb-1">{episode?.title}</h2>
                <p className="text-sm text-white text-opacity-80">{episode?.podcastName}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md">
                <div
                  className="w-full h-2 bg-white bg-opacity-30 rounded-full cursor-pointer"
                  onClick={handleProgressClick}
                >
                  <div
                    className="h-2 bg-white rounded-full transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white text-opacity-80 mt-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Main Controls */}
              <div className="flex items-center space-x-6">
                <button
                  onClick={handleSkipBack}
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
                  onClick={handleSkipForward}
                  className="p-3 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                  aria-label="Skip forward 15 seconds"
                  data-testid="skip-forward-button"
                >
                  <IconPlayerSkipForward />
                </button>
              </div>

              {/* Secondary Controls */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <IconVolume />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={e => setVolume(parseFloat(e.target.value))}
                    className="w-20 h-1 bg-white bg-opacity-30 rounded-full appearance-none slider"
                    aria-label="Volume"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-white text-opacity-80">Speed:</span>
                  <select
                    value={playbackRate}
                    onChange={e => setPlaybackRate(parseFloat(e.target.value))}
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
              </div>
            </div>
          </div>
        ) : (
          /* Mini Player */
          <div className="h-full flex items-center px-2">
            {/* Small Album Art */}
            <div className="w-12 h-12 bg-gray-300 rounded-lg flex-shrink-0 overflow-hidden mr-3">
              {episode?.imageUrl || episode?.podcastImageUrl ? (
                <img
                  src={episode?.imageUrl || episode?.podcastImageUrl}
                  alt={`${episode.podcastName} artwork`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                  <IconMusic />
                </div>
              )}
            </div>

            {/* Episode Info */}
            <div className="flex-1 min-w-0 mr-2">
              <p className="text-sm font-medium text-white truncate">{episode?.title}</p>
              <p className="text-xs text-white text-opacity-80 truncate">{episode?.podcastName}</p>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-1 flex-shrink-0">
              <button
                onClick={isPlaying ? onPause : onPlay}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                data-testid="mini-play-pause-button"
              >
                {isPlaying ? <IconPlayerPause /> : <IconPlayerPlay />}
              </button>

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

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white bg-opacity-30">
              <div className="h-1 bg-white transition-all" style={{ width: `${progressPercentage}%` }} />
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default FloatingMediaPlayer
