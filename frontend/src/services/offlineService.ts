/**
 * Offline Service
 * Handles offline detection, request queuing, and background sync
 */

interface QueuedRequest {
  id: string
  url: string
  method: string
  body?: any
  headers?: Record<string, string>
  timestamp: number
}

class OfflineService {
  private isOnline: boolean = navigator.onLine
  private queue: QueuedRequest[] = []
  private readonly QUEUE_KEY = 'rewind-offline-queue'
  private listeners: Set<(online: boolean) => void> = new Set()

  constructor() {
    this.loadQueue()
    this.setupEventListeners()
  }

  /**
   * Set up online/offline event listeners
   */
  private setupEventListeners() {
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
  }

  /**
   * Handle coming back online
   */
  private handleOnline = () => {
    this.isOnline = true
    this.notifyListeners(true)
    this.processQueue()
  }

  /**
   * Handle going offline
   */
  private handleOffline = () => {
    this.isOnline = false
    this.notifyListeners(false)
  }

  /**
   * Add a listener for online/offline status changes
   */
  addStatusListener(callback: (online: boolean) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(online: boolean) {
    this.listeners.forEach(callback => callback(online))
  }

  /**
   * Check if currently online
   */
  getOnlineStatus(): boolean {
    return this.isOnline
  }

  /**
   * Queue a request for later execution when online
   */
  queueRequest(url: string, method: string, body?: any, headers?: Record<string, string>): string {
    const request: QueuedRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url,
      method,
      body,
      headers,
      timestamp: Date.now(),
    }

    this.queue.push(request)
    this.saveQueue()

    console.log(`Queued request: ${method} ${url}`)
    return request.id
  }

  /**
   * Process all queued requests
   */
  private async processQueue() {
    if (!this.isOnline || this.queue.length === 0) return

    console.log(`Processing ${this.queue.length} queued requests`)

    const processedIds: string[] = []

    for (const request of this.queue) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          body: request.body ? JSON.stringify(request.body) : undefined,
          headers: {
            'Content-Type': 'application/json',
            ...request.headers,
          },
        })

        if (response.ok) {
          processedIds.push(request.id)
          console.log(`Successfully processed queued request: ${request.method} ${request.url}`)
        } else {
          console.warn(`Failed to process queued request: ${request.method} ${request.url}`, response.status)
        }
      } catch (error) {
        console.error(`Error processing queued request: ${request.method} ${request.url}`, error)
      }
    }

    // Remove successfully processed requests
    this.queue = this.queue.filter(req => !processedIds.includes(req.id))
    this.saveQueue()
  }

  /**
   * Clear old requests from queue (older than 24 hours)
   */
  private clearOldRequests() {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000 // 24 hours ago
    const originalLength = this.queue.length

    this.queue = this.queue.filter(req => req.timestamp > cutoff)

    if (this.queue.length !== originalLength) {
      console.log(`Cleared ${originalLength - this.queue.length} old requests from queue`)
      this.saveQueue()
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue() {
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.queue))
    } catch (error) {
      console.error('Failed to save offline queue:', error)
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue() {
    try {
      const saved = localStorage.getItem(this.QUEUE_KEY)
      if (saved) {
        this.queue = JSON.parse(saved)
        this.clearOldRequests()
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error)
      this.queue = []
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length
  }

  /**
   * Clear the entire queue
   */
  clearQueue() {
    this.queue = []
    this.saveQueue()
  }

  /**
   * Cleanup event listeners
   */
  destroy() {
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    this.listeners.clear()
  }
}

// Export singleton instance
export const offlineService = new OfflineService()
