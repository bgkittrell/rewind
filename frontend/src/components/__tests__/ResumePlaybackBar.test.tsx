import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
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
  })

  describe('rendering', () => {
    it('should render resume bar with episode information', () => {
      render(
        <ResumePlaybackBar
          resumeData={mockResumeData}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByText('Test Episode Title')).toBeInTheDocument()
      expect(screen.getByText('Test Podcast')).toBeInTheDocument()
      expect(screen.getByText('2:30 / 5:00')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Resume playback' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
    })

    it('should display episode image when available', () => {
      render(
        <ResumePlaybackBar
          resumeData={mockResumeData}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      const image = screen.getByAltText('Test Podcast artwork')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg')
    })

    it('should display podcast image when episode image is not available', () => {
      const dataWithoutEpisodeImage = {
        ...mockResumeData,
        imageUrl: undefined,
      }

      render(
        <ResumePlaybackBar
          resumeData={dataWithoutEpisodeImage}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      const image = screen.getByAltText('Test Podcast artwork')
      expect(image).toHaveAttribute('src', 'https://example.com/podcast-image.jpg')
    })

    it('should show default icon when no images are available', () => {
      const dataWithoutImages = {
        ...mockResumeData,
        imageUrl: undefined,
        podcastImageUrl: undefined,
      }

      render(
        <ResumePlaybackBar
          resumeData={dataWithoutImages}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      // Should render the IconMusic component as fallback
      expect(screen.getByTestId('music-icon')).toBeInTheDocument()
    })

    it('should display correct progress percentage', () => {
      render(
        <ResumePlaybackBar
          resumeData={mockResumeData}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveStyle({ width: '50%' })
    })
  })

  describe('interactions', () => {
    it('should call onResume when resume button is clicked', () => {
      render(
        <ResumePlaybackBar
          resumeData={mockResumeData}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Resume playback' }))
      expect(mockOnResume).toHaveBeenCalledTimes(1)
    })

    it('should call onDismiss when dismiss button is clicked', () => {
      render(
        <ResumePlaybackBar
          resumeData={mockResumeData}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
      expect(mockOnDismiss).toHaveBeenCalledTimes(1)
    })

    it('should hide the component when resume button is clicked', () => {
      render(
        <ResumePlaybackBar
          resumeData={mockResumeData}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      const resumeButton = screen.getByRole('button', { name: 'Resume playback' })
      fireEvent.click(resumeButton)

      expect(screen.queryByText('Test Episode Title')).not.toBeInTheDocument()
    })

    it('should hide the component when dismiss button is clicked', () => {
      render(
        <ResumePlaybackBar
          resumeData={mockResumeData}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      const dismissButton = screen.getByRole('button', { name: 'Dismiss' })
      fireEvent.click(dismissButton)

      expect(screen.queryByText('Test Episode Title')).not.toBeInTheDocument()
    })
  })

  describe('auto-dismiss countdown', () => {
    it('should show countdown timer', () => {
      render(
        <ResumePlaybackBar
          resumeData={mockResumeData}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByText('Auto-dismissing in 10s')).toBeInTheDocument()
    })

    it('should countdown every second', async () => {
      render(
        <ResumePlaybackBar
          resumeData={mockResumeData}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByText('Auto-dismissing in 10s')).toBeInTheDocument()

      // Advance timer by 1 second
      vi.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Auto-dismissing in 9s')).toBeInTheDocument()
      })

      // Advance timer by another second
      vi.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Auto-dismissing in 8s')).toBeInTheDocument()
      })
    })

    it('should auto-dismiss after 10 seconds and call onDismiss', async () => {
      render(
        <ResumePlaybackBar
          resumeData={mockResumeData}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      // Advance timer by 10 seconds
      vi.advanceTimersByTime(10000)

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalledTimes(1)
        expect(screen.queryByText('Test Episode Title')).not.toBeInTheDocument()
      })
    })

    it('should not auto-dismiss if manually dismissed before countdown', async () => {
      render(
        <ResumePlaybackBar
          resumeData={mockResumeData}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      // Manually dismiss after 5 seconds
      vi.advanceTimersByTime(5000)
      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

      // Advance another 5 seconds (should be 10 total)
      vi.advanceTimersByTime(5000)

      // onDismiss should only be called once (from manual dismiss)
      expect(mockOnDismiss).toHaveBeenCalledTimes(1)
    })

    it('should not auto-dismiss if resumed before countdown', async () => {
      render(
        <ResumePlaybackBar
          resumeData={mockResumeData}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      // Resume after 5 seconds
      vi.advanceTimersByTime(5000)
      fireEvent.click(screen.getByRole('button', { name: 'Resume playback' }))

      // Advance another 5 seconds (should be 10 total)
      vi.advanceTimersByTime(5000)

      // onDismiss should not be called, only onResume
      expect(mockOnResume).toHaveBeenCalledTimes(1)
      expect(mockOnDismiss).not.toHaveBeenCalled()
    })
  })

  describe('time formatting', () => {
    it('should format seconds correctly', () => {
      const dataWithDifferentTimes = {
        ...mockResumeData,
        playbackPosition: 65, // 1:05
        duration: 3661, // 1:01:01
      }

      render(
        <ResumePlaybackBar
          resumeData={dataWithDifferentTimes}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByText('1:05 / 61:01')).toBeInTheDocument()
    })

    it('should handle zero values', () => {
      const dataWithZeroValues = {
        ...mockResumeData,
        playbackPosition: 0,
        duration: 0,
      }

      render(
        <ResumePlaybackBar
          resumeData={dataWithZeroValues}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByText('0:00 / 0:00')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <ResumePlaybackBar
          resumeData={mockResumeData}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByRole('button', { name: 'Resume playback' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
    })

    it('should have proper alt text for images', () => {
      render(
        <ResumePlaybackBar
          resumeData={mockResumeData}
          onResume={mockOnResume}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByAltText('Test Podcast artwork')).toBeInTheDocument()
    })
  })
})