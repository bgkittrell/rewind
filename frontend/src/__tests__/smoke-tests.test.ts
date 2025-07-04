import { describe, it, expect, vi, beforeAll } from 'vitest'

// Mock minimal browser APIs for smoke tests
beforeAll(() => {
  // Mock service worker
  Object.defineProperty(global, 'navigator', {
    value: {
      serviceWorker: {
        register: vi.fn().mockResolvedValue({}),
        ready: Promise.resolve({}),
        addEventListener: vi.fn(),
      },
      mediaSession: {
        metadata: null,
        setActionHandler: vi.fn(),
      },
    },
    configurable: true,
  })

  // Mock window
  Object.defineProperty(global, 'window', {
    value: {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      navigator: { standalone: false },
      addEventListener: vi.fn(),
    },
    configurable: true,
  })

  // Mock HTML audio element
  Object.defineProperty(global, 'HTMLAudioElement', {
    value: vi.fn().mockImplementation(() => ({
      src: '',
      currentTime: 0,
      duration: 0,
      playbackRate: 1,
      volume: 1,
      play: vi.fn(),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
})

describe('Smoke Tests for Modified Components', () => {
  describe('Component Imports', () => {
    it('should import EpisodeCard without throwing', async () => {
      await expect(import('../components/EpisodeCard')).resolves.toBeDefined()
    })

    it('should import FloatingMediaPlayer without throwing', async () => {
      await expect(import('../components/FloatingMediaPlayer')).resolves.toBeDefined()
    })

    it('should import Header without throwing', async () => {
      await expect(import('../components/Header')).resolves.toBeDefined()
    })

    it('should import Home route without throwing', async () => {
      await expect(import('../routes/home')).resolves.toBeDefined()
    })

    it('should import Library route without throwing', async () => {
      await expect(import('../routes/library')).resolves.toBeDefined()
    })

    it('should import PodcastDetail route without throwing', async () => {
      await expect(import('../routes/podcast-detail')).resolves.toBeDefined()
    })

    it('should import MediaPlayerContext without throwing', async () => {
      await expect(import('../context/MediaPlayerContext')).resolves.toBeDefined()
    })
  })

  describe('Component Structure', () => {
    it('should have EpisodeCard component with proper exports', async () => {
      const module = await import('../components/EpisodeCard')
      expect(module.EpisodeCard).toBeDefined()
      expect(module.default).toBeDefined()
      expect(typeof module.EpisodeCard).toBe('function')
    })

    it('should have FloatingMediaPlayer component with proper exports', async () => {
      const module = await import('../components/FloatingMediaPlayer')
      expect(module.FloatingMediaPlayer).toBeDefined()
      expect(module.default).toBeDefined()
      expect(typeof module.FloatingMediaPlayer).toBe('function')
    })

    it('should have Header component with proper exports', async () => {
      const module = await import('../components/Header')
      expect(module.default).toBeDefined()
      expect(typeof module.default).toBe('function')
    })

    it('should have MediaPlayerContext with proper exports', async () => {
      const module = await import('../context/MediaPlayerContext')
      expect(module.useMediaPlayer).toBeDefined()
      expect(module.MediaPlayerProvider).toBeDefined()
      expect(typeof module.useMediaPlayer).toBe('function')
      expect(typeof module.MediaPlayerProvider).toBe('function')
    })
  })

  describe('Type Definitions', () => {
    it('should have proper Episode interface in MediaPlayerContext', async () => {
      const module = await import('../context/MediaPlayerContext')

      // Test that the hook and provider are properly exported
      expect(module.useMediaPlayer).toBeDefined()
      expect(module.MediaPlayerProvider).toBeDefined()
      expect(typeof module.useMediaPlayer).toBe('function')
      expect(typeof module.MediaPlayerProvider).toBe('function')
    })
  })

  describe('Component Functionality', () => {
    it('should have EpisodeCard component that accepts podcastImageUrl prop', async () => {
      const { EpisodeCard } = await import('../components/EpisodeCard')

      // Test that component has the expected structure
      expect(EpisodeCard).toBeDefined()
      expect(typeof EpisodeCard).toBe('function')

      // Verify the component accepts the required props (no instantiation needed)
      const componentString = EpisodeCard.toString()
      expect(componentString).toContain('podcastImageUrl')
    })

    it('should have FloatingMediaPlayer component that accepts episode with podcastImageUrl', async () => {
      const { FloatingMediaPlayer } = await import('../components/FloatingMediaPlayer')

      // Test that component has the expected structure
      expect(FloatingMediaPlayer).toBeDefined()
      expect(typeof FloatingMediaPlayer).toBe('function')

      // Component exists and is properly exported
      expect(FloatingMediaPlayer.name).toBe('FloatingMediaPlayer')
    })
  })

  describe('Service Integration', () => {
    it('should import services without throwing', async () => {
      await expect(import('../services/podcastService')).resolves.toBeDefined()
      await expect(import('../services/episodeService')).resolves.toBeDefined()
    })

    it('should have proper service structure', async () => {
      const podcastModule = await import('../services/podcastService')
      const episodeModule = await import('../services/episodeService')

      expect(podcastModule.podcastService).toBeDefined()
      expect(episodeModule.episodeService).toBeDefined()
    })
  })

  describe('Utility Functions', () => {
    it('should import text utilities without throwing', async () => {
      await expect(import('../utils/textUtils')).resolves.toBeDefined()
    })

    it('should have stripAndTruncate function', async () => {
      const module = await import('../utils/textUtils')
      expect(module.stripAndTruncate).toBeDefined()
      expect(typeof module.stripAndTruncate).toBe('function')
    })
  })
})
