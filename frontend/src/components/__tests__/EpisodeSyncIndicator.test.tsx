import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { EpisodeSyncIndicator } from '../EpisodeSyncIndicator'
import { SyncStatus } from '../../hooks/useEpisodeSyncStatus'

describe('EpisodeSyncIndicator', () => {
  afterEach(() => {
    cleanup()
  })

  const baseSyncStatus: SyncStatus = {
    podcastId: 'test-podcast-id',
    syncStatus: 'idle',
    episodeCount: 10,
  }

  describe('Rendering', () => {
    it('renders nothing when syncStatus is null', () => {
      const { container } = render(<EpisodeSyncIndicator syncStatus={null} />)
      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when syncStatus is idle', () => {
      const syncStatus = { ...baseSyncStatus, syncStatus: 'idle' as const }
      const { container } = render(<EpisodeSyncIndicator syncStatus={syncStatus} />)
      expect(container.firstChild).toBeNull()
    })

    it('applies custom className', () => {
      const syncStatus = { ...baseSyncStatus, syncStatus: 'queued' as const }
      const { container } = render(<EpisodeSyncIndicator syncStatus={syncStatus} className="custom-class" />)
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('Queued Status', () => {
    it('renders queued status correctly', () => {
      const syncStatus = { ...baseSyncStatus, syncStatus: 'queued' as const }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} />)

      expect(screen.getByText('Queued for sync')).toBeInTheDocument()

      // Check for blue indicator
      const container = screen.getByText('Queued for sync').closest('div')?.parentElement
      expect(container).toHaveClass('bg-blue-50', 'border-blue-200')
    })

    it('shows blue clock icon for queued status', () => {
      const syncStatus = { ...baseSyncStatus, syncStatus: 'queued' as const }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} />)

      // Check for clock icon (SVG)
      const clockIcon = screen.getByText('Queued for sync').closest('div')?.parentElement?.querySelector('svg')
      expect(clockIcon).toBeInTheDocument()
      expect(clockIcon).toHaveClass('w-4', 'h-4')
    })
  })

  describe('Processing Status', () => {
    it('renders processing status correctly', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'processing' as const,
        startedAt: '2024-01-01T11:00:00Z',
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} />)

      expect(screen.getByText('Syncing episodes...')).toBeInTheDocument()

      // Check for yellow indicator
      const container = screen.getByText('Syncing episodes...').closest('div')?.parentElement
      expect(container).toHaveClass('bg-yellow-50', 'border-yellow-200')
    })

    it('shows yellow animated spinner for processing status', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'processing' as const,
        startedAt: '2024-01-01T11:00:00Z',
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} />)

      // Check for yellow spinning div
      const spinner = screen
        .getByText('Syncing episodes...')
        .closest('div')
        ?.parentElement?.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveClass('w-4', 'h-4', 'border-2', 'border-yellow-300', 'border-t-yellow-600', 'rounded-full')
    })

    it('shows start time when showDetails is true', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'processing' as const,
        startedAt: '2024-01-01T11:00:00Z',
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} showDetails={true} />)

      expect(screen.getByText(/Started/)).toBeInTheDocument()
      expect(screen.getByText(/\d{1,2}:\d{2} [AP]M/)).toBeInTheDocument()
    })
  })

  describe('Completed Status', () => {
    it.skip('renders completed status correctly', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'completed' as const,
        completedAt: '2024-01-01T12:00:00Z',
        episodeCount: 25,
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} />)

      expect(screen.getByText('Sync completed')).toBeInTheDocument()
      expect(screen.getByText('25 episodes synced')).toBeInTheDocument()
      expect(screen.getByTitle('Episode sync completed successfully')).toBeInTheDocument()

      // Check for green indicator
      const indicator = screen.getByRole('status')
      expect(indicator).toHaveClass('bg-green-50', 'border-green-200')
    })

    it.skip('shows check icon for completed status', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'completed' as const,
        completedAt: '2024-01-01T12:00:00Z',
        episodeCount: 25,
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} />)

      const checkIcon = screen.getByLabelText('Completed')
      expect(checkIcon).toHaveClass('text-green-500')
    })

    it.skip('shows completion time when showDetails is true', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'completed' as const,
        startedAt: '2024-01-01T11:00:00Z',
        completedAt: '2024-01-01T12:00:00Z',
        episodeCount: 25,
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} showDetails={true} />)

      expect(screen.getByText(/Completed/)).toBeInTheDocument()
      expect(screen.getByText(/\d{1,2}:\d{2} [AP]M/)).toBeInTheDocument()
    })

    it.skip('handles zero episode count', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'completed' as const,
        completedAt: '2024-01-01T12:00:00Z',
        episodeCount: 0,
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} />)

      expect(screen.getByText('0 episodes synced')).toBeInTheDocument()
    })
  })

  describe('Failed Status', () => {
    it.skip('renders failed status correctly', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'failed' as const,
        error: 'RSS feed parsing failed',
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} />)

      expect(screen.getByText('Sync failed')).toBeInTheDocument()
      expect(screen.getByTitle('Episode sync failed: RSS feed parsing failed')).toBeInTheDocument()

      // Check for red indicator
      const indicator = screen.getByRole('status')
      expect(indicator).toHaveClass('bg-red-50', 'border-red-200')
    })

    it.skip('shows error icon for failed status', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'failed' as const,
        error: 'RSS feed parsing failed',
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} />)

      const errorIcon = screen.getByLabelText('Error')
      expect(errorIcon).toHaveClass('text-red-500')
    })

    it.skip('shows error message when showDetails is true', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'failed' as const,
        error: 'RSS feed parsing failed',
        startedAt: '2024-01-01T11:00:00Z',
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} showDetails={true} />)

      expect(screen.getByText(/Error:/)).toBeInTheDocument()
      expect(screen.getByText('RSS feed parsing failed')).toBeInTheDocument()
    })

    it.skip('handles failed status without error message', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'failed' as const,
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} />)

      expect(screen.getByText('Sync failed')).toBeInTheDocument()
      expect(screen.getByTitle('Episode sync failed')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it.skip('shows loading indicator when isLoading is true', () => {
      const syncStatus = { ...baseSyncStatus, syncStatus: 'queued' as const }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} isLoading={true} />)

      // Should show loading spinner in addition to status
      const spinners = screen.getAllByLabelText('Loading')
      expect(spinners).toHaveLength(1)
    })

    it.skip('shows loading with different status', () => {
      const syncStatus = { ...baseSyncStatus, syncStatus: 'processing' as const }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} isLoading={true} />)

      expect(screen.getByText('Syncing episodes...')).toBeInTheDocument()
      expect(screen.getByLabelText('Loading')).toBeInTheDocument()
    })
  })

  describe('Error Display', () => {
    it.skip('shows error message when error prop is provided', () => {
      const syncStatus = { ...baseSyncStatus, syncStatus: 'queued' as const }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} error="Network connection failed" showDetails={true} />)

      expect(screen.getByText(/Error:/)).toBeInTheDocument()
      expect(screen.getByText('Network connection failed')).toBeInTheDocument()
    })

    it.skip('prioritizes syncStatus error over error prop', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'failed' as const,
        error: 'RSS feed error',
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} error="Network error" showDetails={true} />)

      expect(screen.getByText('RSS feed error')).toBeInTheDocument()
      expect(screen.queryByText('Network error')).not.toBeInTheDocument()
    })
  })

  describe('Time Formatting', () => {
    it.skip('formats times correctly for different timezones', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'completed' as const,
        startedAt: '2024-01-01T16:30:00Z',
        completedAt: '2024-01-01T16:45:00Z',
        episodeCount: 10,
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} showDetails={true} />)

      // Times should be formatted in local timezone
      expect(screen.getByText(/4:30 PM|4:45 PM/)).toBeInTheDocument()
    })

    it('handles invalid dates gracefully', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'completed' as const,
        startedAt: 'invalid-date',
        completedAt: '2024-01-01T12:00:00Z',
        episodeCount: 5,
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} showDetails={true} />)

      // Should still render without crashing
      expect(screen.getByText('Sync completed')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'processing' as const,
        startedAt: '2024-01-01T11:00:00Z',
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} />)

      const indicator = screen.getByRole('status')
      expect(indicator).toHaveAttribute('aria-live', 'polite')
    })

    it.skip('provides proper title tooltips', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'processing' as const,
        startedAt: '2024-01-01T11:00:00Z',
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} />)

      expect(screen.getByTitle('Processing episodes from RSS feed')).toBeInTheDocument()
    })

    it('has proper icon labels', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'completed' as const,
        completedAt: '2024-01-01T12:00:00Z',
        episodeCount: 15,
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} />)

      expect(screen.getByLabelText('Sync completed')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive classes', () => {
      const syncStatus = {
        ...baseSyncStatus,
        syncStatus: 'processing' as const,
        startedAt: '2024-01-01T11:00:00Z',
      }
      render(<EpisodeSyncIndicator syncStatus={syncStatus} />)

      const indicator = screen.getByRole('status')
      // Should have responsive padding and text size classes
      expect(indicator).toHaveClass('p-3', 'text-sm')
    })
  })
})
