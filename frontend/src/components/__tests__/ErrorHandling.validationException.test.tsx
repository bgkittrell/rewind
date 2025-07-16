/**
 * Integration test for ValidationException error handling in frontend
 *
 * Tests that the UI properly handles ValidationException errors that were
 * fixed by Bender in the backend. This ensures proper user feedback when
 * DynamoDB validation errors occur.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import { ToastProvider } from '../ui/Toast'
import { ErrorHandler } from '../ui/ErrorHandler'
import { EnhancedUpvoteButton } from '../ui/EnhancedUpvoteButton'
import { recommendationService } from '../../services/recommendationService'

// Mock the recommendation service
vi.mock('../../services/recommendationService', () => ({
  recommendationService: {
    thumbsUp: vi.fn(),
  },
}))

describe('ValidationException Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear any existing toasts
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <ToastProvider>
        <ErrorHandler>{children}</ErrorHandler>
      </ToastProvider>
    </MemoryRouter>
  )

  describe('ValidationException Scenarios', () => {
    it('should handle DynamoDB key schema mismatch errors', async () => {
      // Mock ValidationException for key schema mismatch
      const mockError = new Error('The provided key element does not match the schema')
      mockError.name = 'ValidationException'

      vi.mocked(recommendationService.thumbsUp).mockRejectedValue(mockError)

      render(
        <TestWrapper>
          <EnhancedUpvoteButton episodeId="test-episode-id" />
        </TestWrapper>,
      )

      const upvoteButton = screen.getByTestId('enhanced-upvote-button')
      fireEvent.click(upvoteButton)

      // Wait for error toast to appear
      await waitFor(() => {
        expect(screen.getByText('Data validation error')).toBeInTheDocument()
      })

      // Check that user-friendly message is shown
      expect(
        screen.getByText('There was a problem with the episode data. Our team has been notified.'),
      ).toBeInTheDocument()

      // Check that retry button is present
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    it('should handle DynamoDB empty set errors', async () => {
      // Mock ValidationException for empty set error
      const mockError = new Error('Pass a non-empty set, or options.convertEmptyValues=true')
      mockError.name = 'ValidationException'

      vi.mocked(recommendationService.thumbsUp).mockRejectedValue(mockError)

      render(
        <TestWrapper>
          <EnhancedUpvoteButton episodeId="test-episode-id" />
        </TestWrapper>,
      )

      const upvoteButton = screen.getByTestId('enhanced-upvote-button')
      fireEvent.click(upvoteButton)

      // Wait for error toast to appear
      await waitFor(() => {
        expect(screen.getByText('Data processing error')).toBeInTheDocument()
      })

      // Check that user-friendly message is shown
      expect(screen.getByText('There was a problem processing your request. Please try again.')).toBeInTheDocument()

      // Check that retry button is present
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    it('should handle rate limit ValidationException errors', async () => {
      // Mock ValidationException for rate limit error
      const mockError = new Error('RateLimitService ValidationException: Too many requests')
      mockError.name = 'ValidationException'

      vi.mocked(recommendationService.thumbsUp).mockRejectedValue(mockError)

      render(
        <TestWrapper>
          <EnhancedUpvoteButton episodeId="test-episode-id" />
        </TestWrapper>,
      )

      const upvoteButton = screen.getByTestId('enhanced-upvote-button')
      fireEvent.click(upvoteButton)

      // Wait for error toast to appear
      await waitFor(() => {
        expect(screen.getByText('Rate limit error')).toBeInTheDocument()
      })

      // Check that user-friendly message is shown
      expect(screen.getByText('Too many requests. Please wait a moment and try again.')).toBeInTheDocument()

      // Check that retry button is present
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    it('should handle episode fetch ValidationException errors', async () => {
      // Mock ValidationException for episode fetch error
      const mockError = new Error('Failed to fetch episode: ValidationException')
      mockError.name = 'ValidationException'

      vi.mocked(recommendationService.thumbsUp).mockRejectedValue(mockError)

      render(
        <TestWrapper>
          <EnhancedUpvoteButton episodeId="test-episode-id" />
        </TestWrapper>,
      )

      const upvoteButton = screen.getByTestId('enhanced-upvote-button')
      fireEvent.click(upvoteButton)

      // Wait for error toast to appear
      await waitFor(() => {
        expect(screen.getByText('Episode not found')).toBeInTheDocument()
      })

      // Check that user-friendly message is shown
      expect(screen.getByText('The episode could not be found. It may have been removed.')).toBeInTheDocument()

      // Check that retry button is present
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  describe('Silent Failure Detection', () => {
    it('should detect silent failure when backend returns success but operation failed', async () => {
      // Mock successful response but with silent failure indicators
      const mockResponse = {
        message: 'Success',
        updated: true,
        guestAnalyticsCreated: false, // This indicates silent failure
        warning: 'ValidationException occurred but was handled',
      }

      vi.mocked(recommendationService.thumbsUp).mockResolvedValue(mockResponse)

      render(
        <TestWrapper>
          <EnhancedUpvoteButton episodeId="test-episode-id" />
        </TestWrapper>,
      )

      const upvoteButton = screen.getByTestId('enhanced-upvote-button')
      fireEvent.click(upvoteButton)

      // Wait for error toast to appear (silent failure should be detected)
      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })

      // Check that button is not marked as upvoted for silent failure
      expect(upvoteButton).not.toHaveTextContent('Upvoted')
      expect(upvoteButton).toHaveTextContent('Up')
    })

    it('should not detect silent failure for successful operations', async () => {
      // Mock successful response with no failure indicators
      const mockResponse = {
        message: 'Success',
        updated: true,
        guestAnalyticsCreated: true,
        episodeRecord: { id: 'test-episode-id' },
      }

      vi.mocked(recommendationService.thumbsUp).mockResolvedValue(mockResponse)

      render(
        <TestWrapper>
          <EnhancedUpvoteButton episodeId="test-episode-id" />
        </TestWrapper>,
      )

      const upvoteButton = screen.getByTestId('enhanced-upvote-button')
      fireEvent.click(upvoteButton)

      // Wait for success toast to appear
      await waitFor(() => {
        expect(screen.getByText('Episode liked!')).toBeInTheDocument()
      })

      // Check that button is marked as upvoted
      await waitFor(() => {
        expect(upvoteButton).toHaveTextContent('Upvoted')
      })
    })
  })

  describe('Error Recovery', () => {
    it('should allow retry after ValidationException error', async () => {
      // First call fails with ValidationException
      const mockError = new Error('ValidationException: key element does not match the schema')
      mockError.name = 'ValidationException'

      vi.mocked(recommendationService.thumbsUp).mockRejectedValueOnce(mockError).mockResolvedValueOnce({
        message: 'Success',
        updated: true,
        guestAnalyticsCreated: true,
      })

      render(
        <TestWrapper>
          <EnhancedUpvoteButton episodeId="test-episode-id" />
        </TestWrapper>,
      )

      const upvoteButton = screen.getByTestId('enhanced-upvote-button')
      fireEvent.click(upvoteButton)

      // Wait for error toast to appear
      await waitFor(() => {
        expect(screen.getByText('Data validation error')).toBeInTheDocument()
      })

      // Click retry button
      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)

      // Click upvote button again
      fireEvent.click(upvoteButton)

      // Wait for success toast to appear
      await waitFor(() => {
        expect(screen.getByText('Episode liked!')).toBeInTheDocument()
      })

      // Check that button is now marked as upvoted
      await waitFor(() => {
        expect(upvoteButton).toHaveTextContent('Upvoted')
      })
    })
  })

  describe('User Feedback', () => {
    it('should provide proper loading states during upvote', async () => {
      // Mock delayed response
      vi.mocked(recommendationService.thumbsUp).mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  message: 'Success',
                  updated: true,
                  guestAnalyticsCreated: true,
                }),
              100,
            ),
          ),
      )

      render(
        <TestWrapper>
          <EnhancedUpvoteButton episodeId="test-episode-id" />
        </TestWrapper>,
      )

      const upvoteButton = screen.getByTestId('enhanced-upvote-button')
      fireEvent.click(upvoteButton)

      // Check loading state
      expect(upvoteButton).toHaveAttribute('disabled')
      expect(screen.getByTestId('enhanced-upvote-button')).toHaveClass('opacity-50')

      // Wait for completion and success state
      await waitFor(() => {
        expect(upvoteButton).toHaveTextContent('Upvoted')
        expect(upvoteButton).toHaveAttribute('disabled')
      })
    })

    it('should disable button after successful upvote', async () => {
      // Mock successful response
      vi.mocked(recommendationService.thumbsUp).mockResolvedValue({
        message: 'Success',
        updated: true,
        guestAnalyticsCreated: true,
      })

      render(
        <TestWrapper>
          <EnhancedUpvoteButton episodeId="test-episode-id" />
        </TestWrapper>,
      )

      const upvoteButton = screen.getByTestId('enhanced-upvote-button')
      fireEvent.click(upvoteButton)

      // Wait for success and button state change
      await waitFor(() => {
        expect(upvoteButton).toHaveTextContent('Upvoted')
        expect(upvoteButton).toHaveAttribute('disabled')
      })
    })

    it('should call onUpvote callback with correct success status', async () => {
      const mockOnUpvote = vi.fn()

      // Mock ValidationException error
      const mockError = new Error('ValidationException: key element does not match the schema')
      mockError.name = 'ValidationException'
      vi.mocked(recommendationService.thumbsUp).mockRejectedValue(mockError)

      render(
        <TestWrapper>
          <EnhancedUpvoteButton episodeId="test-episode-id" onUpvote={mockOnUpvote} />
        </TestWrapper>,
      )

      const upvoteButton = screen.getByTestId('enhanced-upvote-button')
      fireEvent.click(upvoteButton)

      // Wait for error handling
      await waitFor(() => {
        expect(mockOnUpvote).toHaveBeenCalledWith('test-episode-id', false)
      })
    })
  })

  describe('Error Logging', () => {
    it('should log ValidationException errors with context', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock ValidationException error
      const mockError = new Error('ValidationException: key element does not match the schema')
      mockError.name = 'ValidationException'
      vi.mocked(recommendationService.thumbsUp).mockRejectedValue(mockError)

      render(
        <TestWrapper>
          <EnhancedUpvoteButton episodeId="test-episode-id" />
        </TestWrapper>,
      )

      const upvoteButton = screen.getByTestId('enhanced-upvote-button')
      fireEvent.click(upvoteButton)

      // Wait for error handling
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Frontend Error:',
          expect.objectContaining({
            name: 'ValidationException',
            message: 'ValidationException: key element does not match the schema',
            context: expect.objectContaining({
              operation: 'upvote',
              episodeId: 'test-episode-id',
            }),
          }),
        )
      })

      consoleSpy.mockRestore()
    })
  })
})
