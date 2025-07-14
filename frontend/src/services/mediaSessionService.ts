import type { Episode } from '../types/episode'

export class MediaSessionService {
  private static instance: MediaSessionService

  static getInstance(): MediaSessionService {
    if (!MediaSessionService.instance) {
      MediaSessionService.instance = new MediaSessionService()
    }
    return MediaSessionService.instance
  }

  isSupported(): boolean {
    return 'mediaSession' in navigator
  }

  setMetadata(episode: Episode): void {
    if (!this.isSupported()) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: episode.title,
      artist: episode.podcastName,
      album: 'Rewind',
      artwork: episode.imageUrl
        ? [
            { src: episode.imageUrl, sizes: '96x96', type: 'image/png' },
            { src: episode.imageUrl, sizes: '128x128', type: 'image/png' },
            { src: episode.imageUrl, sizes: '192x192', type: 'image/png' },
            { src: episode.imageUrl, sizes: '256x256', type: 'image/png' },
            { src: episode.imageUrl, sizes: '384x384', type: 'image/png' },
            { src: episode.imageUrl, sizes: '512x512', type: 'image/png' },
          ]
        : undefined,
    })
  }

  setActionHandlers(handlers: {
    play?: () => void
    pause?: () => void
    seekbackward?: () => void
    seekforward?: () => void
    seekto?: (details: { seekTime: number }) => void
    previoustrack?: () => void
    nexttrack?: () => void
  }): void {
    if (!this.isSupported()) return

    // Clear existing handlers
    this.clearActionHandlers()

    // Set new handlers
    Object.entries(handlers).forEach(([action, handler]) => {
      if (handler) {
        navigator.mediaSession.setActionHandler(action as any, handler as any)
      }
    })
  }

  clearActionHandlers(): void {
    if (!this.isSupported()) return

    const actions = ['play', 'pause', 'seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack'] as const

    actions.forEach(action => {
      try {
        navigator.mediaSession.setActionHandler(action, null)
      } catch (error) {
        console.warn(`Failed to clear ${action} handler:`, error)
      }
    })
  }

  setPositionState(duration: number, currentTime: number, playbackRate: number = 1): void {
    if (!this.isSupported() || !navigator.mediaSession.setPositionState) return

    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate,
        position: currentTime,
      })
    } catch (error) {
      console.warn('Failed to set position state:', error)
    }
  }
}

export const mediaSessionService = MediaSessionService.getInstance()
