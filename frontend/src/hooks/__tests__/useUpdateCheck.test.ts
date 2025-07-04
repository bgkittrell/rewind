import { renderHook, act } from '@testing-library/react'
import { useUpdateCheck } from '../useUpdateCheck'
import { updateService } from '../../services/updateService'

// Mock the update service
jest.mock('../../services/updateService', () => ({
  updateService: {
    initialize: jest.fn(),
    checkForUpdates: jest.fn(),
    getUpdateStatus: jest.fn(),
  },
}))

const mockUpdateService = updateService as jest.Mocked<typeof updateService>

describe('useUpdateCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateService.getUpdateStatus.mockReturnValue({
      updateAvailable: false,
      registration: null,
      wb: null,
    })
  })

  it('should initialize update service on mount', () => {
    renderHook(() => useUpdateCheck())
    
    expect(mockUpdateService.initialize).toHaveBeenCalled()
  })

  it('should return update status', () => {
    const mockStatus = {
      updateAvailable: true,
      registration: { test: 'registration' },
      wb: { test: 'workbox' },
    }
    mockUpdateService.getUpdateStatus.mockReturnValue(mockStatus as any)
    
    const { result } = renderHook(() => useUpdateCheck())
    
    expect(result.current).toEqual(mockStatus)
  })

  it('should handle update service initialization error', () => {
    mockUpdateService.initialize.mockImplementation(() => {
      throw new Error('Initialization failed')
    })
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    renderHook(() => useUpdateCheck())
    
    expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize update service:', expect.any(Error))
    
    consoleSpy.mockRestore()
  })

  it('should check for updates periodically', () => {
    jest.useFakeTimers()
    
    renderHook(() => useUpdateCheck())
    
    // Initially called once during initialization
    expect(mockUpdateService.checkForUpdates).toHaveBeenCalledTimes(1)
    
    // Advance time by 5 minutes
    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000)
    })
    
    expect(mockUpdateService.checkForUpdates).toHaveBeenCalledTimes(2)
    
    // Advance time by another 5 minutes
    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000)
    })
    
    expect(mockUpdateService.checkForUpdates).toHaveBeenCalledTimes(3)
    
    jest.useRealTimers()
  })

  it('should cleanup interval on unmount', () => {
    jest.useFakeTimers()
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    
    const { unmount } = renderHook(() => useUpdateCheck())
    
    unmount()
    
    expect(clearIntervalSpy).toHaveBeenCalled()
    
    jest.useRealTimers()
  })
})