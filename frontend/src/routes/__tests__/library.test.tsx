import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Library from '../library'

// Mock dependencies
const mockNavigate = vi.fn()
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}))

const mockUseAuth = vi.fn()
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock podcastService
vi.mock('../../services/podcastService', () => ({
  podcastService: {
    getPodcasts: vi.fn(),
    deletePodcast: vi.fn(),
  },
}))

// Mock episodeService
vi.mock('../../services/episodeService', () => ({
  episodeService: {
    syncEpisodes: vi.fn(),
  },
}))

describe('Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders library title and description', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { name: 'Test User' },
    })

    render(<Library />)

    expect(screen.getByText('Your Library')).toBeInTheDocument()
    expect(screen.getByText('Manage your podcast subscriptions')).toBeInTheDocument()
  })

  it('shows loading state when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
    })

    render(<Library />)

    expect(screen.getByText('Checking authentication...')).toBeInTheDocument()
  })

  it('shows error message when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    })

    render(<Library />)

    expect(screen.getByText('Please sign in to view your library')).toBeInTheDocument()
  })

  it('shows add podcast button when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { name: 'Test User' },
    })

    render(<Library />)

    expect(screen.getByText('Add Podcast')).toBeInTheDocument()
  })

  it('renders with correct structure for authenticated user', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { name: 'Test User' },
    })

    render(<Library />)

    expect(screen.getByText('Your Library')).toBeInTheDocument()
    expect(screen.getByText('Add Podcast')).toBeInTheDocument()
  })
})
