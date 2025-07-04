import { Workbox } from 'workbox-window'

// Constants
const MIN_UPDATE_INTERVAL = 60 * 1000 // 1 minute
const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes
const VISIBILITY_DEBOUNCE_TIME = 1000 // 1 second

// Type definitions for workbox-window events
interface WorkboxEvent {
  isUpdate?: boolean
  type: string
  target?: any
}

export class UpdateService {
  private wb: Workbox | null = null
  private registration: ServiceWorkerRegistration | null = null
  private updateAvailable = false
  private onUpdateCallback: (() => void) | null = null
  private lastUpdateCheck = 0
  private isUpdateInProgress = false

  async initialize() {
    if ('serviceWorker' in navigator) {
      this.wb = new Workbox('/sw.js')

      // Service worker installed for the first time
      this.wb.addEventListener('installed', (event: WorkboxEvent) => {
        console.log('Service Worker installed:', event)
        if (!event.isUpdate) {
          this.showFirstTimeInstallMessage()
        }
      })

      // Service worker updated
      this.wb.addEventListener('waiting', (event: WorkboxEvent) => {
        console.log('New service worker waiting:', event)
        this.updateAvailable = true
        this.showUpdatePrompt()
      })

      // Service worker activated
      this.wb.addEventListener('controlling', (event: WorkboxEvent) => {
        console.log('Service worker controlling:', event)
        this.reloadApp()
      })


      try {
        const registration = await this.wb.register()
        this.registration = registration || null
        console.log('Service Worker registered successfully')

        // Check for updates every 60 seconds when app is active
        this.startUpdateCheck()
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }
  }

  private startUpdateCheck() {
    let debounceTimer: NodeJS.Timeout | null = null
    
    // Check for updates when app becomes visible (debounced)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }
        debounceTimer = setTimeout(() => {
          this.checkForUpdates()
        }, VISIBILITY_DEBOUNCE_TIME)
      }
    })

    // Check for updates every 5 minutes
    setInterval(
      () => {
        this.checkForUpdates()
      },
      UPDATE_CHECK_INTERVAL,
    )
  }

  async checkForUpdates() {
    const now = Date.now()
    
    // Throttle update checks to prevent excessive calls
    if (now - this.lastUpdateCheck < MIN_UPDATE_INTERVAL) {
      console.log('Update check throttled - too soon since last check')
      return
    }
    
    if (this.isUpdateInProgress) {
      console.log('Update check already in progress')
      return
    }
    
    this.lastUpdateCheck = now
    this.isUpdateInProgress = true
    
    if (this.registration) {
      try {
        await this.registration.update()
        console.log('Checked for service worker updates')
      } catch (error) {
        console.error('Update check failed:', error)
      } finally {
        this.isUpdateInProgress = false
      }
    } else {
      this.isUpdateInProgress = false
    }
  }

  async applyUpdate() {
    if (this.wb && this.updateAvailable) {
      // Tell the waiting service worker to skip waiting
      this.wb.messageSkipWaiting()

      // The 'controlling' event will be fired and trigger reload
      return true
    }
    return false
  }

  onUpdateReady(callback: () => void) {
    this.onUpdateCallback = callback
  }

  private showUpdatePrompt() {
    if (this.onUpdateCallback) {
      this.onUpdateCallback()
    }
  }

  private showFirstTimeInstallMessage() {
    console.log('App is now available offline!')
  }

  private reloadApp() {
    window.location.reload()
  }

  getUpdateStatus() {
    return {
      updateAvailable: this.updateAvailable,
      registration: this.registration,
      wb: this.wb,
    }
  }
}

export const updateService = new UpdateService()
