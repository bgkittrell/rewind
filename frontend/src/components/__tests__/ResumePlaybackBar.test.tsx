import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ResumePlaybackBar } from '../ResumePlaybackBar'
import { ResumeData } from '../../services/resumeService'

describe('ResumePlaybackBar', () => {
  const mockResumeData: ResumeData = {
    episodeId: 'episode-1',
    podcastId: 'podcast-1',
    title: 'Test Episode Title',
    podcastTitle: 'Test Podcast',
    playbackPosition: 150, // 2:30
    duration: 300, // 5:00
    lastPlayed: '2024-01-15T10:30:00Z',
    progressPercentage: 50,
    audioUrl: 'https://example.com/audio.mp3',
    imageUrl: 'https://example.com/image.jpg',
    podcastImageUrl: 'https://example.com/podcast-image.jpg',
  }

  const mockOnResume = vi.fn()
  const mockOnDismiss = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  describe('basic functionality', () => {
    it('should render resume bar with episode information', () => {
      render(<ResumePlaybackBar resumeData={mockResumeData} onResume={mockOnResume} onDismiss={mockOnDismiss} />)

      // Check if basic text content is rendered
      expect(screen.getByText('Test Episode Title')).toBeDefined()
      expect(screen.getByText('Test Podcast')).toBeDefined()
      expect(screen.getByText('2:30 / 5:00')).toBeDefined()
      expect(screen.getByLabelText('Resume playback')).toBeDefined()
      expect(screen.getByLabelText('Dismiss')).toBeDefined()
    })

    it('should call onResume when resume button is clicked', () => {
      render(<ResumePlaybackBar resumeData={mockResumeData} onResume={mockOnResume} onDismiss={mockOnDismiss} />)

      fireEvent.click(screen.getByLabelText('Resume playback'))
      expect(mockOnResume).toHaveBeenCalledTimes(1)
    })

    it('should call onDismiss when dismiss button is clicked', () => {
      render(<ResumePlaybackBar resumeData={mockResumeData} onResume={mockOnResume} onDismiss={mockOnDismiss} />)

      fireEvent.click(screen.getByLabelText('Dismiss'))
      expect(mockOnDismiss).toHaveBeenCalledTimes(1)
    })

    it('should show countdown timer', () => {
      render(<ResumePlaybackBar resumeData={mockResumeData} onResume={mockOnResume} onDismiss={mockOnDismiss} />)

      expect(screen.getByText('Auto-dismissing in 10s')).toBeDefined()
    })

    it('should format time values correctly', () => {
      const dataWithDifferentTimes = {
        ...mockResumeData,
        playbackPosition: 65, // 1:05
        duration: 3661, // 1:01:01
      }

      render(
        <ResumePlaybackBar resumeData={dataWithDifferentTimes} onResume={mockOnResume} onDismiss={mockOnDismiss} />,
      )

      expect(screen.getByText('1:05 / 61:01')).toBeDefined()
    })

    it('should handle zero time values', () => {
      const dataWithZeroValues = {
        ...mockResumeData,
        playbackPosition: 0,
        duration: 0,
      }

      render(<ResumePlaybackBar resumeData={dataWithZeroValues} onResume={mockOnResume} onDismiss={mockOnDismiss} />)

      expect(screen.getByText('0:00 / 0:00')).toBeDefined()
    })

    it('should display episode image when available', () => {
      render(<ResumePlaybackBar resumeData={mockResumeData} onResume={mockOnResume} onDismiss={mockOnDismiss} />)

      const image = screen.getByAltText('Test Podcast artwork')
      expect(image).toBeDefined()
      expect(image.getAttribute('src')).toBe('https://example.com/image.jpg')
    })

    it('should display podcast image when episode image is not available', () => {
      const dataWithoutEpisodeImage = {
        ...mockResumeData,
        imageUrl: undefined,
      }

      render(
        <ResumePlaybackBar resumeData={dataWithoutEpisodeImage} onResume={mockOnResume} onDismiss={mockOnDismiss} />,
      )

      const image = screen.getByAltText('Test Podcast artwork')
      expect(image.getAttribute('src')).toBe('https://example.com/podcast-image.jpg')
    })

    it('should show default icon when no images are available', () => {
      const dataWithoutImages = {
        ...mockResumeData,
        imageUrl: undefined,
        podcastImageUrl: undefined,
      }

      render(<ResumePlaybackBar resumeData={dataWithoutImages} onResume={mockOnResume} onDismiss={mockOnDismiss} />)

      // Should render the IconMusic component as fallback
      expect(screen.getByTestId('music-icon')).toBeDefined()
    })
  })
})
