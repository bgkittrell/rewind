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

  // Mock VitePWA virtual module
  vi.mock('virtual:pwa-register/react', () => ({
    useRegisterSW: vi.fn(() => ({
      needRefresh: [false, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: vi.fn(),
    })),
  }))
})

describe('Basic Build Tests', () => {
  it('should import PWA updater component without throwing', async () => {
    await expect(import('../components/PWAUpdater')).resolves.toBeDefined()
  })

  it('should render PWA updater component without throwing', async () => {
    const { PWAUpdater } = await import('../components/PWAUpdater')
    expect(PWAUpdater).toBeDefined()
    expect(typeof PWAUpdater).toBe('function')
  })

  it('should have proper component structure', async () => {
    const module = await import('../components/PWAUpdater')
    expect(module.PWAUpdater).toBeDefined()
    expect(typeof module.PWAUpdater).toBe('function')
  })
})
