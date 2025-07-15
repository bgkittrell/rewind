import React from 'react'
import type { Episode } from '../types/episode'

interface GuestExtractionStatusProps {
  episode: Episode
  className?: string
}

export const GuestExtractionStatus: React.FC<GuestExtractionStatusProps> = ({ episode, className = '' }) => {
  const { guestExtractionStatus, extractedGuests = [], guestExtractionConfidence } = episode

  // Don't show anything if no status is set
  if (!guestExtractionStatus) {
    return null
  }

  const getStatusIcon = () => {
    switch (guestExtractionStatus) {
      case 'pending':
        return (
          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 6c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2s-2-.9-2-2v-4c0-1.1.9-2 2-2zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
          </svg>
        )
      case 'processing':
        return (
          <svg className="w-3 h-3 text-blue-500 animate-spin" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
          </svg>
        )
      case 'completed':
        return (
          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 6L12 10.5 8.5 8 7 9.5 10.5 12 7 15.5 8.5 17 12 13.5 15.5 17 17 15.5 13.5 12 17 8.5 15.5 8z" />
          </svg>
        )
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (guestExtractionStatus) {
      case 'pending':
        return 'Guests pending'
      case 'processing':
        return 'Finding guests...'
      case 'completed':
        return extractedGuests.length > 0
          ? `${extractedGuests.length} guest${extractedGuests.length === 1 ? '' : 's'} found`
          : 'No guests found'
      case 'failed':
        return 'Guest extraction failed'
      default:
        return ''
    }
  }

  const getStatusColor = () => {
    switch (guestExtractionStatus) {
      case 'pending':
        return 'text-gray-500'
      case 'processing':
        return 'text-blue-500'
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getTooltipContent = () => {
    switch (guestExtractionStatus) {
      case 'pending':
        return 'Guest extraction is queued for processing'
      case 'processing':
        return 'AI is analyzing the episode to identify guests'
      case 'completed':
        if (extractedGuests.length > 0) {
          const confidence = guestExtractionConfidence ? `${Math.round(guestExtractionConfidence * 100)}%` : 'N/A'
          return `Guests found: ${extractedGuests.join(', ')} (Confidence: ${confidence})`
        }
        return 'Episode was analyzed but no guests were identified'
      case 'failed':
        return 'Guest extraction failed - this episode may need manual review'
      default:
        return ''
    }
  }

  return (
    <div className={`flex items-center gap-1 text-xs ${className}`} title={getTooltipContent()}>
      {getStatusIcon()}
      <span className={getStatusColor()}>{getStatusText()}</span>
    </div>
  )
}

export default GuestExtractionStatus
