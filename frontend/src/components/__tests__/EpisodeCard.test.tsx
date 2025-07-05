import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import { EpisodeCard } from '../EpisodeCard'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Helper function to render components with router context
const renderWithRouter = (component: React.ReactElement) => {
  return render(<MemoryRouter>{component}</MemoryRouter>)
}

describe('EpisodeCard', () => {
  const mockEpisode = {
    id: 'episode-1',
    title: 'Test Episode',
    podcastName: 'Test Podcast',
    releaseDate: '2023-01-01',
    duration: '30:00',
    audioUrl: 'https://example.com/audio.mp3',
    imageUrl: 'https://example.com/image.jpg',
    description: 'Test description',
  }

  const mockOnPlay = vi.fn()
  const mockOnAIExplanation = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders episode card with basic information', () => {
    renderWithRouter(<EpisodeCard episode={mockEpisode} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

    expect(screen.getByText('Test Episode')).toBeInTheDocument()
    expect(screen.getByText('Test Podcast')).toBeInTheDocument()
    expect(screen.getByText('Jan 1, 2023 • 30:00')).toBeInTheDocument()
  })

  it('renders episode image when provided', () => {
    renderWithRouter(<EpisodeCard episode={mockEpisode} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

    const image = screen.getByAltText('Test Episode artwork')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg')
  })

  it('renders podcast image when episode image is not provided', () => {
    const episodeWithoutImage = { ...mockEpisode, imageUrl: undefined }
    const podcastImageUrl = 'https://example.com/podcast-image.jpg'
    renderWithRouter(
      <EpisodeCard
        episode={episodeWithoutImage}
        podcastImageUrl={podcastImageUrl}
        onPlay={mockOnPlay}
        onAIExplanation={mockOnAIExplanation}
      />,
    )

    const image = screen.getByAltText('Test Episode artwork')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', podcastImageUrl)
  })

  it('renders default icon when no image provided', () => {
    const episodeWithoutImage = { ...mockEpisode, imageUrl: undefined }
    renderWithRouter(
      <EpisodeCard episode={episodeWithoutImage} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />,
    )

    const episodeCard = screen.getByTestId('episode-card')
    const svg = episodeCard.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('prioritizes episode image over podcast image', () => {
    const podcastImageUrl = 'https://example.com/podcast-image.jpg'
    renderWithRouter(
      <EpisodeCard
        episode={mockEpisode}
        podcastImageUrl={podcastImageUrl}
        onPlay={mockOnPlay}
        onAIExplanation={mockOnAIExplanation}
      />,
    )

    const image = screen.getByAltText('Test Episode artwork')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg')
  })

  it('calls onPlay when play button is clicked', () => {
    renderWithRouter(<EpisodeCard episode={mockEpisode} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

    const playButton = screen.getByLabelText('Play Test Episode')
    fireEvent.click(playButton)

    expect(mockOnPlay).toHaveBeenCalledWith(mockEpisode)
  })

  it('calls onAIExplanation when AI explanation button is clicked', () => {
    renderWithRouter(<EpisodeCard episode={mockEpisode} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

    const aiButton = screen.getByLabelText('Get AI explanation')
    fireEvent.click(aiButton)

    expect(mockOnAIExplanation).toHaveBeenCalledWith(mockEpisode)
  })

  it('navigates to episode detail page when episode card is clicked', () => {
    renderWithRouter(<EpisodeCard episode={mockEpisode} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

    const episodeCard = screen.getByTestId('episode-card')
    fireEvent.click(episodeCard)

    expect(mockNavigate).toHaveBeenCalledWith('/episode/episode-1')
  })

  it('does not navigate when action buttons are clicked', () => {
    renderWithRouter(<EpisodeCard episode={mockEpisode} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

    const playButton = screen.getByLabelText('Play Test Episode')
    fireEvent.click(playButton)

    expect(mockNavigate).not.toHaveBeenCalled()
    expect(mockOnPlay).toHaveBeenCalledWith(mockEpisode)
  })

  describe('Progress indicator', () => {
    it('does not show progress indicator when playbackPosition is undefined', () => {
      renderWithRouter(<EpisodeCard episode={mockEpisode} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

      expect(screen.queryByText(/% complete/)).not.toBeInTheDocument()
    })

    it('does not show progress indicator when playbackPosition is 0', () => {
      const episodeWithZeroProgress = { ...mockEpisode, playbackPosition: 0 }
      renderWithRouter(
        <EpisodeCard episode={episodeWithZeroProgress} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />,
      )

      expect(screen.queryByText(/% complete/)).not.toBeInTheDocument()
    })

    it('shows correct progress when playbackPosition is provided', () => {
      const episodeWithProgress = { ...mockEpisode, playbackPosition: 25 }
      renderWithRouter(
        <EpisodeCard episode={episodeWithProgress} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />,
      )

      expect(screen.getByText('25% complete')).toBeInTheDocument()
    })

    it('shows correct progress bar width when playbackPosition is provided', () => {
      const episodeWithProgress = { ...mockEpisode, playbackPosition: 75 }
      renderWithRouter(
        <EpisodeCard episode={episodeWithProgress} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />,
      )

      const progressBar = screen.getByText('75% complete').previousElementSibling?.querySelector('.bg-primary')
      expect(progressBar).toHaveStyle('width: 75%')
    })

    it('handles decimal progress values correctly', () => {
      const episodeWithProgress = { ...mockEpisode, playbackPosition: 33.7 }
      renderWithRouter(
        <EpisodeCard episode={episodeWithProgress} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />,
      )

      expect(screen.getByText('34% complete')).toBeInTheDocument()
      const progressBar = screen.getByText('34% complete').previousElementSibling?.querySelector('.bg-primary')
      expect(progressBar).toHaveStyle('width: 33.7%')
    })

    it('handles 100% progress correctly', () => {
      const episodeWithProgress = { ...mockEpisode, playbackPosition: 100 }
      renderWithRouter(
        <EpisodeCard episode={episodeWithProgress} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />,
      )

      expect(screen.getByText('100% complete')).toBeInTheDocument()
      const progressBar = screen.getByText('100% complete').previousElementSibling?.querySelector('.bg-primary')
      expect(progressBar).toHaveStyle('width: 100%')
    })

    it('handles edge case progress values', () => {
      const episodeWithProgress = { ...mockEpisode, playbackPosition: 0.1 }
      renderWithRouter(
        <EpisodeCard episode={episodeWithProgress} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />,
      )

      expect(screen.getByText('0% complete')).toBeInTheDocument()
      const progressBar = screen.getByText('0% complete').previousElementSibling?.querySelector('.bg-primary')
      expect(progressBar).toHaveStyle('width: 0.1%')
    })
  })

  describe('Date formatting', () => {
    it('formats date correctly', () => {
      const episodeWithDate = { ...mockEpisode, releaseDate: '2023-12-25' }
      renderWithRouter(
        <EpisodeCard episode={episodeWithDate} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />,
      )

      expect(screen.getByText('Dec 25, 2023 • 30:00')).toBeInTheDocument()
    })
  })
})
