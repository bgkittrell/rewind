import { describe, it, expect, vi, beforeAll } from 'vitest'

// Mock minimal browser APIs
beforeAll(() => {
  // Mock service worker
  Object.defineProperty(global, 'navigator', {
    value: {
      serviceWorker: {
        register: vi.fn().mockResolvedValue({}),
        ready: Promise.resolve({}),
        addEventListener: vi.fn(),
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

  // Mock Notification
  Object.defineProperty(global, 'Notification', {
    value: {
      requestPermission: vi.fn().mockResolvedValue('granted'),
      permission: 'default',
    },
    configurable: true,
  })
})

describe('Basic Build Tests', () => {
  it('should import PWA service without throwing', async () => {
    await expect(import('../services/pwaService')).resolves.toBeDefined()
  })

  it('should create PWA service instance without throwing', async () => {
    const { PWAService } = await import('../services/pwaService')
    expect(() => new PWAService()).not.toThrow()
  })

  it('should have all required PWA service methods', async () => {
    const { pwaService } = await import('../services/pwaService')

    expect(pwaService).toBeDefined()
    expect(typeof pwaService.initialize).toBe('function')
    expect(typeof pwaService.checkForUpdates).toBe('function')
    expect(typeof pwaService.applyUpdate).toBe('function')
    expect(typeof pwaService.onUpdateAvailable).toBe('function')
    expect(typeof pwaService.isUpdateAvailable).toBe('function')
    expect(typeof pwaService.isInstalled).toBe('function')
  })

  it('should handle basic PWA service operations', async () => {
    const { PWAService } = await import('../services/pwaService')
    const service = new PWAService()

    // These should not throw
    expect(async () => {
      await service.initialize()
      await service.checkForUpdates()
      await service.applyUpdate()
      service.onUpdateAvailable(() => {})
      service.isUpdateAvailable()
      service.isInstalled()
    }).not.toThrow()
  })

  it('should have proper type exports', async () => {
    const module = await import('../services/pwaService')

    expect(module.PWAService).toBeDefined()
    expect(module.pwaService).toBeDefined()
    expect(module.pwaService).toBeInstanceOf(module.PWAService)
  })
})
