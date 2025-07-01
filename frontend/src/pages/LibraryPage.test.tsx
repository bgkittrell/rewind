import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { LibraryPage } from './LibraryPage'
import { PodcastDetailPage } from './PodcastDetailPage'
import { PlayerProvider } from '../context/PlayerContext'

// Mock the PlayerContext
const mockPlayer = {
  state: { currentEpisode: null, isPlaying: false, progress: 0, volume: 1, playbackRate: 1, isExpanded: false },
  loadEpisode: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  togglePlayPause: vi.fn(),
  seek: vi.fn(),
  skipForward: vi.fn(),
  skipBackward: vi.fn(),
  expand: vi.fn(),
  minimize: vi.fn(),
  setVolume: vi.fn(),
  setPlaybackRate: vi.fn(),
}

vi.mock('../context/PlayerContext', () => ({
  PlayerProvider: ({ children }: { children: React.ReactNode }) => children,
  usePlayer: () => mockPlayer,
}))

// Mock IntersectionObserver for infinite scroll
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
})
window.IntersectionObserver = mockIntersectionObserver

describe('Library Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear localStorage before each test
    localStorage.clear()
  })

  it('should navigate from library to podcast detail and back', async () => {
    // Create router with both routes
    const router = createMemoryRouter([
      {
        path: '/library',
        element: <LibraryPage />,
      },
      {
        path: '/library/podcast/:podcastId', 
        element: <PodcastDetailPage />,
      },
    ], {
      initialEntries: ['/library'],
    })

    render(
      <PlayerProvider>
        <RouterProvider router={router} />
      </PlayerProvider>
    )

    // Should start on library page
    expect(screen.getByText('Your Library')).toBeInTheDocument()
    expect(screen.getByText('Browse your podcast subscriptions')).toBeInTheDocument()

    // Find and click on a podcast link
    const podcastLink = screen.getByText('Comedy Central Podcast')
    expect(podcastLink).toBeInTheDocument()
    
    fireEvent.click(podcastLink)

    // Should navigate to podcast detail page
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/library/podcast/comedy-central')
    })

    // Should show podcast detail content
    await waitFor(() => {
      expect(screen.getByText('Comedy Central Podcast')).toBeInTheDocument()
      expect(screen.getByText('The funniest podcast on the internet with hilarious guests and great stories.')).toBeInTheDocument()
    })

    // Find and click the back button
    const backButton = screen.getByRole('link', { name: /back to library/i })
    expect(backButton).toBeInTheDocument()
    
    fireEvent.click(backButton)

    // Should navigate back to library
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/library')
    })

    // Should show library content again
    await waitFor(() => {
      expect(screen.getByText('Your Library')).toBeInTheDocument()
      expect(screen.getByText('Browse your podcast subscriptions')).toBeInTheDocument()
    })
  })

  it('should maintain correct URL state during navigation', async () => {
    const router = createMemoryRouter([
      {
        path: '/library',
        element: <LibraryPage />,
      },
      {
        path: '/library/podcast/:podcastId',
        element: <PodcastDetailPage />,
      },
    ], {
      initialEntries: ['/library'],
    })

    render(
      <PlayerProvider>
        <RouterProvider router={router} />
      </PlayerProvider>
    )

    // Initial URL should be /library
    expect(router.state.location.pathname).toBe('/library')

    // Navigate to podcast detail
    const podcastLink = screen.getByText('Comedy Central Podcast')
    fireEvent.click(podcastLink)

    // URL should change to podcast detail
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/library/podcast/comedy-central')
    })

    // Navigate back
    const backButton = screen.getByRole('link', { name: /back to library/i })
    fireEvent.click(backButton)

    // URL should change back to library
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/library')
    })
  })
})