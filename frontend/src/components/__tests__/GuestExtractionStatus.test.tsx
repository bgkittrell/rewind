import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { GuestExtractionStatus } from '../GuestExtractionStatus'
import type { Episode } from '../../types/episode'

const baseEpisode: Episode = {
  episodeId: 'episode-1',
  podcastId: 'podcast-1',
  title: 'Test Episode',
  description: 'Test description',
  audioUrl: 'https://example.com/audio.mp3',
  duration: '45:30',
  releaseDate: '2024-01-15',
  podcastName: 'Test Podcast',
}

describe('GuestExtractionStatus', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders nothing when no status is provided', () => {
    const { container } = render(<GuestExtractionStatus episode={baseEpisode} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders pending status correctly', () => {
    const episode = { ...baseEpisode, guestExtractionStatus: 'pending' as const }
    render(<GuestExtractionStatus episode={episode} />)

    expect(screen.getByText('Guests pending')).toBeInTheDocument()
    expect(screen.getByTitle('Guest extraction is queued for processing')).toBeInTheDocument()
  })

  it('renders processing status correctly', () => {
    const episode = { ...baseEpisode, guestExtractionStatus: 'processing' as const }
    render(<GuestExtractionStatus episode={episode} />)

    expect(screen.getByText('Finding guests...')).toBeInTheDocument()
    expect(screen.getByTitle('AI is analyzing the episode to identify guests')).toBeInTheDocument()
  })

  it('renders completed status with guests', () => {
    const episode = {
      ...baseEpisode,
      guestExtractionStatus: 'completed' as const,
      extractedGuests: ['John Doe', 'Jane Smith'],
      guestExtractionConfidence: 0.85,
    }
    render(<GuestExtractionStatus episode={episode} />)

    expect(screen.getByText('2 guests found')).toBeInTheDocument()
    expect(screen.getByTitle('Guests found: John Doe, Jane Smith (Confidence: 85%)')).toBeInTheDocument()
  })

  it('renders completed status with single guest', () => {
    const episode = {
      ...baseEpisode,
      guestExtractionStatus: 'completed' as const,
      extractedGuests: ['John Doe'],
      guestExtractionConfidence: 0.92,
    }
    render(<GuestExtractionStatus episode={episode} />)

    expect(screen.getByText('1 guest found')).toBeInTheDocument()
    expect(screen.getByTitle('Guests found: John Doe (Confidence: 92%)')).toBeInTheDocument()
  })

  it('renders completed status with no guests', () => {
    const episode = {
      ...baseEpisode,
      guestExtractionStatus: 'completed' as const,
      extractedGuests: [],
      guestExtractionConfidence: 0.75,
    }
    render(<GuestExtractionStatus episode={episode} />)

    expect(screen.getByText('No guests found')).toBeInTheDocument()
    expect(screen.getByTitle('Episode was analyzed but no guests were identified')).toBeInTheDocument()
  })

  it('renders failed status correctly', () => {
    const episode = { ...baseEpisode, guestExtractionStatus: 'failed' as const }
    render(<GuestExtractionStatus episode={episode} />)

    expect(screen.getByText('Guest extraction failed')).toBeInTheDocument()
    expect(screen.getByTitle('Guest extraction failed - this episode may need manual review')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const episode = { ...baseEpisode, guestExtractionStatus: 'pending' as const }
    const { container } = render(<GuestExtractionStatus episode={episode} className="custom-class" />)

    const element = container.querySelector('.custom-class')
    expect(element).toBeInTheDocument()
    expect(element).toHaveClass('custom-class')
  })

  it('has correct color classes for each status', () => {
    const statuses = [
      { status: 'pending' as const, colorClass: 'text-gray-500' },
      { status: 'processing' as const, colorClass: 'text-blue-500' },
      { status: 'completed' as const, colorClass: 'text-green-600' },
      { status: 'failed' as const, colorClass: 'text-red-500' },
    ]

    statuses.forEach(({ status, colorClass }) => {
      const episode = { ...baseEpisode, guestExtractionStatus: status }
      const { container } = render(<GuestExtractionStatus episode={episode} />)
      const textElement = container.querySelector('span')
      expect(textElement).toHaveClass(colorClass)
      cleanup() // Clean up after each iteration
    })
  })
})
