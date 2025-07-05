/**
 * MediaSession Service for Rewind PWA
 *
 * This service manages the MediaSession API to ensure proper integration with iOS
 * lock screen controls and prevents conflicts with other PWAs.
 */

interface MediaSessionData {
  title: string
  artist: string
  album: string
  artwork?: Array<{
    src: string
    sizes: string
    type: string
  }>
}

interface MediaSessionHandlers {
  onPlay: () => void
  onPause: () => void
  onSeekBackward: (offset?: number) => void
  onSeekForward: (offset?: number) => void
}

class MediaSessionService {
  private isActive = false
  private currentData: MediaSessionData | null = null

  /**
   * Initialize MediaSession for the Rewind app
   */
  initialize(data: MediaSessionData, handlers: MediaSessionHandlers): void {
    if (!('mediaSession' in navigator)) {
      console.warn('MediaSession API not supported')
      return
    }

    this.currentData = data
    this.isActive = true

    // Set metadata with Rewind branding
    navigator.mediaSession.metadata = new MediaMetadata({
      title: data.title,
      artist: data.artist,
      album: data.album,
      artwork: data.artwork || [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    })

    // Set up action handlers
    navigator.mediaSession.setActionHandler('play', handlers.onPlay)
    navigator.mediaSession.setActionHandler('pause', handlers.onPause)

    navigator.mediaSession.setActionHandler('seekbackward', details => {
      handlers.onSeekBackward(details.seekOffset || 15)
    })

    navigator.mediaSession.setActionHandler('seekforward', details => {
      handlers.onSeekForward(details.seekOffset || 15)
    })

    // Disable track navigation since we don't support playlists yet
    navigator.mediaSession.setActionHandler('previoustrack', null)
    navigator.mediaSession.setActionHandler('nexttrack', null)

    console.log('MediaSession initialized for Rewind')
  }

  /**
   * Update the current media metadata
   */
  updateMetadata(data: MediaSessionData): void {
    if (!this.isActive || !('mediaSession' in navigator)) return

    this.currentData = data
    navigator.mediaSession.metadata = new MediaMetadata({
      title: data.title,
      artist: data.artist,
      album: data.album,
      artwork: data.artwork || [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    })
  }

  /**
   * Update the playback state
   */
  updatePlaybackState(state: 'playing' | 'paused' | 'none'): void {
    if (!this.isActive || !('mediaSession' in navigator)) return

    navigator.mediaSession.playbackState = state
  }

  /**
   * Update the position state for scrubbing support
   */
  updatePositionState(position: number, duration: number, playbackRate = 1): void {
    if (!this.isActive || !('mediaSession' in navigator)) return

    if ('setPositionState' in navigator.mediaSession && duration > 0) {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate,
        position,
      })
    }
  }

  /**
   * Release the MediaSession (cleanup)
   */
  release(): void {
    if (!('mediaSession' in navigator)) return

    this.isActive = false
    this.currentData = null

    // Clear all handlers
    navigator.mediaSession.setActionHandler('play', null)
    navigator.mediaSession.setActionHandler('pause', null)
    navigator.mediaSession.setActionHandler('seekbackward', null)
    navigator.mediaSession.setActionHandler('seekforward', null)
    navigator.mediaSession.setActionHandler('previoustrack', null)
    navigator.mediaSession.setActionHandler('nexttrack', null)

    // Clear metadata and set state to none
    navigator.mediaSession.metadata = null
    navigator.mediaSession.playbackState = 'none'

    console.log('MediaSession released')
  }

  /**
   * Check if MediaSession is currently active
   */
  isMediaSessionActive(): boolean {
    return this.isActive
  }

  /**
   * Get current media data
   */
  getCurrentData(): MediaSessionData | null {
    return this.currentData
  }
}

// Export singleton instance
export const mediaSessionService = new MediaSessionService()
