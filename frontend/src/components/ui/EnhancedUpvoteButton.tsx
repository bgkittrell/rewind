/**
 * Enhanced UpvoteButton with improved error handling for ValidationException scenarios
 *
 * Provides better user feedback when DynamoDB ValidationException errors occur
 * Detects silent failures and provides appropriate user notifications
 */

import React, { useState, useCallback } from 'react'
import { recommendationService } from '../../services/recommendationService'
import { useErrorHandler, detectSilentFailure, logError } from './ErrorHandler'
import { useToast } from './Toast'

interface EnhancedUpvoteButtonProps {
  episodeId: string
  onUpvote?: (episodeId: string, success: boolean) => void
  className?: string
  disabled?: boolean
}

export function EnhancedUpvoteButton({
  episodeId,
  onUpvote,
  className = '',
  disabled = false,
}: EnhancedUpvoteButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isUpvoted, setIsUpvoted] = useState(false)
  const { handleError } = useErrorHandler()
  const { showToast } = useToast()

  const handleUpvote = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()

      if (disabled || isLoading || isUpvoted) return

      setIsLoading(true)
      try {
        const response = await recommendationService.thumbsUp(episodeId, {
          source: 'enhanced-upvote-button',
          timestamp: new Date().toISOString(),
        })

        // Check for silent failures
        if (detectSilentFailure(response)) {
          // Handle silent failure scenario
          showToast({
            type: 'error',
            title: 'Something went wrong',
            description: 'Please try again in a moment.',
            duration: 5000,
          })

          // Don't set upvoted state for silent failures
          onUpvote?.(episodeId, false)
          return
        }

        // Success case
        setIsUpvoted(true)
        onUpvote?.(episodeId, true)

        // Show success feedback
        showToast({
          type: 'success',
          title: 'Episode liked!',
          description: 'Your feedback helps improve recommendations.',
          duration: 3000,
        })
      } catch (error) {
        // Handle explicit errors
        const errorInstance = error instanceof Error ? error : new Error(String(error))

        // Log error for debugging
        logError(errorInstance, {
          operation: 'upvote',
          episodeId,
          source: 'enhanced-upvote-button',
        })

        // Use enhanced error handler
        handleError({
          error: errorInstance,
          operation: 'upvote',
          episodeId,
          context: {
            source: 'enhanced-upvote-button',
            timestamp: new Date().toISOString(),
          },
        })

        onUpvote?.(episodeId, false)
      } finally {
        setIsLoading(false)
      }
    },
    [episodeId, onUpvote, disabled, isLoading, isUpvoted, handleError, showToast],
  )

  return (
    <button
      onClick={handleUpvote}
      disabled={disabled || isLoading || isUpvoted}
      className={`
        flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors
        ${
          isUpvoted
            ? 'bg-green-100 text-green-800 cursor-default'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
        }
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      aria-label={isUpvoted ? 'Episode upvoted' : 'Upvote episode'}
      title={isUpvoted ? 'Episode upvoted' : 'Upvote this episode'}
      data-testid="enhanced-upvote-button"
    >
      {isLoading ? (
        <div className="animate-spin w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full" />
      ) : (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )}
      {isUpvoted ? 'Upvoted' : 'Up'}
    </button>
  )
}

export default EnhancedUpvoteButton
