import { IconWifiOff, IconClock } from '@tabler/icons-react'
import { useOfflineStatus } from '../hooks/useOfflineStatus'

export function OfflineStatus() {
  const { isOnline, queueSize } = useOfflineStatus()

  if (isOnline && queueSize === 0) return null

  return (
    <div
      className={`fixed top-14 left-0 right-0 z-30 px-4 py-2 text-sm text-center transition-colors ${
        isOnline
          ? 'bg-yellow-100 text-yellow-800 border-b border-yellow-200'
          : 'bg-red-100 text-red-800 border-b border-red-200'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <IconClock className="w-4 h-4" />
            <span>
              {queueSize} request{queueSize !== 1 ? 's' : ''} queued • Syncing when online
            </span>
          </>
        ) : (
          <>
            <IconWifiOff className="w-4 h-4" />
            <span>You're offline • Changes will sync when reconnected</span>
          </>
        )}
      </div>
    </div>
  )
}
