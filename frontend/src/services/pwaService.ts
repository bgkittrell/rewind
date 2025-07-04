export class PWAService {
  private updateAvailable = false
  private registration: ServiceWorkerRegistration | null = null
  private onUpdateCallback: ((showReload: boolean) => void) | null = null

  async initialize() {
    if ('serviceWorker' in navigator) {
      try {
        // Register service worker
        this.registration = await navigator.serviceWorker.register('/sw.js')

        // Check for updates every 30 seconds when app is active
        setInterval(() => {
          this.checkForUpdates()
        }, 30000)

        // Listen for service worker updates
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration!.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is installed, but waiting
                this.updateAvailable = true
                this.onUpdateCallback?.(true)
              }
            })
          }
        })

        // Listen for when new service worker takes control
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          // New service worker has taken control, refresh the page
          window.location.reload()
        })

        // Check for updates immediately
        this.checkForUpdates()
      } catch (error) {
        console.error('Failed to register service worker:', error)
      }
    }
  }

  async checkForUpdates() {
    if (this.registration) {
      try {
        await this.registration.update()
      } catch (error) {
        console.error('Failed to check for updates:', error)
      }
    }
  }

  async applyUpdate() {
    if (this.registration && this.registration.waiting) {
      // Tell the waiting service worker to skip waiting and become active
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  onUpdateAvailable(callback: (showReload: boolean) => void) {
    this.onUpdateCallback = callback
  }

  isUpdateAvailable(): boolean {
    return this.updateAvailable
  }

  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
  }

  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }

  showUpdateNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Update Available', {
        body: 'A new version of Rewind is available. Tap to update.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'app-update',
        requireInteraction: true,
        // Actions are supported in some browsers but not in TypeScript types
        ...('actions' in Notification.prototype && {
          actions: [
            {
              action: 'update',
              title: 'Update Now',
            },
            {
              action: 'dismiss',
              title: 'Later',
            },
          ],
        }),
      } as any)

      notification.addEventListener('click', () => {
        this.applyUpdate()
        notification.close()
      })

      // Handle notification actions if supported
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('notificationclick', event => {
          const notificationEvent = event as any
          if (notificationEvent.action === 'update') {
            this.applyUpdate()
          }
          notificationEvent.notification.close()
        })
      }
    }
  }
}

export const pwaService = new PWAService()
