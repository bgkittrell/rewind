import { SyncStatus } from '../hooks/useEpisodeSyncStatus'

export interface EpisodeSyncIndicatorProps {
  syncStatus: SyncStatus | null
  isLoading?: boolean
  error?: string | null
  className?: string
  showDetails?: boolean
}

export function EpisodeSyncIndicator({
  syncStatus,
  isLoading = false,
  error = null,
  className = '',
  showDetails = false,
}: EpisodeSyncIndicatorProps) {
  if (!syncStatus && !isLoading && !error) {
    return null
  }

  const getStatusInfo = () => {
    if (error) {
      return {
        text: 'Sync Error',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
      }
    }

    if (isLoading || !syncStatus) {
      return {
        text: 'Checking...',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />,
      }
    }

    switch (syncStatus.syncStatus) {
      case 'queued':
        return {
          text: 'Queued for sync',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        }
      case 'processing':
        return {
          text: 'Syncing episodes...',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: <div className="animate-spin w-4 h-4 border-2 border-yellow-300 border-t-yellow-600 rounded-full" />,
        }
      case 'completed':
        return {
          text: 'Sync completed',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
        }
      case 'failed':
        return {
          text: 'Sync failed',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        }
      default:
        return null
    }
  }

  const statusInfo = getStatusInfo()

  if (!statusInfo) {
    return null
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffMinutes < 1) {
      return 'just now'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    } else {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  return (
    <div
      className={`inline-flex items-center gap-2 p-3 text-sm rounded-lg border ${statusInfo.bgColor} ${statusInfo.borderColor} ${className}`}
      role="status"
      aria-label={statusInfo.text}
      aria-live="polite"
      title={syncStatus?.syncStatus === 'processing' ? 'Processing episodes from RSS feed' : statusInfo.text}
    >
      <div className={statusInfo.color}>{statusInfo.icon}</div>

      <div className="flex flex-col min-w-0">
        <span className={`font-medium ${statusInfo.color}`}>{statusInfo.text}</span>

        {showDetails && syncStatus && (
          <div className="text-xs text-gray-500 mt-1">
            {syncStatus.syncStatus === 'completed' && syncStatus.completedAt && (
              <span>Completed {formatTime(syncStatus.completedAt)}</span>
            )}
            {syncStatus.syncStatus === 'processing' && syncStatus.startedAt && (
              <span>Started {formatTime(syncStatus.startedAt)}</span>
            )}
            {syncStatus.syncStatus === 'failed' && syncStatus.error && (
              <span className="text-red-500" title={syncStatus.error}>
                {syncStatus.error.length > 30 ? `${syncStatus.error.substring(0, 30)}...` : syncStatus.error}
              </span>
            )}
            {syncStatus.episodeCount > 0 && (
              <span className="ml-2">
                {syncStatus.episodeCount} episode{syncStatus.episodeCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default EpisodeSyncIndicator
