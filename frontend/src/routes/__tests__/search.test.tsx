import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Search from '../search'

// Mock dependencies
const mockNavigate = vi.fn()
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}))

const mockUseAuth = vi.fn()
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../../context/MediaPlayerContext', () => ({
  useMediaPlayer: () => ({
    playEpisode: vi.fn(),
  }),
}))

// Mock search service
vi.mock('../../services/searchService', () => ({
  SearchService: vi.fn().mockImplementation(() => ({
    searchEpisodes: vi.fn(),
    convertToEpisodeCard: vi.fn(),
  })),
}))

// Mock EpisodeCard component
vi.mock('../../components/EpisodeCard', () => ({
  EpisodeCard: () => <div data-testid="episode-card">Mock Episode Card</div>,
}))

describe('Search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', name: 'Test User' },
      isAuthenticated: true,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders search page title and description', () => {
    render(<Search />)

    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Find episodes and podcasts in your library')).toBeInTheDocument()
  })

  it('renders search input with placeholder', () => {
    render(<Search />)

    const searchInput = screen.getByPlaceholderText('Search episodes or podcasts...')
    expect(searchInput).toBeInTheDocument()
  })

  it('shows empty state when no query is entered', () => {
    render(<Search />)

    expect(screen.getByText('Find your favorite episodes')).toBeInTheDocument()
    expect(screen.getByText('Start typing to search through your podcast library')).toBeInTheDocument()
  })

  it('shows login prompt when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    render(<Search />)

    expect(screen.getByText('Please sign in to search your podcast library')).toBeInTheDocument()
  })
})
