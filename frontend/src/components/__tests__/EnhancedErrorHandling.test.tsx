/**
 * Enhanced Error Handling Tests for ValidationException scenarios
 *
 * Tests the improved error handling and user feedback mechanisms
 * Validates both explicit errors and silent failure detection
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react'
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
    thumbsDown: vi.fn(),
    submitFeedback: vi.fn(),
  },
}))

describe('Enhanced Error Handling for ValidationException', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  const renderWithErrorHandler = (component: React.ReactElement) => {
    return render(
      <MemoryRouter>
        <ToastProvider>
          <ErrorHandler>{component}</ErrorHandler>
        </ToastProvider>
      </MemoryRouter>,
    )
  }

  describe('ValidationException Error Handling', () => {
    it('should show user-friendly error message for key schema validation error', async () => {
      // ===== PHASE 1: Setup ValidationException =====
      const validationError = new Error('ValidationException: The provided key element does not match the schema')
      validationError.name = 'ValidationException'

      vi.mocked(recommendationService.thumbsUp).mockRejectedValue(validationError)

      // ===== PHASE 2: Render Enhanced Component =====
      renderWithErrorHandler(<EnhancedUpvoteButton episodeId="test-episode-123" />)

      // ===== PHASE 3: Simulate User Interaction =====
      const upvoteButton = screen.getByTestId('enhanced-upvote-button')
      expect(upvoteButton).toHaveTextContent('Up')

      await act(async () => {
        fireEvent.click(upvoteButton)
      })

      // ===== PHASE 4: Verify Error Handling =====
      expect(recommendationService.thumbsUp).toHaveBeenCalledWith('test-episode-123', {
        source: 'enhanced-upvote-button',
        timestamp: expect.any(String),
      })

      // ===== PHASE 5: Verify User Feedback =====
      await waitFor(() => {
        // Should show user-friendly error message
        expect(screen.getByText('Data validation error')).toBeInTheDocument()
        expect(
          screen.getByText('There was a problem with the episode data. Our team has been notified.'),
        ).toBeInTheDocument()
      })

      // ===== PHASE 6: Verify UI State =====
      expect(upvoteButton).not.toHaveClass('bg-green-100')
      expect(upvoteButton).toHaveTextContent('Up')
    })

    it('should handle empty set DynamoDB error with specific message', async () => {
      // ===== PHASE 1: Setup Empty Set Error =====
      const emptySetError = new Error('Pass a non-empty set, or options.convertEmptyValues=true.')
      emptySetError.name = 'ValidationException'

      vi.mocked(recommendationService.thumbsUp).mockRejectedValue(emptySetError)

      // ===== PHASE 2: Render Enhanced Component =====
      renderWithErrorHandler(<EnhancedUpvoteButton episodeId="empty-set-episode" />)

      // ===== PHASE 3: Simulate User Interaction =====
      const upvoteButton = screen.getByTestId('enhanced-upvote-button')

      await act(async () => {
        fireEvent.click(upvoteButton)
      })

      // ===== PHASE 4: Verify Specific Error Message =====
      await waitFor(() => {
        expect(screen.getByText('Data processing error')).toBeInTheDocument()
        expect(screen.getByText('There was a problem processing your request. Please try again.')).toBeInTheDocument()
      })
    })

    it('should handle rate limit validation error', async () => {
      // ===== PHASE 1: Setup Rate Limit Error =====
      const rateLimitError = new Error(
        'ValidationException: The provided key element does not match the schema at RateLimitService.getRateLimitRecord',
      )
      rateLimitError.name = 'ValidationException'

      vi.mocked(recommendationService.thumbsUp).mockRejectedValue(rateLimitError)

      // ===== PHASE 2: Render Enhanced Component =====
      renderWithErrorHandler(<EnhancedUpvoteButton episodeId="rate-limit-episode" />)

      // ===== PHASE 3: Simulate User Interaction =====
      const upvoteButton = screen.getByTestId('enhanced-upvote-button')

      await act(async () => {
        fireEvent.click(upvoteButton)
      })

      // ===== PHASE 4: Verify Rate Limit Error Message =====
      await waitFor(() => {
        expect(screen.getByText('Rate limit error')).toBeInTheDocument()
        expect(screen.getByText('Too many requests. Please wait a moment and try again.')).toBeInTheDocument()
      })
    })

    it('should handle episode fetch validation error', async () => {
      // ===== PHASE 1: Setup Episode Fetch Error =====
      const episodeFetchError = new Error(
        'Failed to fetch episode 028671b7-7eb5-4ad9-9350-67c6d786af5e for guest analytics: ValidationException: The provided key element does not match the schema',
      )
      episodeFetchError.name = 'ValidationException'

      vi.mocked(recommendationService.thumbsUp).mockRejectedValue(episodeFetchError)

      // ===== PHASE 2: Render Enhanced Component =====
      renderWithErrorHandler(<EnhancedUpvoteButton episodeId="028671b7-7eb5-4ad9-9350-67c6d786af5e" />)

      // ===== PHASE 3: Simulate User Interaction =====
      const upvoteButton = screen.getByTestId('enhanced-upvote-button')

      await act(async () => {
        fireEvent.click(upvoteButton)
      })

      // ===== PHASE 4: Verify Episode Fetch Error Message =====
      await waitFor(() => {
        expect(screen.getByText('Episode not found')).toBeInTheDocument()
        expect(screen.getByText('The episode could not be found. It may have been removed.')).toBeInTheDocument()
      })
    })
  })

  describe('Silent Failure Detection', () => {
    it('should detect and handle silent failure when backend returns success but operation failed', async () => {
      // ===== PHASE 1: Setup Silent Failure Response =====
      const silentFailureResponse = {
        message: 'Success',
        updated: true,
        guestAnalyticsCreated: false, // This indicates silent failure
      }

      vi.mocked(recommendationService.thumbsUp).mockResolvedValue(silentFailureResponse)

      // ===== PHASE 2: Render Enhanced Component =====
      renderWithErrorHandler(<EnhancedUpvoteButton episodeId="silent-failure-episode" />)

      // ===== PHASE 3: Simulate User Interaction =====
      const upvoteButton = screen.getByTestId('enhanced-upvote-button')

      await act(async () => {
        fireEvent.click(upvoteButton)
      })

      // ===== PHASE 4: Verify Silent Failure Detection =====
      await waitFor(() => {
        // Should show error message even though API returned success
        expect(screen.getByText('There was a problem with your request.')).toBeInTheDocument()
        expect(screen.getByText('Please try again in a moment.')).toBeInTheDocument()
      })

      // ===== PHASE 5: Verify UI State =====
      expect(upvoteButton).not.toHaveClass('bg-green-100')
      expect(upvoteButton).toHaveTextContent('Up')
    })

    it('should detect silent failure from warning in response', async () => {
      // ===== PHASE 1: Setup Silent Failure with Warning =====
      const silentFailureResponse = {
        message: 'Success',
        updated: true,
        warning: 'ValidationException occurred but not propagated to frontend',
      }

      vi.mocked(recommendationService.thumbsUp).mockResolvedValue(silentFailureResponse)

      // ===== PHASE 2: Render Enhanced Component =====
      renderWithErrorHandler(<EnhancedUpvoteButton episodeId="warning-failure-episode" />)

      // ===== PHASE 3: Simulate User Interaction =====
      const upvoteButton = screen.getByTestId('enhanced-upvote-button')

      await act(async () => {
        fireEvent.click(upvoteButton)
      })

      // ===== PHASE 4: Verify Warning Detection =====
      await waitFor(() => {
        // Should detect warning and show error message
        expect(screen.getByText('There was a problem with your request.')).toBeInTheDocument()
      })

      // ===== PHASE 5: Verify UI State =====
      expect(upvoteButton).not.toHaveClass('bg-green-100')
      expect(upvoteButton).toHaveTextContent('Up')
    })
  })

  describe('Success Scenarios', () => {
    it('should show success message and update UI for successful upvote', async () => {
      // ===== PHASE 1: Setup Success Response =====
      const successResponse = {
        message: 'Success',
        updated: true,
        guestAnalyticsCreated: true,
      }

      vi.mocked(recommendationService.thumbsUp).mockResolvedValue(successResponse)

      // ===== PHASE 2: Render Enhanced Component =====
      renderWithErrorHandler(<EnhancedUpvoteButton episodeId="success-episode" />)

      // ===== PHASE 3: Simulate User Interaction =====
      const upvoteButton = screen.getByTestId('enhanced-upvote-button')

      await act(async () => {
        fireEvent.click(upvoteButton)
      })

      // ===== PHASE 4: Verify Success Handling =====
      await waitFor(() => {
        // Should show success message
        expect(screen.getByText('Episode liked!')).toBeInTheDocument()
        expect(screen.getByText('Your feedback helps improve recommendations.')).toBeInTheDocument()
      })

      // ===== PHASE 5: Verify UI State =====
      expect(upvoteButton).toHaveClass('bg-green-100')
      expect(upvoteButton).toHaveTextContent('Upvoted')
      expect(upvoteButton).toBeDisabled()
    })
  })

  describe('Error Retry Functionality', () => {
    it('should provide retry option for ValidationException errors', async () => {
      // ===== PHASE 1: Setup ValidationException =====
      const validationError = new Error('ValidationException: The provided key element does not match the schema')
      validationError.name = 'ValidationException'

      vi.mocked(recommendationService.thumbsUp).mockRejectedValue(validationError)

      // ===== PHASE 2: Render Enhanced Component =====
      renderWithErrorHandler(<EnhancedUpvoteButton episodeId="retry-episode" />)

      // ===== PHASE 3: Simulate User Interaction =====
      const upvoteButton = screen.getByTestId('enhanced-upvote-button')

      await act(async () => {
        fireEvent.click(upvoteButton)
      })

      // ===== PHASE 4: Verify Retry Button =====
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      // ===== PHASE 5: Test Retry Functionality =====
      const retryButton = screen.getByText('Retry')
      await act(async () => {
        fireEvent.click(retryButton)
      })

      // Verify retry action was logged
      // In real implementation, this would trigger a retry
    })
  })

  describe('Network and Server Errors', () => {
    it('should handle network errors with appropriate message', async () => {
      // ===== PHASE 1: Setup Network Error =====
      const networkError = new Error('Network error')
      networkError.name = 'NetworkError'

      vi.mocked(recommendationService.thumbsUp).mockRejectedValue(networkError)

      // ===== PHASE 2: Render Enhanced Component =====
      renderWithErrorHandler(<EnhancedUpvoteButton episodeId="network-error-episode" />)

      // ===== PHASE 3: Simulate User Interaction =====
      const upvoteButton = screen.getByTestId('enhanced-upvote-button')

      await act(async () => {
        fireEvent.click(upvoteButton)
      })

      // ===== PHASE 4: Verify Network Error Message =====
      await waitFor(() => {
        expect(screen.getByText('Network Error')).toBeInTheDocument()
        expect(screen.getByText('Please check your internet connection and try again.')).toBeInTheDocument()
      })
    })

    it('should handle server errors with appropriate message', async () => {
      // ===== PHASE 1: Setup Server Error =====
      const serverError = new Error('Internal server error')
      serverError.name = 'ServerError'
      ;(serverError as any).statusCode = 500

      vi.mocked(recommendationService.thumbsUp).mockRejectedValue(serverError)

      // ===== PHASE 2: Render Enhanced Component =====
      renderWithErrorHandler(<EnhancedUpvoteButton episodeId="server-error-episode" />)

      // ===== PHASE 3: Simulate User Interaction =====
      const upvoteButton = screen.getByTestId('enhanced-upvote-button')

      await act(async () => {
        fireEvent.click(upvoteButton)
      })

      // ===== PHASE 4: Verify Server Error Message =====
      await waitFor(() => {
        expect(screen.getByText('Server Error')).toBeInTheDocument()
        expect(screen.getByText('Something went wrong on our end. Please try again in a moment.')).toBeInTheDocument()
      })
    })
  })

  describe('Error Logging', () => {
    it('should log errors with proper context for debugging', async () => {
      // ===== PHASE 1: Setup Error and Spy on Console =====
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const validationError = new Error('ValidationException: The provided key element does not match the schema')
      validationError.name = 'ValidationException'

      vi.mocked(recommendationService.thumbsUp).mockRejectedValue(validationError)

      // ===== PHASE 2: Render Enhanced Component =====
      renderWithErrorHandler(<EnhancedUpvoteButton episodeId="logging-test-episode" />)

      // ===== PHASE 3: Simulate User Interaction =====
      const upvoteButton = screen.getByTestId('enhanced-upvote-button')

      await act(async () => {
        fireEvent.click(upvoteButton)
      })

      // ===== PHASE 4: Verify Error Logging =====
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Frontend Error:',
          expect.objectContaining({
            name: 'ValidationException',
            message: 'ValidationException: The provided key element does not match the schema',
            timestamp: expect.any(String),
            userAgent: expect.any(String),
            url: expect.any(String),
            context: expect.objectContaining({
              operation: 'upvote',
              episodeId: 'logging-test-episode',
              source: 'enhanced-upvote-button',
            }),
          }),
        )
      })

      // ===== PHASE 5: Cleanup =====
      consoleErrorSpy.mockRestore()
    })
  })
})
