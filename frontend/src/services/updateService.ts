import { Workbox } from 'workbox-window'

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

      // Service worker update check
      this.wb.addEventListener('externalwaiting', (event: WorkboxEvent) => {
        console.log('External service worker waiting:', event)
        this.updateAvailable = true
        this.showUpdatePrompt()
      })

      try {
        this.registration = await this.wb.register()
        console.log('Service Worker registered successfully')
        
        // Check for updates every 60 seconds when app is active
        this.startUpdateCheck()
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }
  }

  private startUpdateCheck() {
    // Check for updates when app becomes visible
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForUpdates()
      }
    })

    // Check for updates every 5 minutes
    setInterval(() => {
      this.checkForUpdates()
    }, 5 * 60 * 1000)
  }

  async checkForUpdates() {
    if (this.registration) {
      try {
        await this.registration.update()
        console.log('Checked for service worker updates')
      } catch (error) {
        console.error('Update check failed:', error)
      }
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