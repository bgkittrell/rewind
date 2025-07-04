import { useEffect, useState } from 'react'
import { updateService } from '../services/updateService'

const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes

export const useUpdateCheck = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const initializeUpdateService = async () => {
      try {
        await updateService.initialize()
        updateService.onUpdateReady(() => {
          setUpdateAvailable(true)
        })
        
        // Check for updates initially
        await updateService.checkForUpdates()
        
        // Set up periodic update checks
        const interval = setInterval(async () => {
          await updateService.checkForUpdates()
        }, UPDATE_CHECK_INTERVAL)
        
        return () => {
          clearInterval(interval)
        }
      } catch (error) {
        console.error('Failed to initialize update service:', error)
      }
    }
    
    const cleanup = initializeUpdateService()
    
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.())
    }
  }, [])

  const applyUpdate = async () => {
    setIsUpdating(true)
    try {
      const result = await updateService.applyUpdate()
      if (result) {
        return true
      } else {
        setIsUpdating(false)
        return false
      }
    } catch (error) {
      console.error('Update failed:', error)
      setIsUpdating(false)
      return false
    }
  }

  const checkForUpdates = async () => {
    await updateService.checkForUpdates()
  }

  const getUpdateStatus = () => {
    return updateService.getUpdateStatus()
  }

  return {
    updateAvailable,
    isUpdating,
    applyUpdate,
    checkForUpdates,
    getUpdateStatus,
  }
}
