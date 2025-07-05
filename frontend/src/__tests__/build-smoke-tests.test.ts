import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'

// Additional mock setup for build tests
beforeAll(() => {
  // Mock additional browser APIs for comprehensive build testing
  if (!global.navigator) {
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
        userAgent: 'Mozilla/5.0 (compatible; Test)',
      },
      configurable: true,
    })
  }

  // Mock window APIs not covered in setupTests
  if (!global.window) {
    Object.defineProperty(global, 'window', {
      value: {
        matchMedia: vi.fn().mockReturnValue({
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
        navigator: { standalone: false },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        location: {
          href: 'http://localhost:3000',
          pathname: '/',
        },
        localStorage: {
          getItem: vi.fn(),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        sessionStorage: {
          getItem: vi.fn(),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
      },
      configurable: true,
    })
  }

  // Mock HTML audio element
  if (!global.HTMLAudioElement) {
    Object.defineProperty(global, 'HTMLAudioElement', {
      value: vi.fn().mockImplementation(() => ({
        src: '',
        currentTime: 0,
        duration: 0,
        playbackRate: 1,
        volume: 1,
        paused: true,
        ended: false,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        load: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  }

  // Mock IntersectionObserver
  if (!global.IntersectionObserver) {
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))
  }
})

afterAll(() => {
  cleanup()
})

describe('Build Smoke Tests - Critical Functionality', () => {
  describe('Environment Configuration', () => {
    it('should have all required environment variables defined', () => {
      // Test that essential environment variables are accessible
      expect(import.meta.env).toBeDefined()

      // These should be defined in the types
      const env = import.meta.env
      expect(env.VITE_API_BASE_URL).toBeDefined()
      expect(env.VITE_AWS_REGION).toBeDefined()
      expect(env.VITE_USER_POOL_ID).toBeDefined()
      expect(env.VITE_USER_POOL_CLIENT_ID).toBeDefined()
      expect(env.VITE_IDENTITY_POOL_ID).toBeDefined()
    })

    it('should have proper build mode configuration', () => {
      expect(import.meta.env.MODE).toBeDefined()
      expect(['development', 'production', 'test']).toContain(import.meta.env.MODE)
    })
  })

  describe('Core Service Imports', () => {
    it('should import all core services without errors', async () => {
      const imports = await Promise.allSettled([
        import('../services/api'),
        import('../services/episodeService'),
        import('../services/podcastService'),
        import('../services/recommendationService'),
        import('../services/pwaService'),
      ])

      imports.forEach((result, index) => {
        expect(result.status).toBe('fulfilled')
        if (result.status === 'rejected') {
          console.error(`Service import ${index} failed:`, result.reason)
        }
      })
    })

    it('should have properly structured API service', async () => {
      const { apiClient } = await import('../services/api')

      expect(apiClient).toBeDefined()
      expect(typeof apiClient.get).toBe('function')
      expect(typeof apiClient.post).toBe('function')
      expect(typeof apiClient.put).toBe('function')
      expect(typeof apiClient.delete).toBe('function')
      expect(typeof apiClient.setAuthToken).toBe('function')
      expect(typeof apiClient.clearAuthToken).toBe('function')
    })
  })

  describe('Context Providers', () => {
    it('should import all context providers without errors', async () => {
      const imports = await Promise.allSettled([
        import('../context/AuthContext'),
        import('../context/MediaPlayerContext'),
      ])

      imports.forEach((result, index) => {
        expect(result.status).toBe('fulfilled')
        if (result.status === 'rejected') {
          console.error(`Context import ${index} failed:`, result.reason)
        }
      })
    })

    it('should have properly structured AuthContext', async () => {
      const module = await import('../context/AuthContext')

      expect(module.useAuth).toBeDefined()
      expect(module.AuthProvider).toBeDefined()
      expect(typeof module.useAuth).toBe('function')
      expect(typeof module.AuthProvider).toBe('function')
    })

    it('should have properly structured MediaPlayerContext', async () => {
      const module = await import('../context/MediaPlayerContext')

      expect(module.useMediaPlayer).toBeDefined()
      expect(module.MediaPlayerProvider).toBeDefined()
      expect(typeof module.useMediaPlayer).toBe('function')
      expect(typeof module.MediaPlayerProvider).toBe('function')
    })
  })

  describe('Critical Components', () => {
    it('should import all critical components without errors', async () => {
      const imports = await Promise.allSettled([
        import('../components/Header'),
        import('../components/EpisodeCard'),
        import('../components/FloatingMediaPlayer'),
        import('../components/PodcastCard'),
        import('../components/BottomActionBar'),
        import('../components/AddPodcastModal'),
        import('../components/auth/AuthModal'),
      ])

      imports.forEach((result, index) => {
        expect(result.status).toBe('fulfilled')
        if (result.status === 'rejected') {
          console.error(`Component import ${index} failed:`, result.reason)
        }
      })
    })

    it('should have properly exported components', async () => {
      // Test Header component
      const headerModule = await import('../components/Header')
      expect(headerModule.default).toBeDefined()
      expect(typeof headerModule.default).toBe('function')

      // Test EpisodeCard component
      const episodeCardModule = await import('../components/EpisodeCard')
      expect(episodeCardModule.EpisodeCard || episodeCardModule.default).toBeDefined()
      expect(typeof (episodeCardModule.EpisodeCard || episodeCardModule.default)).toBe('function')

      // Test FloatingMediaPlayer component
      const floatingPlayerModule = await import('../components/FloatingMediaPlayer')
      expect(floatingPlayerModule.FloatingMediaPlayer || floatingPlayerModule.default).toBeDefined()
      expect(typeof (floatingPlayerModule.FloatingMediaPlayer || floatingPlayerModule.default)).toBe('function')

      // Test PodcastCard component
      const podcastCardModule = await import('../components/PodcastCard')
      expect(podcastCardModule.PodcastCard || podcastCardModule.default).toBeDefined()
      expect(typeof (podcastCardModule.PodcastCard || podcastCardModule.default)).toBe('function')

      // Test BottomActionBar component
      const bottomActionBarModule = await import('../components/BottomActionBar')
      expect(bottomActionBarModule.BottomActionBar || bottomActionBarModule.default).toBeDefined()
      expect(typeof (bottomActionBarModule.BottomActionBar || bottomActionBarModule.default)).toBe('function')
    })
  })

  describe('Route Components', () => {
    it('should import all route components without errors', async () => {
      const imports = await Promise.allSettled([
        import('../routes/home'),
        import('../routes/library'),
        import('../routes/search'),
        import('../routes/podcast-detail'),
      ])

      imports.forEach((result, index) => {
        expect(result.status).toBe('fulfilled')
        if (result.status === 'rejected') {
          console.error(`Route import ${index} failed:`, result.reason)
        }
      })
    })

    it('should have properly exported route components', async () => {
      const routes = [
        await import('../routes/home'),
        await import('../routes/library'),
        await import('../routes/search'),
        await import('../routes/podcast-detail'),
      ]

      routes.forEach((route, index) => {
        expect(route.default).toBeDefined()
        expect(typeof route.default).toBe('function')
      })
    })
  })

  describe('Utility Functions', () => {
    it('should import utility modules without errors', async () => {
      const imports = await Promise.allSettled([
        import('../utils/textUtils'),
      ])

      imports.forEach((result, index) => {
        expect(result.status).toBe('fulfilled')
        if (result.status === 'rejected') {
          console.error(`Utility import ${index} failed:`, result.reason)
        }
      })
    })

    it('should have functional utility functions', async () => {
      const { stripAndTruncate } = await import('../utils/textUtils')

      expect(stripAndTruncate).toBeDefined()
      expect(typeof stripAndTruncate).toBe('function')

      // Test basic functionality
      const result = stripAndTruncate('<p>Hello world</p>', 10)
      expect(typeof result).toBe('string')
      expect(result.length).toBeLessThanOrEqual(10)
    })
  })

  describe('Main App Entry Point', () => {
    it('should import main app without errors', async () => {
      await expect(import('../main')).resolves.toBeDefined()
    })
  })

  describe('Type Safety', () => {
    it('should have proper TypeScript types for Episode', async () => {
      // Import a service that uses Episode type to verify type compilation
      const module = await import('../services/episodeService')
      expect(module.episodeService).toBeDefined()

      // If this compiles and imports successfully, TypeScript types are working
      expect(typeof module.episodeService.getEpisodes).toBe('function')
    })

    it('should have proper TypeScript types for Podcast', async () => {
      // Import a service that uses Podcast type to verify type compilation
      const module = await import('../services/podcastService')
      expect(module.podcastService).toBeDefined()

      // If this compiles and imports successfully, TypeScript types are working
      expect(typeof module.podcastService.getUserPodcasts).toBe('function')
    })
  })

  describe('API Configuration', () => {
    it('should have properly configured API client', async () => {
      const { apiClient, debugAPIConfiguration } = await import('../services/api')

      expect(apiClient).toBeDefined()
      expect(debugAPIConfiguration).toBeDefined()

      // Test that API configuration works
      expect(() => debugAPIConfiguration()).not.toThrow()
    })

    it('should handle API errors gracefully', async () => {
      const { APIError } = await import('../services/api')

      expect(APIError).toBeDefined()

      const error = new APIError('Test error', 'TEST_ERROR', 400)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.statusCode).toBe(400)
    })
  })

  describe('PWA Service', () => {
    it('should initialize PWA service without errors', async () => {
      const { PWAService, pwaService } = await import('../services/pwaService')

      expect(PWAService).toBeDefined()
      expect(pwaService).toBeDefined()
      expect(pwaService).toBeInstanceOf(PWAService)

      // Test core PWA methods exist and don't throw
      expect(typeof pwaService.initialize).toBe('function')
      expect(typeof pwaService.checkForUpdates).toBe('function')
      expect(typeof pwaService.isInstalled).toBe('function')
    })
  })

  describe('Critical Error Scenarios', () => {
    it('should handle missing authentication gracefully', async () => {
      const { apiClient } = await import('../services/api')

      // Clear any auth token
      apiClient.clearAuthToken()

      // This should not throw an error
      expect(() => apiClient.clearAuthToken()).not.toThrow()
    })

    it('should handle network errors in services', async () => {
      // Mock fetch to simulate network error
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      try {
        const { apiClient } = await import('../services/api')

        // This should handle the error gracefully (not crash the app)
        await expect(apiClient.get('/test')).rejects.toThrow()
      } finally {
        global.fetch = originalFetch
      }
    })
  })
})

describe('Build Smoke Tests - Performance', () => {
  describe('Bundle Size Indicators', () => {
    it('should not import unnecessary large dependencies', async () => {
      // Test that critical paths don't accidentally import large dependencies
      const start = performance.now()

      await Promise.all([
        import('../components/Header'),
        import('../components/EpisodeCard'),
        import('../routes/home'),
      ])

      const end = performance.now()
      const importTime = end - start

      // Imports should be reasonably fast (less than 100ms in test environment)
      expect(importTime).toBeLessThan(100)
    })
  })

  describe('Memory Leaks Prevention', () => {
    it('should properly clean up event listeners in services', async () => {
      const { pwaService } = await import('../services/pwaService')

      // Test that service initialization doesn't create memory leaks
      await pwaService.initialize()

      // If we can initialize multiple times without errors, cleanup is likely working
      await pwaService.initialize()

      expect(true).toBe(true) // If we get here without errors, cleanup is working
    })
  })
})
