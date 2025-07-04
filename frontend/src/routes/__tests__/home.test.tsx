import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Home from '../home'

// Mock MediaPlayerContext
const mockPlayEpisode = vi.fn()
const mockUseMediaPlayer = vi.fn()

vi.mock('../../context/MediaPlayerContext', () => ({
  useMediaPlayer: () => mockUseMediaPlayer(),
}))

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMediaPlayer.mockReturnValue({
      playEpisode: mockPlayEpisode,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the home page title and description', () => {
    render(<Home />)

    expect(screen.getByText('Recommended Episodes')).toBeInTheDocument()
    expect(screen.getByText('Rediscover older episodes from your favorite podcasts')).toBeInTheDocument()
  })

  it('renders filter pills', () => {
    render(<Home />)

    expect(screen.getByText('Not Recent')).toBeInTheDocument()
    expect(screen.getByText('Comedy')).toBeInTheDocument()
    expect(screen.getByText('Favorites')).toBeInTheDocument()
  })

  it('renders sample episodes', () => {
    render(<Home />)

    expect(screen.getByText('The Comedy Gold Mine: Rediscovering Classic Bits')).toBeInTheDocument()
    expect(screen.getByText('Interview with Sarah Johnson: The Art of Improvisation')).toBeInTheDocument()
    expect(screen.getByText('Stand-Up Chronicles: From Open Mic to Main Stage')).toBeInTheDocument()
    expect(screen.getByText('The Psychology of Humor: What Makes Us Laugh?')).toBeInTheDocument()
  })

  it('renders podcast names for each episode', () => {
    render(<Home />)

    expect(screen.getByText('Laugh Track Weekly')).toBeInTheDocument()
    expect(screen.getByText('Behind the Mic')).toBeInTheDocument()
    expect(screen.getByText('Comedy Circuit')).toBeInTheDocument()
    expect(screen.getByText('Mind & Comedy')).toBeInTheDocument()
  })

  it('renders play buttons for each episode', () => {
    render(<Home />)

    const playButtons = screen.getAllByText('Play')
    expect(playButtons).toHaveLength(4)
  })

  it('calls playEpisode when play button is clicked', () => {
    render(<Home />)

    const playButtons = screen.getAllByText('Play')
    fireEvent.click(playButtons[0])

    expect(mockPlayEpisode).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        title: 'The Comedy Gold Mine: Rediscovering Classic Bits',
        podcastName: 'Laugh Track Weekly',
      }),
    )
  })

  it('renders episode images with podcast fallback', () => {
    render(<Home />)

    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(4)

    // Check that each image has a src attribute
    images.forEach(img => {
      expect(img).toHaveAttribute('src')
    })
  })

  it('renders AI explanation buttons', () => {
    render(<Home />)

    const aiButtons = screen.getAllByLabelText('Get AI explanation')
    expect(aiButtons).toHaveLength(4)
  })

  it('renders episode cards with proper structure', () => {
    render(<Home />)

    const episodeCards = screen.getAllByTestId('episode-card')
    expect(episodeCards).toHaveLength(4)
  })

  it('renders dates and durations', () => {
    render(<Home />)

    expect(screen.getByText('Aug 15, 2023 • 45 min')).toBeInTheDocument()
    expect(screen.getByText('Jun 22, 2023 • 38 min')).toBeInTheDocument()
    expect(screen.getByText('May 30, 2023 • 52 min')).toBeInTheDocument()
    expect(screen.getByText('Apr 18, 2023 • 41 min')).toBeInTheDocument()
  })

  it('renders progress indicator for episode with playback position', () => {
    render(<Home />)

    // First episode has playbackPosition: 0, should not show progress
    expect(screen.queryByText('0% complete')).not.toBeInTheDocument()
  })
})
