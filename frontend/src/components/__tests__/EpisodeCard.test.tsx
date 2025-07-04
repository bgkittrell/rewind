import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EpisodeCard } from '../EpisodeCard'

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
  })

  it('renders episode card with basic information', () => {
    render(<EpisodeCard episode={mockEpisode} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

    expect(screen.getByText('Test Episode')).toBeInTheDocument()
    expect(screen.getByText('Test Podcast')).toBeInTheDocument()
    expect(screen.getByText('Jan 1, 2023 • 30:00')).toBeInTheDocument()
  })

  it('renders episode image when provided', () => {
    render(<EpisodeCard episode={mockEpisode} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

    const image = screen.getByAltText('Test Episode artwork')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg')
  })

  it('renders default icon when no image provided', () => {
    const episodeWithoutImage = { ...mockEpisode, imageUrl: undefined }
    render(<EpisodeCard episode={episodeWithoutImage} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

    const svg = screen.getByTestId('episode-card').querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('calls onPlay when play button is clicked', () => {
    render(<EpisodeCard episode={mockEpisode} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

    const playButton = screen.getByRole('button', { name: 'Play Test Episode' })
    fireEvent.click(playButton)

    expect(mockOnPlay).toHaveBeenCalledWith(mockEpisode)
  })

  it('calls onAIExplanation when AI explanation button is clicked', () => {
    render(<EpisodeCard episode={mockEpisode} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

    const aiButton = screen.getByRole('button', { name: 'Get AI explanation' })
    fireEvent.click(aiButton)

    expect(mockOnAIExplanation).toHaveBeenCalledWith(mockEpisode)
  })

  describe('Progress indicator', () => {
    it('does not show progress indicator when playbackPosition is undefined', () => {
      render(<EpisodeCard episode={mockEpisode} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

      expect(screen.queryByText(/% complete/)).not.toBeInTheDocument()
    })

    it('does not show progress indicator when playbackPosition is 0', () => {
      const episodeWithZeroProgress = { ...mockEpisode, playbackPosition: 0 }
      render(<EpisodeCard episode={episodeWithZeroProgress} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

      expect(screen.queryByText(/% complete/)).not.toBeInTheDocument()
    })

    it('shows correct progress when playbackPosition is provided', () => {
      const episodeWithProgress = { ...mockEpisode, playbackPosition: 25 }
      render(<EpisodeCard episode={episodeWithProgress} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

      expect(screen.getByText('25% complete')).toBeInTheDocument()
    })

    it('shows correct progress bar width when playbackPosition is provided', () => {
      const episodeWithProgress = { ...mockEpisode, playbackPosition: 75 }
      render(<EpisodeCard episode={episodeWithProgress} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

      const progressBar = screen.getByText('75% complete').previousElementSibling?.querySelector('.bg-primary')
      expect(progressBar).toHaveStyle('width: 75%')
    })

    it('handles decimal progress values correctly', () => {
      const episodeWithProgress = { ...mockEpisode, playbackPosition: 33.7 }
      render(<EpisodeCard episode={episodeWithProgress} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

      expect(screen.getByText('34% complete')).toBeInTheDocument()
      const progressBar = screen.getByText('34% complete').previousElementSibling?.querySelector('.bg-primary')
      expect(progressBar).toHaveStyle('width: 33.7%')
    })

    it('handles 100% progress correctly', () => {
      const episodeWithProgress = { ...mockEpisode, playbackPosition: 100 }
      render(<EpisodeCard episode={episodeWithProgress} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

      expect(screen.getByText('100% complete')).toBeInTheDocument()
      const progressBar = screen.getByText('100% complete').previousElementSibling?.querySelector('.bg-primary')
      expect(progressBar).toHaveStyle('width: 100%')
    })

    it('handles edge case progress values', () => {
      const episodeWithProgress = { ...mockEpisode, playbackPosition: 0.1 }
      render(<EpisodeCard episode={episodeWithProgress} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

      expect(screen.getByText('0% complete')).toBeInTheDocument()
      const progressBar = screen.getByText('0% complete').previousElementSibling?.querySelector('.bg-primary')
      expect(progressBar).toHaveStyle('width: 0.1%')
    })
  })

  describe('Date formatting', () => {
    it('formats date correctly', () => {
      const episodeWithDate = { ...mockEpisode, releaseDate: '2023-12-25' }
      render(<EpisodeCard episode={episodeWithDate} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

      expect(screen.getByText('Dec 25, 2023 • 30:00')).toBeInTheDocument()
    })
  })
})