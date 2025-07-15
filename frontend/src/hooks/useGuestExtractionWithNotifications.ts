import { useGuestExtractionStatus } from './useGuestExtractionStatus'
import { useGuestExtractionNotifications } from './useGuestExtractionNotifications'

interface UseGuestExtractionWithNotificationsOptions {
  episodeId: string
  podcastId: string
  enabled?: boolean
  pollInterval?: number
  showNotifications?: boolean
}

/**
 * Combined hook for guest extraction status polling with toast notifications
 */
export const useGuestExtractionWithNotifications = ({
  episodeId,
  podcastId,
  enabled = true,
  pollInterval = 5000,
  showNotifications = true,
}: UseGuestExtractionWithNotificationsOptions) => {
  // Get status polling functionality
  const statusResult = useGuestExtractionStatus({
    episodeId,
    podcastId,
    enabled,
    pollInterval,
  })

  // Set up notifications
  useGuestExtractionNotifications({
    episode: statusResult.episode,
    enabled: enabled && showNotifications,
  })

  return statusResult
}

export default useGuestExtractionWithNotifications
