import { useEffect, useState } from 'react'
import { updateService } from '../services/updateService'

export const useUpdateCheck = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    updateService.onUpdateReady(() => {
      setUpdateAvailable(true)
    })
  }, [])

  const applyUpdate = async () => {
    setIsUpdating(true)
    try {
      await updateService.applyUpdate()
      return true
    } catch (error) {
      console.error('Update failed:', error)
      setIsUpdating(false)
      return false
    }
  }

  const checkForUpdates = async () => {
    await updateService.checkForUpdates()
  }

  return {
    updateAvailable,
    isUpdating,
    applyUpdate,
    checkForUpdates,
  }
}