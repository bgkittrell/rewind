import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FloatingMediaPlayer } from '../FloatingMediaPlayer'

// Mock audio element
const mockAudio = {
  src: '',
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  volume: 1,
  play: vi.fn(),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

// Mock HTML audio element
Object.defineProperty(global, 'HTMLAudioElement', {
  value: vi.fn().mockImplementation(() => mockAudio),
})

describe('FloatingMediaPlayer', () => {
  const mockEpisode = {
    episodeId: 'episode-1',
    podcastId: 'podcast-1',
    title: 'Test Episode',
    podcastName: 'Test Podcast',
    releaseDate: '2023-01-01',
    duration: '30:00',
    audioUrl: 'https://example.com/audio.mp3',
    imageUrl: 'https://example.com/image.jpg',
    description: 'Test description',
    podcastImageUrl: 'https://example.com/podcast-image.jpg',
  }

  const mockOnPlay = vi.fn()
  const mockOnPause = vi.fn()
  const mockOnClose = vi.fn()
  const mockOnSeek = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock MediaSession API
    Object.defineProperty(global, 'navigator', {
      value: {
        mediaSession: {
          metadata: null,
          setActionHandler: vi.fn(),
        },
      },
      configurable: true,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders nothing when no episode is provided', () => {
    const { container } = render(
      <FloatingMediaPlayer
        episode={null}
        isPlaying={false}
        onPlay={mockOnPlay}
        onPause={mockOnPause}
        onClose={mockOnClose}
        onSeek={mockOnSeek}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders mini player when episode is provided', () => {
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={mockOnPlay}
        onPause={mockOnPause}
        onClose={mockOnClose}
        onSeek={mockOnSeek}
      />,
    )

    expect(screen.getByTestId('floating-media-player')).toBeInTheDocument()
    expect(screen.getByText('Test Episode')).toBeInTheDocument()
    expect(screen.getByText('Test Podcast')).toBeInTheDocument()
  })

  it('shows episode image when available', () => {
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={mockOnPlay}
        onPause={mockOnPause}
        onClose={mockOnClose}
        onSeek={mockOnSeek}
      />,
    )

    const image = screen.getByAltText('Test Podcast artwork')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg')
  })

  it('shows podcast image when episode image is not available', () => {
    const episodeWithoutImage = { ...mockEpisode, imageUrl: undefined }
    render(
      <FloatingMediaPlayer
        episode={episodeWithoutImage}
        isPlaying={false}
        onPlay={mockOnPlay}
        onPause={mockOnPause}
        onClose={mockOnClose}
        onSeek={mockOnSeek}
      />,
    )

    const image = screen.getByAltText('Test Podcast artwork')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/podcast-image.jpg')
  })

  it('calls onPlay when play button is clicked', () => {
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={mockOnPlay}
        onPause={mockOnPause}
        onClose={mockOnClose}
        onSeek={mockOnSeek}
      />,
    )

    const playButton = screen.getByTestId('mini-play-pause-button')
    fireEvent.click(playButton)

    expect(mockOnPlay).toHaveBeenCalled()
  })

  it('calls onPause when pause button is clicked', () => {
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={true}
        onPlay={mockOnPlay}
        onPause={mockOnPause}
        onClose={mockOnClose}
        onSeek={mockOnSeek}
      />,
    )

    const pauseButton = screen.getByTestId('mini-play-pause-button')
    fireEvent.click(pauseButton)

    expect(mockOnPause).toHaveBeenCalled()
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={mockOnPlay}
        onPause={mockOnPause}
        onClose={mockOnClose}
        onSeek={mockOnSeek}
      />,
    )

    const closeButton = screen.getByTestId('mini-close-player')
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('expands player when expand button is clicked', () => {
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={mockOnPlay}
        onPause={mockOnPause}
        onClose={mockOnClose}
        onSeek={mockOnSeek}
      />,
    )

    const expandButton = screen.getByTestId('expand-player')
    fireEvent.click(expandButton)

    expect(screen.getByTestId('minimize-player')).toBeInTheDocument()
  })

  it('does not show close button in expanded view', () => {
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={mockOnPlay}
        onPause={mockOnPause}
        onClose={mockOnClose}
        onSeek={mockOnSeek}
      />,
    )

    // Expand player
    const expandButton = screen.getByTestId('expand-player')
    fireEvent.click(expandButton)

    // Close button should not be present in expanded view
    expect(screen.queryByTestId('close-player')).not.toBeInTheDocument()
  })

  it('minimizes player when minimize button is clicked in expanded view', () => {
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={mockOnPlay}
        onPause={mockOnPause}
        onClose={mockOnClose}
        onSeek={mockOnSeek}
      />,
    )

    // Expand player
    const expandButton = screen.getByTestId('expand-player')
    fireEvent.click(expandButton)

    // Minimize player
    const minimizeButton = screen.getByTestId('minimize-player')
    fireEvent.click(minimizeButton)

    expect(screen.getByTestId('expand-player')).toBeInTheDocument()
  })

  it('renders audio element', () => {
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={mockOnPlay}
        onPause={mockOnPause}
        onClose={mockOnClose}
        onSeek={mockOnSeek}
      />,
    )

    expect(screen.getByTestId('audio-element')).toBeInTheDocument()
  })

  it('shows skip controls in expanded view', () => {
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={mockOnPlay}
        onPause={mockOnPause}
        onClose={mockOnClose}
        onSeek={mockOnSeek}
      />,
    )

    // Expand player
    const expandButton = screen.getByTestId('expand-player')
    fireEvent.click(expandButton)

    expect(screen.getByTestId('skip-back-button')).toBeInTheDocument()
    expect(screen.getByTestId('skip-forward-button')).toBeInTheDocument()
  })
})
