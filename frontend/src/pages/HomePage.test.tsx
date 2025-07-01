import { render, screen } from '@testing-library/react'
import { HomePage } from './HomePage'
import { PlayerProvider } from '../context/PlayerContext'

// Mock audio for tests
global.Audio = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  load: vi.fn(),
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
}))

describe('HomePage', () => {
  it('renders recommended episodes', () => {
    render(
      <PlayerProvider>
        <HomePage />
      </PlayerProvider>,
    )
    expect(screen.getByText('Recommended for You')).toBeInTheDocument()
  })

  it('shows filter buttons', () => {
    render(
      <PlayerProvider>
        <HomePage />
      </PlayerProvider>,
    )
    expect(screen.getByText('Not Recently Heard')).toBeInTheDocument()
    expect(screen.getByText('Favorites')).toBeInTheDocument()
    expect(screen.getByText('Favorite Guests')).toBeInTheDocument()
  })
})
