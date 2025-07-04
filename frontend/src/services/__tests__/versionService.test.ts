import { VersionService } from '../versionService'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock caches API
global.caches = {
  keys: jest.fn(),
  delete: jest.fn(),
} as any

// Mock import.meta.env
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_APP_VERSION: '2.0.0',
  },
})

describe('VersionService', () => {
  let versionService: VersionService

  beforeEach(() => {
    jest.clearAllMocks()
    versionService = new VersionService()
  })

  describe('constructor', () => {
    it('should initialize with current version from environment', () => {
      expect(versionService.getCurrentVersion()).toBe('2.0.0')
    })

    it('should fallback to default version when env var is not set', () => {
      const originalEnv = import.meta.env.VITE_APP_VERSION
      delete (import.meta.env as any).VITE_APP_VERSION
      
      const service = new VersionService()
      
      expect(service.getCurrentVersion()).toBe('1.0.0')
      
      // Restore
      ;(import.meta.env as any).VITE_APP_VERSION = originalEnv
    })

    it('should load last known version from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('1.5.0')
      
      const service = new VersionService()
      
      expect(service.getLastKnownVersion()).toBe('1.5.0')
      expect(localStorageMock.getItem).toHaveBeenCalledWith('app-version')
    })
  })

  describe('initialize', () => {
    it('should store current version in localStorage', () => {
      versionService.initialize()
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('app-version', '2.0.0')
    })

    it('should handle version change when last known version exists', () => {
      localStorageMock.getItem.mockReturnValue('1.0.0')
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      const service = new VersionService()
      service.initialize()
      
      expect(consoleSpy).toHaveBeenCalledWith('App updated from 1.0.0 to 2.0.0')
      
      consoleSpy.mockRestore()
    })

    it('should clear caches on major version change', async () => {
      localStorageMock.getItem.mockReturnValue('1.0.0')
      ;(global.caches.keys as jest.Mock).mockResolvedValue([
        'workbox-precache-v1',
        'runtime-cache-v1',
        'some-other-cache'
      ])
      ;(global.caches.delete as jest.Mock).mockResolvedValue(true)
      
      const service = new VersionService()
      service.initialize()
      
      // Wait for async cache operations
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(global.caches.keys).toHaveBeenCalled()
      expect(global.caches.delete).toHaveBeenCalledWith('workbox-precache-v1')
      expect(global.caches.delete).toHaveBeenCalledWith('runtime-cache-v1')
      expect(global.caches.delete).not.toHaveBeenCalledWith('some-other-cache')
    })
  })

  describe('isFirstRun', () => {
    it('should return true when no last known version exists', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const service = new VersionService()
      
      expect(service.isFirstRun()).toBe(true)
    })

    it('should return false when last known version exists', () => {
      localStorageMock.getItem.mockReturnValue('1.0.0')
      
      const service = new VersionService()
      
      expect(service.isFirstRun()).toBe(false)
    })
  })

  describe('isMajorVersionChange', () => {
    it('should detect major version changes', () => {
      const service = versionService as any
      
      expect(service.isMajorVersionChange('1.0.0', '2.0.0')).toBe(true)
      expect(service.isMajorVersionChange('1.5.0', '2.0.0')).toBe(true)
      expect(service.isMajorVersionChange('1.0.0', '1.1.0')).toBe(false)
      expect(service.isMajorVersionChange('1.0.0', '1.0.1')).toBe(false)
    })
  })

  describe('clearOldCaches', () => {
    it('should clear workbox and runtime caches', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      ;(global.caches.keys as jest.Mock).mockResolvedValue([
        'workbox-precache-v1',
        'runtime-cache-v1',
        'api-cache',
        'some-other-cache'
      ])
      ;(global.caches.delete as jest.Mock).mockResolvedValue(true)
      
      const service = versionService as any
      await service.clearOldCaches()
      
      expect(global.caches.delete).toHaveBeenCalledWith('workbox-precache-v1')
      expect(global.caches.delete).toHaveBeenCalledWith('runtime-cache-v1')
      expect(global.caches.delete).not.toHaveBeenCalledWith('api-cache')
      expect(global.caches.delete).not.toHaveBeenCalledWith('some-other-cache')
      expect(consoleSpy).toHaveBeenCalledWith('Old caches cleared')
      
      consoleSpy.mockRestore()
    })

    it('should handle cache clearing errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      ;(global.caches.keys as jest.Mock).mockRejectedValue(new Error('Cache API error'))
      
      const service = versionService as any
      await service.clearOldCaches()
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear old caches:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })
})