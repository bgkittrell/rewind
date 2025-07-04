export class VersionService {
  private currentVersion: string
  private lastKnownVersion: string | null

  constructor() {
    this.currentVersion = import.meta.env.VITE_APP_VERSION || '1.0.0'
    this.lastKnownVersion = localStorage.getItem('app-version')
  }

  initialize() {
    this.checkVersionChange()
    this.storeCurrentVersion()
  }

  private checkVersionChange() {
    if (this.lastKnownVersion && this.lastKnownVersion !== this.currentVersion) {
      this.handleVersionChange(this.lastKnownVersion, this.currentVersion)
    }
  }

  private handleVersionChange(oldVersion: string, newVersion: string) {
    console.log(`App updated from ${oldVersion} to ${newVersion}`)
    
    // Clear old caches on major version changes
    if (this.isMajorVersionChange(oldVersion, newVersion)) {
      this.clearOldCaches()
    }

    // Show update notification
    this.showUpdateNotification(newVersion)
  }

  private isMajorVersionChange(oldVersion: string, newVersion: string): boolean {
    const [oldMajor] = oldVersion.split('.')
    const [newMajor] = newVersion.split('.')
    return oldMajor !== newMajor
  }

  private async clearOldCaches() {
    try {
      const cacheNames = await caches.keys()
      const oldCaches = cacheNames.filter(name => 
        name.includes('workbox-precache') || name.includes('runtime-cache')
      )
      
      await Promise.all(oldCaches.map(name => caches.delete(name)))
      console.log('Old caches cleared')
    } catch (error) {
      console.error('Failed to clear old caches:', error)
    }
  }

  private showUpdateNotification(version: string) {
    // Could integrate with toast notification system
    console.log(`Welcome to Rewind ${version}!`)
  }

  private storeCurrentVersion() {
    localStorage.setItem('app-version', this.currentVersion)
  }

  getCurrentVersion(): string {
    return this.currentVersion
  }

  getLastKnownVersion(): string | null {
    return this.lastKnownVersion
  }

  isFirstRun(): boolean {
    return this.lastKnownVersion === null
  }
}

export const versionService = new VersionService()