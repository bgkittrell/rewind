import { useState, useEffect } from 'react'
import { offlineService } from '../services/offlineService'

/**
 * Hook to monitor online/offline status and queue management
 */
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(offlineService.getOnlineStatus())
  const [queueSize, setQueueSize] = useState(offlineService.getQueueSize())

  useEffect(() => {
    // Listen for online/offline status changes
    const unsubscribe = offlineService.addStatusListener(online => {
      setIsOnline(online)
      // Update queue size when status changes
      setQueueSize(offlineService.getQueueSize())
    })

    // Update queue size periodically (for when requests are processed)
    const updateQueueSize = () => {
      setQueueSize(offlineService.getQueueSize())
    }

    const interval = setInterval(updateQueueSize, 5000) // Check every 5 seconds

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  /**
   * Queue a request for later execution when online
   */
  const queueRequest = (url: string, method: string, body?: any, headers?: Record<string, string>) => {
    const requestId = offlineService.queueRequest(url, method, body, headers)
    setQueueSize(offlineService.getQueueSize())
    return requestId
  }

  /**
   * Clear all queued requests
   */
  const clearQueue = () => {
    offlineService.clearQueue()
    setQueueSize(0)
  }

  return {
    isOnline,
    queueSize,
    queueRequest,
    clearQueue,
  }
}
