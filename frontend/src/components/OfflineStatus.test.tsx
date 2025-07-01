import { render, screen } from '@testing-library/react'
import { OfflineStatus } from './OfflineStatus'
import { useOfflineStatus } from '../hooks/useOfflineStatus'

// Mock the useOfflineStatus hook
vi.mock('../hooks/useOfflineStatus')

const mockUseOfflineStatus = vi.mocked(useOfflineStatus)

describe('OfflineStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when online and no queued requests', () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      queueSize: 0,
      queueRequest: vi.fn(),
      clearQueue: vi.fn(),
    })

    const { container } = render(<OfflineStatus />)
    expect(container.firstChild).toBeNull()
  })

  it('shows offline message when offline', () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: false,
      queueSize: 0,
      queueRequest: vi.fn(),
      clearQueue: vi.fn(),
    })

    render(<OfflineStatus />)
    expect(screen.getByText(/You're offline/)).toBeInTheDocument()
    expect(screen.getByText(/Changes will sync when reconnected/)).toBeInTheDocument()
  })

  it('shows queue size when online with queued requests', () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      queueSize: 3,
      queueRequest: vi.fn(),
      clearQueue: vi.fn(),
    })

    render(<OfflineStatus />)
    expect(screen.getByText(/3 requests queued/)).toBeInTheDocument()
    expect(screen.getByText(/Syncing when online/)).toBeInTheDocument()
  })

  it('shows singular form for one queued request', () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      queueSize: 1,
      queueRequest: vi.fn(),
      clearQueue: vi.fn(),
    })

    render(<OfflineStatus />)
    expect(screen.getByText(/1 request queued/)).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    mockUseOfflineStatus.mockReturnValue({
      isOnline: false,
      queueSize: 0,
      queueRequest: vi.fn(),
      clearQueue: vi.fn(),
    })

    render(<OfflineStatus />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })
})
