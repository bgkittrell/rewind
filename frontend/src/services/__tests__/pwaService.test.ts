import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { PWAService } from '../pwaService'

// Mock browser APIs
beforeAll(() => {
  Object.defineProperty(global, 'navigator', {
    value: {
      serviceWorker: {
        register: vi.fn().mockResolvedValue({
          addEventListener: vi.fn(),
          update: vi.fn(),
          waiting: null,
        }),
        ready: Promise.resolve({
          addEventListener: vi.fn(),
          update: vi.fn(),
          waiting: null,
        }),
        addEventListener: vi.fn(),
      },
    },
    configurable: true,
  })

  Object.defineProperty(global, 'Notification', {
    value: {
      requestPermission: vi.fn().mockResolvedValue('granted'),
      permission: 'granted',
    },
    configurable: true,
  })

  Object.defineProperty(global, 'window', {
    value: {
      matchMedia: vi.fn().mockReturnValue({
        matches: false,
      }),
      navigator: { standalone: false },
      addEventListener: vi.fn(),
    },
    configurable: true,
  })
})

describe('PWAService', () => {
  let pwaService: PWAService

  beforeEach(() => {
    vi.clearAllMocks()
    pwaService = new PWAService()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('basic functionality', () => {
    it('should create instance without throwing', () => {
      expect(() => new PWAService()).not.toThrow()
    })

    it('should have all required methods', () => {
      expect(typeof pwaService.initialize).toBe('function')
      expect(typeof pwaService.checkForUpdates).toBe('function')
      expect(typeof pwaService.applyUpdate).toBe('function')
      expect(typeof pwaService.onUpdateAvailable).toBe('function')
      expect(typeof pwaService.isUpdateAvailable).toBe('function')
      expect(typeof pwaService.isInstalled).toBe('function')
      expect(typeof pwaService.requestNotificationPermission).toBe('function')
      expect(typeof pwaService.showUpdateNotification).toBe('function')
    })

    it('should initialize without throwing', async () => {
      await expect(pwaService.initialize()).resolves.not.toThrow()
    })

    it('should check for updates without throwing', async () => {
      await expect(pwaService.checkForUpdates()).resolves.not.toThrow()
    })

    it('should apply update without throwing', async () => {
      await expect(pwaService.applyUpdate()).resolves.not.toThrow()
    })

    it('should handle update callback registration', () => {
      const callback = vi.fn()
      expect(() => pwaService.onUpdateAvailable(callback)).not.toThrow()
    })

    it('should return boolean for update availability', () => {
      const result = pwaService.isUpdateAvailable()
      expect(typeof result).toBe('boolean')
    })

    it('should return boolean for installation status', () => {
      const result = pwaService.isInstalled()
      expect(typeof result).toBe('boolean')
    })

    it('should handle notification permission request', async () => {
      const result = await pwaService.requestNotificationPermission()
      expect(typeof result).toBe('boolean')
    })

    it('should handle showing update notification', () => {
      expect(() => pwaService.showUpdateNotification()).not.toThrow()
    })
  })

  describe('error handling', () => {
    it('should handle missing service worker gracefully', async () => {
      // @ts-expect-error - Testing undefined serviceWorker
      global.navigator.serviceWorker = undefined

      await expect(pwaService.initialize()).resolves.not.toThrow()
    })

    it('should handle missing notifications gracefully', async () => {
      // Store original
      const originalNotification = global.Notification

      try {
        // @ts-expect-error - Testing undefined Notification
        delete global.Notification

        const result = await pwaService.requestNotificationPermission()
        expect(result).toBe(false)
      } finally {
        // Restore original
        global.Notification = originalNotification
      }
    })
  })
})
