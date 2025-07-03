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
        className={`fixed bottom-0 left-0 right-0 bg-primary text-white z-50 transition-all duration-300 ${
          isExpanded ? 'h-screen' : 'h-20'
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
                className={
                  'p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors'
                }
                aria-label="Minimize player"
                data-testid="minimize-player"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13H5v-2h14v2z" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className={
                  'p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors'
                }
                aria-label="Close player"
                data-testid="close-player"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {/* Episode Art */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-64 h-64 mb-8 bg-white bg-opacity-20 rounded-lg overflow-hidden">
                {episode.imageUrl ? (
                  <img
                    src={episode.imageUrl}
                    alt={`${episode.podcastName} artwork`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-24 h-24 text-white text-opacity-60"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Episode Info */}
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold mb-2 line-clamp-2">{episode.title}</h2>
                <p className="text-white text-opacity-80 mb-1">{episode.podcastName}</p>
                <p className="text-sm text-white text-opacity-60">
                  {new Date(episode.releaseDate).toLocaleDateString()}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md mb-4">
                <div
                  className="bg-white bg-opacity-30 rounded-full h-2 cursor-pointer"
                  onClick={handleProgressClick}
                >
                  <div
                    className="bg-white h-2 rounded-full transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-white text-opacity-80 mt-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center space-x-6 mb-8">
                <button
                  onClick={handleSkipBack}
                  className={
                    'p-3 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors'
                  }
                  aria-label="Skip back 15 seconds"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8z" />
                    <text x="12" y="15" textAnchor="middle" fontSize="8" fill="currentColor">
                      15
                    </text>
                  </svg>
                </button>

                <button
                  onClick={isPlaying ? onPause : onPlay}
                  className={
                    'p-4 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors'
                  }
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  data-testid="play-pause-button"
                >
                  {isPlaying ? (
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={handleSkipForward}
                  className={
                    'p-3 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors'
                  }
                  aria-label="Skip forward 15 seconds"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
                    <text x="12" y="15" textAnchor="middle" fontSize="8" fill="currentColor">
                      15
                    </text>
                  </svg>
                </button>
              </div>

              {/* Speed and Volume Controls */}
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-white text-opacity-80">Speed:</span>
                  <select
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(Number(e.target.value))}
                    className="bg-white bg-opacity-20 text-white rounded px-2 py-1 text-sm"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">1x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-20"
                    aria-label="Volume"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Mini Player */
          <div className="h-20 flex items-center px-4">
            {/* Episode Art */}
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg overflow-hidden flex-shrink-0">
              {episode.imageUrl ? (
                <img
                  src={episode.imageUrl}
                  alt={`${episode.podcastName} artwork`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg 
                    className="w-6 h-6 text-white text-opacity-60" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Episode Info */}
            <div className="flex-1 mx-4 min-w-0">
              <h3 className="font-semibold text-sm truncate">{episode.title}</h3>
              <p className="text-xs text-white text-opacity-80 truncate">{episode.podcastName}</p>
              
              {/* Progress Bar */}
              <div
                className="bg-white bg-opacity-30 rounded-full h-1 mt-2 cursor-pointer"
                onClick={handleProgressClick}
              >
                <div
                  className="bg-white h-1 rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={isPlaying ? onPause : onPlay}
                className={
                  'p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors'
                }
                aria-label={isPlaying ? 'Pause' : 'Play'}
                data-testid="mini-play-pause-button"
              >
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => setIsExpanded(true)}
                className={
                  'p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors'
                }
                aria-label="Expand player"
                data-testid="expand-player"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              </button>

              <button
                onClick={onClose}
                className={
                  'p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors'
                }
                aria-label="Close player"
                data-testid="mini-close-player"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default FloatingMediaPlayer
