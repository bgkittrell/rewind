import { apiClient } from './api'

export interface AudioUrlRefreshResponse {
  success: boolean
  newAudioUrl?: string
  error?: string
}

export class AudioUrlRefreshService {
  private refreshAttempts = new Map<string, number>()
  private readonly MAX_REFRESH_ATTEMPTS = 3

  /**
   * Checks if an audio URL appears to be time-limited/token-based
   */
  isTokenBasedUrl(audioUrl: string): boolean {
    const tokenIndicators = [
      'token-hash=',
      'token-time=',
      'access.acast.com',
      'patreonusercontent.com',
      'expires=',
      'signature=',
      'X-Amz-Expires=',
    ]

    return tokenIndicators.some(indicator => audioUrl.includes(indicator))
  }

  /**
   * Handles audio playback errors by attempting to refresh the URL
   */
  async handleAudioError(
    episodeId: string,
    podcastId: string,
    audioUrl: string,
    error: any,
  ): Promise<AudioUrlRefreshResponse> {
    console.log('Audio error detected:', { episodeId, error })

    // Check if this looks like a token expiration error
    if (!this.isTokenExpirationError(error)) {
      return { success: false, error: 'Not a token expiration error' }
    }

    // Check if URL is token-based
    if (!this.isTokenBasedUrl(audioUrl)) {
      return { success: false, error: 'URL does not appear to be token-based' }
    }

    // Check refresh attempt limits
    const attempts = this.refreshAttempts.get(episodeId) || 0
    if (attempts >= this.MAX_REFRESH_ATTEMPTS) {
      return { success: false, error: 'Maximum refresh attempts exceeded' }
    }

    try {
      // Increment attempt counter
      this.refreshAttempts.set(episodeId, attempts + 1)

      // Request fresh episode data from RSS
      const response = await apiClient.post<{ audioUrl: string }>('/episodes/refresh-url', {
        episodeId,
        podcastId,
      })

      if (response.audioUrl && response.audioUrl !== audioUrl) {
        // Reset attempt counter on success
        this.refreshAttempts.delete(episodeId)

        console.log('Audio URL refreshed successfully:', {
          episodeId,
          oldUrl: audioUrl.substring(0, 50) + '...',
          newUrl: response.audioUrl.substring(0, 50) + '...',
        })

        return {
          success: true,
          newAudioUrl: response.audioUrl,
        }
      }

      return { success: false, error: 'No new URL received' }
    } catch (error) {
      console.error('Failed to refresh audio URL:', error)
      return { success: false, error: 'Failed to refresh URL' }
    }
  }

  /**
   * Determines if an error is likely due to token expiration
   */
  private isTokenExpirationError(error: any): boolean {
    const errorIndicators = [
      403, // Forbidden
      401, // Unauthorized
      'network error',
      'cors error',
      'failed to fetch',
    ]

    if (error.status && errorIndicators.includes(error.status)) {
      return true
    }

    if (error.message) {
      const message = error.message.toLowerCase()
      return errorIndicators.some(indicator => typeof indicator === 'string' && message.includes(indicator))
    }

    return false
  }

  /**
   * Preemptively check if a token is likely expired based on URL
   */
  isTokenLikelyExpired(audioUrl: string): boolean {
    // Check for token-time parameter
    const tokenTimeMatch = audioUrl.match(/token-time=(\d+)/)
    if (tokenTimeMatch) {
      const tokenTime = parseInt(tokenTimeMatch[1]) * 1000 // Convert to milliseconds
      const now = Date.now()
      const bufferTime = 5 * 60 * 1000 // 5 minute buffer

      return now >= tokenTime - bufferTime
    }

    // Check for expires parameter
    const expiresMatch = audioUrl.match(/expires=(\d+)/)
    if (expiresMatch) {
      const expiresTime = parseInt(expiresMatch[1]) * 1000
      const now = Date.now()
      const bufferTime = 5 * 60 * 1000 // 5 minute buffer

      return now >= expiresTime - bufferTime
    }

    return false
  }

  /**
   * Clear refresh attempts for an episode (useful for cleanup)
   */
  clearRefreshAttempts(episodeId: string) {
    this.refreshAttempts.delete(episodeId)
  }

  /**
   * Get current refresh attempt count for an episode
   */
  getRefreshAttempts(episodeId: string): number {
    return this.refreshAttempts.get(episodeId) || 0
  }
}

export const audioUrlRefreshService = new AudioUrlRefreshService()
