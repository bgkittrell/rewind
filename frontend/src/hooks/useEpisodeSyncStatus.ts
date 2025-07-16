import { useState, useEffect, useCallback, useRef } from 'react'
import { episodeService } from '../services/episodeService'

export interface SyncStatus {
  podcastId: string
  syncStatus: 'idle' | 'queued' | 'processing' | 'completed' | 'failed'
  startedAt?: string
  completedAt?: string
  error?: string
  episodeCount: number
}

export interface UseEpisodeSyncStatusOptions {
  podcastId: string | undefined
  enabled?: boolean
  pollInterval?: number // in milliseconds, default 3000 (3 seconds)
  stopOnComplete?: boolean // whether to stop polling when sync completes
}

export interface UseEpisodeSyncStatusResult {
  syncStatus: SyncStatus | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  startPolling: () => void
  stopPolling: () => void
  isPolling: boolean
}

export function useEpisodeSyncStatus({
  podcastId,
  enabled = true,
  pollInterval = 3000,
  stopOnComplete = true,
}: UseEpisodeSyncStatusOptions): UseEpisodeSyncStatusResult {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState<boolean>(false)

  const timeoutRef = useRef<number | null>(null)
  const lastPollTimeRef = useRef<number | null>(null)
  const pollCountRef = useRef<number>(0)

  const fetchSyncStatus = useCallback(async (): Promise<void> => {
    if (!podcastId) return

    const now = Date.now()
    const timeSinceLastPoll = lastPollTimeRef.current ? now - lastPollTimeRef.current : 0
    pollCountRef.current += 1

    console.log(`[useEpisodeSyncStatus] Poll #${pollCountRef.current} for podcast ${podcastId}`, {
      timeSinceLastPoll: lastPollTimeRef.current ? `${timeSinceLastPoll}ms` : 'first poll',
      expectedInterval: `${pollInterval}ms`,
    })

    lastPollTimeRef.current = now

    try {
      setIsLoading(true)
      setError(null)

      const status = await episodeService.getSyncStatus(podcastId)
      setSyncStatus(status)

      console.log(`[useEpisodeSyncStatus] Got sync status:`, {
        podcastId,
        status: status.syncStatus,
        episodeCount: status.episodeCount,
      })

      // Check if we should stop polling
      if (stopOnComplete && (status.syncStatus === 'completed' || status.syncStatus === 'failed')) {
        console.log(`[useEpisodeSyncStatus] Stopping polling - sync ${status.syncStatus}`)
        setIsPolling(false)
      }
    } catch (err) {
      console.error(`[useEpisodeSyncStatus] Error fetching sync status:`, err)
      setError(err instanceof Error ? err.message : 'Failed to fetch sync status')
    } finally {
      setIsLoading(false)
    }
  }, [podcastId, stopOnComplete, pollInterval])

  const startPolling = useCallback((): void => {
    if (!podcastId || !enabled) {
      console.log(`[useEpisodeSyncStatus] Cannot start polling - podcastId: ${podcastId}, enabled: ${enabled}`)
      return
    }
    console.log(`[useEpisodeSyncStatus] Starting polling for podcast ${podcastId} with ${pollInterval}ms interval`)
    setIsPolling(true)
    pollCountRef.current = 0
    lastPollTimeRef.current = null
  }, [podcastId, enabled, pollInterval])

  const stopPolling = useCallback((): void => {
    console.log(`[useEpisodeSyncStatus] Stopping polling for podcast ${podcastId}`)
    setIsPolling(false)
    if (timeoutRef.current) {
      console.log(`[useEpisodeSyncStatus] Clearing timeout ${timeoutRef.current}`)
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [podcastId])

  // Main polling effect
  useEffect(() => {
    console.log(`[useEpisodeSyncStatus] Polling effect triggered:`, {
      enabled,
      podcastId,
      isPolling,
      pollInterval,
      hasTimeout: !!timeoutRef.current,
    })

    if (!enabled || !podcastId || !isPolling) {
      if (timeoutRef.current) {
        console.log(`[useEpisodeSyncStatus] Clearing timeout due to conditions not met`)
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    const poll = async () => {
      console.log(`[useEpisodeSyncStatus] poll() function called`)
      await fetchSyncStatus()

      // Schedule next poll if still polling and not complete
      const shouldContinuePolling =
        isPolling &&
        (!stopOnComplete || (syncStatus?.syncStatus !== 'completed' && syncStatus?.syncStatus !== 'failed'))

      console.log(`[useEpisodeSyncStatus] After poll - should continue polling:`, {
        isPolling,
        stopOnComplete,
        currentStatus: syncStatus?.syncStatus,
        shouldContinuePolling,
      })

      if (shouldContinuePolling) {
        console.log(`[useEpisodeSyncStatus] Scheduling next poll in ${pollInterval}ms`)
        timeoutRef.current = window.setTimeout(() => {
          console.log(`[useEpisodeSyncStatus] Timeout fired, calling poll again`)
          poll()
        }, pollInterval)
        console.log(`[useEpisodeSyncStatus] Timeout set with ID: ${timeoutRef.current}`)
      } else {
        console.log(`[useEpisodeSyncStatus] Not scheduling next poll`)
      }
    }

    // Start polling immediately
    console.log(`[useEpisodeSyncStatus] Starting immediate poll`)
    poll()

    // Cleanup function
    return () => {
      console.log(`[useEpisodeSyncStatus] Cleaning up polling effect`)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [enabled, podcastId, isPolling, pollInterval, fetchSyncStatus, stopOnComplete, syncStatus?.syncStatus])

  // Auto-start polling when enabled and podcastId are available
  useEffect(() => {
    console.log(`[useEpisodeSyncStatus] Auto-start effect triggered:`, {
      enabled,
      podcastId,
      isPolling,
      currentSyncStatus: syncStatus?.syncStatus,
    })

    // Don't auto-start if sync is already in a terminal state
    if (syncStatus?.syncStatus === 'completed' || syncStatus?.syncStatus === 'failed') {
      console.log(`[useEpisodeSyncStatus] Not auto-starting - sync already ${syncStatus.syncStatus}`)
      return
    }

    if (enabled && podcastId && !isPolling) {
      console.log(`[useEpisodeSyncStatus] Auto-starting polling`)
      startPolling()
    }
  }, [enabled, podcastId, startPolling, isPolling, syncStatus?.syncStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log(`[useEpisodeSyncStatus] Component unmounting, cleaning up`)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    syncStatus,
    isLoading,
    error,
    refetch: fetchSyncStatus,
    startPolling,
    stopPolling,
    isPolling,
  }
}
