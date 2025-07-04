import { UpdateService } from '../updateService'

// Mock workbox-window
jest.mock('workbox-window', () => ({
  Workbox: jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn(),
    register: jest.fn(),
    messageSkipWaiting: jest.fn(),
  })),
}))

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn(),
  },
  writable: true,
})

describe('UpdateService', () => {
  let updateService: UpdateService

  beforeEach(() => {
    updateService = new UpdateService()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('initialize', () => {
    it('should initialize service worker when supported', async () => {
      const mockWb = {
        addEventListener: jest.fn(),
        register: jest.fn().mockResolvedValue({}),
        messageSkipWaiting: jest.fn(),
      }

      const WorkboxMock = require('workbox-window').Workbox
      WorkboxMock.mockImplementation(() => mockWb)

      await updateService.initialize()

      expect(WorkboxMock).toHaveBeenCalledWith('/sw.js')
      expect(mockWb.addEventListener).toHaveBeenCalledWith('installed', expect.any(Function))
      expect(mockWb.addEventListener).toHaveBeenCalledWith('waiting', expect.any(Function))
      expect(mockWb.addEventListener).toHaveBeenCalledWith('controlling', expect.any(Function))
      expect(mockWb.register).toHaveBeenCalled()
    })

    it('should handle service worker registration failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const mockWb = {
        addEventListener: jest.fn(),
        register: jest.fn().mockRejectedValue(new Error('Registration failed')),
        messageSkipWaiting: jest.fn(),
      }

      const WorkboxMock = require('workbox-window').Workbox
      WorkboxMock.mockImplementation(() => mockWb)

      await updateService.initialize()

      expect(consoleSpy).toHaveBeenCalledWith('Service Worker registration failed:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('checkForUpdates', () => {
    it('should throttle update checks', async () => {
      const mockRegistration = {
        update: jest.fn().mockResolvedValue(undefined),
      }

      // Set up the service with a mock registration
      const service = updateService as any
      service.registration = mockRegistration

      // First call should go through
      await updateService.checkForUpdates()
      expect(mockRegistration.update).toHaveBeenCalledTimes(1)

      // Second call within throttle period should be skipped
      await updateService.checkForUpdates()
      expect(mockRegistration.update).toHaveBeenCalledTimes(1)

      // Advance time beyond throttle period
      jest.advanceTimersByTime(61 * 1000) // 61 seconds

      // Third call should go through
      await updateService.checkForUpdates()
      expect(mockRegistration.update).toHaveBeenCalledTimes(2)
    })

    it('should prevent concurrent update checks', async () => {
      const mockRegistration = {
        update: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))),
      }

      const service = updateService as any
      service.registration = mockRegistration

      // Start two concurrent update checks
      const promise1 = updateService.checkForUpdates()
      const promise2 = updateService.checkForUpdates()

      await Promise.all([promise1, promise2])

      // Only one should have been executed
      expect(mockRegistration.update).toHaveBeenCalledTimes(1)
    })

    it('should handle update check failures', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const mockRegistration = {
        update: jest.fn().mockRejectedValue(new Error('Update check failed')),
      }

      const service = updateService as any
      service.registration = mockRegistration

      await updateService.checkForUpdates()

      expect(consoleSpy).toHaveBeenCalledWith('Update check failed:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('applyUpdate', () => {
    it('should apply update when available', async () => {
      const mockWb = {
        messageSkipWaiting: jest.fn(),
      }

      const service = updateService as any
      service.wb = mockWb
      service.updateAvailable = true

      const result = await updateService.applyUpdate()

      expect(result).toBe(true)
      expect(mockWb.messageSkipWaiting).toHaveBeenCalled()
    })

    it('should return false when no update available', async () => {
      const service = updateService as any
      service.updateAvailable = false

      const result = await updateService.applyUpdate()

      expect(result).toBe(false)
    })
  })

  describe('onUpdateReady', () => {
    it('should register callback for update ready events', () => {
      const callback = jest.fn()
      updateService.onUpdateReady(callback)

      const service = updateService as any
      expect(service.onUpdateCallback).toBe(callback)
    })
  })

  describe('getUpdateStatus', () => {
    it('should return current update status', () => {
      const service = updateService as any
      service.updateAvailable = true
      service.registration = { test: 'registration' }
      service.wb = { test: 'workbox' }

      const status = updateService.getUpdateStatus()

      expect(status).toEqual({
        updateAvailable: true,
        registration: { test: 'registration' },
        wb: { test: 'workbox' },
      })
    })
  })
})