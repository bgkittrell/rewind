import { useEffect, useRef } from 'react'
import { useToastActions } from '../components/ui/Toast'
import type { Episode } from '../types/episode'

interface UseGuestExtractionNotificationsOptions {
  episode: Episode | null
  enabled?: boolean
}

/**
 * Hook to show toast notifications for guest extraction status changes
 */
export const useGuestExtractionNotifications = ({
  episode,
  enabled = true,
}: UseGuestExtractionNotificationsOptions) => {
  const { success, error, info } = useToastActions()
  const previousStatusRef = useRef<string | undefined>()

  useEffect(() => {
    if (!enabled || !episode) return

    const currentStatus = episode.guestExtractionStatus
    const previousStatus = previousStatusRef.current

    // Only show notifications when status changes
    if (currentStatus && currentStatus !== previousStatus) {
      switch (currentStatus) {
        case 'processing':
          if (previousStatus === 'pending') {
            info('Guest Extraction Started', `Analyzing "${episode.title}" for guests...`)
          }
          break

        case 'completed':
          if (previousStatus === 'processing') {
            const guestCount = episode.extractedGuests?.length || 0
            if (guestCount > 0) {
              const guestNames = episode.extractedGuests?.slice(0, 2).join(', ') || ''
              const moreText = guestCount > 2 ? ` and ${guestCount - 2} more` : ''
              success(
                `${guestCount} Guest${guestCount === 1 ? '' : 's'} Found`,
                `Found ${guestNames}${moreText} in "${episode.title}"`,
              )
            } else {
              info('No Guests Found', `No guests were identified in "${episode.title}"`)
            }
          }
          break

        case 'failed':
          if (previousStatus === 'processing') {
            error(
              'Guest Extraction Failed',
              `Unable to extract guests from "${episode.title}". Please try again later.`,
            )
          }
          break

        default:
          break
      }
    }

    // Update the previous status
    previousStatusRef.current = currentStatus
  }, [episode, enabled, success, error, info])
}

export default useGuestExtractionNotifications
