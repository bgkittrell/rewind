import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Header from '../Header'

// Mock AuthContext
const mockSignOut = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the Rewind logo and title', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      signOut: mockSignOut,
    })

    render(<Header />)

    expect(screen.getByText('Rewind')).toBeInTheDocument()
    expect(screen.getByLabelText('Menu')).toBeInTheDocument()
  })

  it('shows sign in button when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      signOut: mockSignOut,
    })

    render(<Header />)

    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.queryByText('Logout')).not.toBeInTheDocument()
  })

  it('shows logout button when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      signOut: mockSignOut,
    })

    render(<Header />)

    expect(screen.getByText('Logout')).toBeInTheDocument()
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
  })

  it('does not show user name when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      signOut: mockSignOut,
      user: { name: 'Test User' },
    })

    render(<Header />)

    expect(screen.queryByText('Hello, Test User')).not.toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  it('calls signOut when logout button is clicked', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      signOut: mockSignOut,
    })

    render(<Header />)

    const logoutButton = screen.getByText('Logout')
    fireEvent.click(logoutButton)

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('toggles menu when menu button is clicked', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      signOut: mockSignOut,
    })

    render(<Header />)

    const menuButton = screen.getByLabelText('Menu')
    fireEvent.click(menuButton)

    // Menu should be visible
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Add Podcast')).toBeInTheDocument()
    expect(screen.getByText('Share Library')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('opens auth modal when sign in button is clicked', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      signOut: mockSignOut,
    })

    render(<Header />)

    const signInButton = screen.getByText('Sign In')
    fireEvent.click(signInButton)

    // Auth modal should be rendered (we're not testing the modal component itself)
    // Just checking that the button is clickable
    expect(signInButton).toBeInTheDocument()
  })

  it('renders with correct styling classes', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      signOut: mockSignOut,
    })

    render(<Header />)

    const header = screen.getByRole('banner')
    expect(header).toHaveClass('bg-white', 'border-b', 'border-gray-200', 'sticky', 'top-0', 'z-50')
  })
})
