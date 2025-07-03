import React, { useState, useEffect, useRef } from 'react'

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

  // Setup MediaSession API for lock screen controls
  useEffect(() => {
    if (!episode || !('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: episode.title,
      artist: episode.podcastName,
      album: 'Rewind',
      artwork: episode.imageUrl ? [
        { src: episode.imageUrl, sizes: '96x96', type: 'image/png' },
        { src: episode.imageUrl, sizes: '128x128', type: 'image/png' },
        { src: episode.imageUrl, sizes: '192x192', type: 'image/png' },
        { src: episode.imageUrl, sizes: '256x256', type: 'image/png' },
        { src: episode.imageUrl, sizes: '384x384', type: 'image/png' },
        { src: episode.imageUrl, sizes: '512x512', type: 'image/png' },
      ] : undefined,
    })

    navigator.mediaSession.setActionHandler('play', onPlay)
    navigator.mediaSession.setActionHandler('pause', onPause)
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      if (audioRef.current) {
        const newTime = Math.max(0, audioRef.current.currentTime - 15)
        audioRef.current.currentTime = newTime
        onSeek(newTime)
      }
    })
    navigator.mediaSession.setActionHandler('seekforward', () => {
      if (audioRef.current) {
        const newTime = Math.min(duration, audioRef.current.currentTime + 15)
        audioRef.current.currentTime = newTime
        onSeek(newTime)
      }
    })
  }, [episode, onPlay, onPause, onSeek, duration])

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
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

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
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13H5v-2h14v2z" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                aria-label="Close player"
                data-testid="close-player"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Center Content */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              {/* Large Album Art */}
              <div className="w-48 h-48 bg-gray-300 rounded-lg flex-shrink-0 overflow-hidden">
                {episode?.imageUrl ? (
                  <img
                    src={episode.imageUrl}
                    alt={`${episode.podcastName} artwork`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                    </svg>
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
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
                    <text x="12" y="15" textAnchor="middle" fontSize="8" fill="white">15</text>
                  </svg>
                </button>

                <button
                  onClick={isPlaying ? onPause : onPlay}
                  className="p-4 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  data-testid="main-play-pause-button"
                >
                  {isPlaying ? (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={handleSkipForward}
                  className="p-3 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                  aria-label="Skip forward 15 seconds"
                  data-testid="skip-forward-button"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 6v12l8.5-6L13 6zM4 18l8.5-6L4 6v12z" />
                    <text x="12" y="15" textAnchor="middle" fontSize="8" fill="white">15</text>
                  </svg>
                </button>
              </div>

              {/* Secondary Controls */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-20 h-1 bg-white bg-opacity-30 rounded-full appearance-none slider"
                    aria-label="Volume"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-white text-opacity-80">Speed:</span>
                  <select
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
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
              {episode?.imageUrl ? (
                <img
                  src={episode.imageUrl}
                  alt={`${episode.podcastName} artwork`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                  </svg>
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
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => setIsExpanded(true)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                aria-label="Expand player"
                data-testid="expand-player"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
                </svg>
              </button>

              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                aria-label="Close player"
                data-testid="mini-close-player"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white bg-opacity-30">
              <div
                className="h-1 bg-white transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default FloatingMediaPlayer
