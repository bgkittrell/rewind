import { useState, useEffect } from 'react'
import { pwaService } from '../services/pwaService'

interface UpdateNotificationProps {
  className?: string
}

export const UpdateNotification = ({ className = '' }: UpdateNotificationProps) => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    // Listen for update availability
    pwaService.onUpdateAvailable((showReload) => {
      setShowUpdateBanner(showReload)
    })

    // Check if update is already available
    if (pwaService.isUpdateAvailable()) {
      setShowUpdateBanner(true)
    }
  }, [])

  const handleUpdateClick = async () => {
    setIsUpdating(true)
    try {
      await pwaService.applyUpdate()
      // The page will reload automatically when the new SW takes control
    } catch (error) {
      console.error('Failed to apply update:', error)
      setIsUpdating(false)
    }
  }

  const handleDismiss = () => {
    setShowUpdateBanner(false)
  }

  if (!showUpdateBanner) {
    return null
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
      <div className="bg-red-500 text-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg 
                className="h-5 w-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </div>
            <div>
              <p className="font-medium">Update Available</p>
              <p className="text-sm text-red-100">
                A new version of Rewind is ready to install
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUpdateClick}
              disabled={isUpdating}
              className="bg-white text-red-500 px-4 py-2 rounded font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUpdating ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </span>
              ) : (
                'Update Now'
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="text-white hover:text-red-200 p-1 transition-colors"
              aria-label="Dismiss update notification"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UpdateNotification