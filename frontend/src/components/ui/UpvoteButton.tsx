import React, { useState, useCallback } from 'react'
import { recommendationService } from '../../services/recommendationService'

interface UpvoteButtonProps {
  episodeId: string
  onUpvote?: (episodeId: string, success: boolean) => void
  className?: string
  disabled?: boolean
}

export function UpvoteButton({ episodeId, onUpvote, className = '', disabled = false }: UpvoteButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isUpvoted, setIsUpvoted] = useState(false)

  const handleUpvote = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()

      if (disabled || isLoading || isUpvoted) return

      setIsLoading(true)
      try {
        await recommendationService.thumbsUp(episodeId, {
          source: 'upvote-button',
          timestamp: new Date().toISOString(),
        })
        setIsUpvoted(true)
        onUpvote?.(episodeId, true)
      } catch (error) {
        console.error('Error upvoting episode:', error)
        onUpvote?.(episodeId, false)
      } finally {
        setIsLoading(false)
      }
    },
    [episodeId, onUpvote, disabled, isLoading, isUpvoted],
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
      data-testid="upvote-button"
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

export default UpvoteButton
