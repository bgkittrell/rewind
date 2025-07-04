import { useState, useEffect, useRef } from 'react'
import { updateService } from '../services/updateService'

const DISMISS_TIMEOUT = 60 * 60 * 1000 // 1 hour

export const UpdateNotification = () => {
  const [showUpdate, setShowUpdate] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    try {
      updateService.onUpdateReady(() => {
        setShowUpdate(true)
        setError(null) // Clear any previous errors
      })
    } catch (error) {
      console.error('Failed to setup update service:', error)
      setError('Failed to setup update notifications')
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleUpdate = async () => {
    setIsUpdating(true)
    setError(null)
    
    try {
      const updateResult = await updateService.applyUpdate()
      if (!updateResult) {
        throw new Error('Update failed - no update available')
      }
      // App will reload automatically
    } catch (error) {
      console.error('Update failed:', error)
      setError(error instanceof Error ? error.message : 'Update failed')
      setIsUpdating(false)
    }
  }

  const handleDismiss = () => {
    setShowUpdate(false)
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Show again in 1 hour
    timeoutRef.current = setTimeout(() => {
      setShowUpdate(true)
    }, DISMISS_TIMEOUT)
  }

  if (!showUpdate) return null

  return (
    <div className="fixed top-4 left-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-md mx-auto">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Update Available</h3>
          <p className="text-xs opacity-90 mt-1">
            A new version of Rewind is available with improvements and bug fixes.
          </p>
          {error && (
            <p className="text-xs mt-2 bg-red-700 px-2 py-1 rounded">
              Error: {error}
            </p>
          )}
        </div>
        <button onClick={handleDismiss} className="text-white opacity-75 hover:opacity-100 ml-2" aria-label="Dismiss">
          ×
        </button>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="bg-white text-red-500 px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
        >
          {isUpdating ? 'Updating...' : 'Update Now'}
        </button>
        <button onClick={handleDismiss} className="text-white opacity-75 hover:opacity-100 px-3 py-1 text-sm">
          Later
        </button>
      </div>
    </div>
  )
}
