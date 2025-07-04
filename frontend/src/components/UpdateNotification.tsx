import { useState, useEffect } from 'react'
import { updateService } from '../services/updateService'

export const UpdateNotification = () => {
  const [showUpdate, setShowUpdate] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    updateService.onUpdateReady(() => {
      setShowUpdate(true)
    })
  }, [])

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      await updateService.applyUpdate()
      // App will reload automatically
    } catch (error) {
      console.error('Update failed:', error)
      setIsUpdating(false)
    }
  }

  const handleDismiss = () => {
    setShowUpdate(false)
    // Show again in 1 hour
    setTimeout(
      () => {
        setShowUpdate(true)
      },
      60 * 60 * 1000,
    )
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
