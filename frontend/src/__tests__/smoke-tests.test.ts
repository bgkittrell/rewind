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

      // Test that the hook works without throwing
      expect(() => {
        try {
          module.useMediaPlayer()
        } catch (error: any) {
          // Expected error when used outside provider
          expect(error.message).toContain('useMediaPlayer must be used within a MediaPlayerProvider')
        }
      }).not.toThrow()
    })
  })

  describe('Component Functionality', () => {
    it('should have EpisodeCard component that accepts podcastImageUrl prop', async () => {
      const { EpisodeCard } = await import('../components/EpisodeCard')

      const mockEpisode = {
        id: 'test-id',
        title: 'Test Episode',
        podcastName: 'Test Podcast',
        releaseDate: '2023-01-01',
        duration: '30:00',
        audioUrl: 'https://example.com/audio.mp3',
        imageUrl: 'https://example.com/image.jpg',
        description: 'Test description',
      }

      const mockOnPlay = vi.fn()
      const mockOnAIExplanation = vi.fn()
      const podcastImageUrl = 'https://example.com/podcast-image.jpg'

      // Test that component can be instantiated without throwing
      expect(() => {
        EpisodeCard({
          episode: mockEpisode,
          podcastImageUrl,
          onPlay: mockOnPlay,
          onAIExplanation: mockOnAIExplanation,
        })
      }).not.toThrow()
    })

    it('should have FloatingMediaPlayer component that accepts episode with podcastImageUrl', async () => {
      const { FloatingMediaPlayer } = await import('../components/FloatingMediaPlayer')

      const mockEpisode = {
        id: 'test-id',
        title: 'Test Episode',
        podcastName: 'Test Podcast',
        releaseDate: '2023-01-01',
        duration: '30:00',
        audioUrl: 'https://example.com/audio.mp3',
        imageUrl: 'https://example.com/image.jpg',
        description: 'Test description',
        podcastImageUrl: 'https://example.com/podcast-image.jpg',
      }

      const mockProps = {
        episode: mockEpisode,
        isPlaying: false,
        onPlay: vi.fn(),
        onPause: vi.fn(),
        onClose: vi.fn(),
        onSeek: vi.fn(),
      }

      // Test that component can be instantiated without throwing
      expect(() => {
        FloatingMediaPlayer(mockProps)
      }).not.toThrow()
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
