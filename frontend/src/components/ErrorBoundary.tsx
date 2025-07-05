import React, { useState, useEffect } from 'react'
import RewindLogger from '../utils/logger'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

// Global error handler setup
export function setupGlobalErrorHandling() {
  // Handle JavaScript errors
  window.addEventListener('error', (event) => {
    RewindLogger.error('Global JavaScript error', {
      errorMessage: event.message,
      errorFilename: event.filename,
      errorLineno: event.lineno,
      errorColno: event.colno,
      errorStack: event.error?.stack,
      location: window.location.href,
    })
  })

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    RewindLogger.error('Unhandled promise rejection', {
      reason: event.reason?.toString(),
      stack: event.reason?.stack,
      location: window.location.href,
    })
  })
}

// Simple error fallback component
function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const handleReload = () => {
    RewindLogger.userAction('Error fallback page reload clicked', {
      location: window.location.href,
    })
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-8">
            We're sorry, but something unexpected happened. Our team has been notified.
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-4">
            <button
              onClick={onRetry}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Try Again
            </button>

            <button
              onClick={handleReload}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple error boundary using hooks
export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false)

  const handleRetry = () => {
    RewindLogger.userAction('Error boundary retry clicked', {
      location: window.location.href,
    })
    setHasError(false)
  }

  // Note: React doesn't have a hook-based error boundary yet
  // This is a simplified version. For full error boundary functionality,
  // you'd need to use a class component or a library like react-error-boundary

  if (hasError) {
    return <ErrorFallback onRetry={handleRetry} />
  }

  return <>{children}</>
}
