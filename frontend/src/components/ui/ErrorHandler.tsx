/**
 * Enhanced Error Handler for ValidationException and other critical errors
 *
 * Provides user-friendly error messages and proper feedback when backend fails
 * Specifically handles DynamoDB ValidationException scenarios
 */

import React, { useCallback } from 'react'
import { useToast } from './Toast'

interface ErrorHandlerProps {
  children: React.ReactNode
}

export interface ErrorDetails {
  error: Error
  operation: string
  episodeId?: string
  context?: Record<string, any>
}

export const ErrorHandler: React.FC<ErrorHandlerProps> = ({ children }) => {
  const { showToast } = useToast()

  const handleError = useCallback(
    (errorDetails: ErrorDetails) => {
      const { error, operation, episodeId, context } = errorDetails

      // Log error for debugging
      console.error('ErrorHandler:', {
        error,
        operation,
        episodeId,
        context,
        timestamp: new Date().toISOString(),
      })

      // Determine error type and show appropriate user feedback
      if (isValidationException(error)) {
        handleValidationException(error, operation, episodeId)
      } else if (isNetworkError(error)) {
        handleNetworkError(error, operation)
      } else if (isServerError(error)) {
        handleServerError(error, operation)
      } else {
        handleGenericError(error, operation)
      }
    },
    [showToast],
  )

  const handleValidationException = (error: Error, operation: string, episodeId?: string) => {
    let message = 'There was a problem with your request.'
    let details = 'Please try again in a moment.'

    if (error.message.includes('RateLimitService')) {
      message = 'Rate limit error'
      details = 'Too many requests. Please wait a moment and try again.'
    } else if (error.message.includes('Failed to fetch episode')) {
      message = 'Episode not found'
      details = 'The episode could not be found. It may have been removed.'
    } else if (error.message.includes('non-empty set')) {
      message = 'Data processing error'
      details = 'There was a problem processing your request. Please try again.'
    } else if (error.message.includes('key element does not match the schema')) {
      message = 'Data validation error'
      details = 'There was a problem with the episode data. Our team has been notified.'
    }

    showToast({
      type: 'error',
      title: message,
      description: details,
      duration: 5000,
      action: {
        label: 'Retry',
        onClick: () => {
          // Optionally provide retry functionality
          console.log('Retry requested for:', operation, episodeId)
        },
      },
    })
  }

  const handleNetworkError = (_error: Error, operation: string) => {
    showToast({
      type: 'error',
      title: 'Network Error',
      description: 'Please check your internet connection and try again.',
      duration: 5000,
      action: {
        label: 'Retry',
        onClick: () => {
          console.log('Network retry requested for:', operation)
        },
      },
    })
  }

  const handleServerError = (error: Error, operation: string) => {
    showToast({
      type: 'error',
      title: 'Server Error',
      description: 'Something went wrong on our end. Please try again in a moment.',
      duration: 5000,
      action: {
        label: 'Report Issue',
        onClick: () => {
          console.log('Issue report requested for:', operation, error.message)
        },
      },
    })
  }

  const handleGenericError = (_error: Error, _operation: string) => {
    showToast({
      type: 'error',
      title: 'Something went wrong',
      description: 'An unexpected error occurred. Please try again.',
      duration: 4000,
    })
  }

  // Provide error handling context to children
  return <ErrorHandlerContext.Provider value={{ handleError }}>{children}</ErrorHandlerContext.Provider>
}

// Context for error handling
const ErrorHandlerContext = React.createContext<{
  handleError: (errorDetails: ErrorDetails) => void
} | null>(null)

// Hook to use error handler
export const useErrorHandler = () => {
  const context = React.useContext(ErrorHandlerContext)
  if (!context) {
    throw new Error('useErrorHandler must be used within an ErrorHandler')
  }
  return context
}

// Error type detection utilities
const isValidationException = (error: Error): boolean => {
  return (
    error.name === 'ValidationException' ||
    error.message.includes('ValidationException') ||
    error.message.includes('key element does not match the schema') ||
    error.message.includes('non-empty set') ||
    error.message.includes('convertEmptyValues')
  )
}

const isNetworkError = (error: Error): boolean => {
  return (
    error.name === 'NetworkError' ||
    error.message.includes('Network error') ||
    error.message.includes('fetch') ||
    error.message.includes('timeout')
  )
}

const isServerError = (error: Error): boolean => {
  return (
    error.name === 'ServerError' ||
    error.message.includes('Server error') ||
    error.message.includes('Internal server error') ||
    (error as any).statusCode >= 500
  )
}

// Enhanced error logging utility
export const logError = (error: Error, context: Record<string, any> = {}) => {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    context,
  }

  console.error('Frontend Error:', errorInfo)

  // In production, this would send to error tracking service
  // e.g., Sentry, LogRocket, or custom error tracking
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service
    // errorTrackingService.captureError(errorInfo)
  }
}

// Utility for handling silent failures
export const detectSilentFailure = (response: any): boolean => {
  // Check for indicators that backend failed silently
  if (response.warning && response.warning.includes('ValidationException')) {
    return true
  }

  if (response.guestAnalyticsCreated === false) {
    return true
  }

  if (response.success === false && response.message === 'Success') {
    return true
  }

  return false
}

export default ErrorHandler
