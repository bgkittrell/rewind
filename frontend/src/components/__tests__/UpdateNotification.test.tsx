import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UpdateNotification } from '../UpdateNotification'
import { updateService } from '../../services/updateService'

// Mock the update service
jest.mock('../../services/updateService', () => ({
  updateService: {
    onUpdateReady: jest.fn(),
    applyUpdate: jest.fn(),
  },
}))

const mockUpdateService = updateService as jest.Mocked<typeof updateService>

describe('UpdateNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should not render when no update is available', () => {
    render(<UpdateNotification />)
    expect(screen.queryByText('Update Available')).not.toBeInTheDocument()
  })

  it('should render update notification when update is ready', () => {
    let onUpdateReadyCallback: () => void = () => {}
    mockUpdateService.onUpdateReady.mockImplementation((callback) => {
      onUpdateReadyCallback = callback
    })

    render(<UpdateNotification />)
    
    // Trigger the update ready callback
    onUpdateReadyCallback()

    expect(screen.getByText('Update Available')).toBeInTheDocument()
    expect(screen.getByText('A new version of Rewind is available with improvements and bug fixes.')).toBeInTheDocument()
  })

  it('should handle update success', async () => {
    mockUpdateService.applyUpdate.mockResolvedValue(true)
    
    let onUpdateReadyCallback: () => void = () => {}
    mockUpdateService.onUpdateReady.mockImplementation((callback) => {
      onUpdateReadyCallback = callback
    })

    render(<UpdateNotification />)
    onUpdateReadyCallback()

    const updateButton = screen.getByText('Update Now')
    fireEvent.click(updateButton)

    expect(screen.getByText('Updating...')).toBeInTheDocument()
    expect(updateButton).toBeDisabled()

    await waitFor(() => {
      expect(mockUpdateService.applyUpdate).toHaveBeenCalled()
    })
  })

  it('should handle update failure', async () => {
    const errorMessage = 'Update failed - network error'
    mockUpdateService.applyUpdate.mockRejectedValue(new Error(errorMessage))
    
    let onUpdateReadyCallback: () => void = () => {}
    mockUpdateService.onUpdateReady.mockImplementation((callback) => {
      onUpdateReadyCallback = callback
    })

    render(<UpdateNotification />)
    onUpdateReadyCallback()

    const updateButton = screen.getByText('Update Now')
    fireEvent.click(updateButton)

    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument()
    })

    expect(screen.getByText('Update Now')).toBeInTheDocument() // Should revert back
  })

  it('should dismiss notification and set timeout', () => {
    let onUpdateReadyCallback: () => void = () => {}
    mockUpdateService.onUpdateReady.mockImplementation((callback) => {
      onUpdateReadyCallback = callback
    })

    render(<UpdateNotification />)
    onUpdateReadyCallback()

    expect(screen.getByText('Update Available')).toBeInTheDocument()

    const dismissButton = screen.getByText('Later')
    fireEvent.click(dismissButton)

    expect(screen.queryByText('Update Available')).not.toBeInTheDocument()

    // Fast forward 1 hour
    jest.advanceTimersByTime(60 * 60 * 1000)

    expect(screen.getByText('Update Available')).toBeInTheDocument()
  })

  it('should cleanup timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout')
    
    let onUpdateReadyCallback: () => void = () => {}
    mockUpdateService.onUpdateReady.mockImplementation((callback) => {
      onUpdateReadyCallback = callback
    })

    const { unmount } = render(<UpdateNotification />)
    onUpdateReadyCallback()

    const dismissButton = screen.getByText('Later')
    fireEvent.click(dismissButton)

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
  })
})