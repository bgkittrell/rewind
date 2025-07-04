# PWA Update Strategy for Rewind

## Overview

This document outlines the strategy to ensure users receive the latest code after deployment when they have the Rewind app installed as a PWA. The plan addresses service worker updates, cache invalidation, user notifications, and version management.

## Current State Analysis

### ✅ What's Already Implemented
- Basic PWA setup with Vite PWA plugin
- Service worker with `registerType: 'autoUpdate'`
- App manifest configuration
- `workbox-window` dependency installed

### ⚠️ What's Missing
- Service worker registration in main app code
- Update notification system for users
- Version checking mechanism
- Force refresh capability
- User-friendly update prompts

## 🎯 PWA Update Strategy

### Phase 1: Immediate Implementation (Critical)

#### 1. Service Worker Registration with Update Handling

**Location**: `frontend/src/services/updateService.ts`

```typescript
import { Workbox } from 'workbox-window'

export class UpdateService {
  private wb: Workbox | null = null
  private registration: ServiceWorkerRegistration | null = null
  private updateAvailable = false
  private onUpdateCallback: (() => void) | null = null

  async initialize() {
    if ('serviceWorker' in navigator) {
      this.wb = new Workbox('/sw.js')
      
      // Service worker installed for the first time
      this.wb.addEventListener('installed', (event) => {
        console.log('Service Worker installed:', event)
        if (!event.isUpdate) {
          this.showFirstTimeInstallMessage()
        }
      })

      // Service worker updated
      this.wb.addEventListener('waiting', (event) => {
        console.log('New service worker waiting:', event)
        this.updateAvailable = true
        this.showUpdatePrompt()
      })

      // Service worker activated
      this.wb.addEventListener('controlling', (event) => {
        console.log('Service worker controlling:', event)
        this.reloadApp()
      })

      // Service worker update check
      this.wb.addEventListener('externalwaiting', (event) => {
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
}

export const updateService = new UpdateService()
```

#### 2. Update Notification Component

**Location**: `frontend/src/components/UpdateNotification.tsx`

```typescript
import React, { useState, useEffect } from 'react'
import { updateService } from '../services/updateService'

export const UpdateNotification: React.FC = () => {
  const [showUpdate, setShowUpdate] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    updateService.onUpdateReady(() => {
      setShowUpdate(true)
    })
  }, [])

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      await updateService.applyUpdate()
      // App will reload automatically
    } catch (error) {
      console.error('Update failed:', error)
      setIsUpdating(false)
    }
  }

  const handleDismiss = () => {
    setShowUpdate(false)
    // Show again in 1 hour
    setTimeout(() => {
      setShowUpdate(true)
    }, 60 * 60 * 1000)
  }

  if (!showUpdate) return null

  return (
    <div className="fixed top-4 left-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-md mx-auto">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Update Available</h3>
          <p className="text-xs opacity-90 mt-1">
            A new version of Rewind is available with improvements and bug fixes.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-white opacity-75 hover:opacity-100 ml-2"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="bg-white text-red-500 px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
        >
          {isUpdating ? 'Updating...' : 'Update Now'}
        </button>
        <button
          onClick={handleDismiss}
          className="text-white opacity-75 hover:opacity-100 px-3 py-1 text-sm"
        >
          Later
        </button>
      </div>
    </div>
  )
}
```

#### 3. Version Management System

**Location**: `frontend/src/services/versionService.ts`

```typescript
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
}

export const versionService = new VersionService()
```

#### 4. Integration with Main App

**Location**: Update `frontend/src/main.tsx`

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'

// Import PWA services
import { updateService } from './services/updateService'
import { versionService } from './services/versionService'

// Import components
import { UpdateNotification } from './components/UpdateNotification'

// ... existing imports and router setup ...

// Initialize PWA services
updateService.initialize()
versionService.initialize()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <UpdateNotification />
    </AuthProvider>
  </React.StrictMode>,
)
```

### Phase 2: Enhanced Update Experience

#### 1. Improved Vite PWA Configuration

**Location**: Update `frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // Changed from autoUpdate
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3}'],
        // Clean old caches
        cleanupOutdatedCaches: true,
        // Skip waiting for user action
        skipWaiting: false, // Let user control when to update
        // Client claim control
        clientsClaim: false,
        // Runtime caching strategies
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/12c77xnz00\.execute-api\.us-east-1\.amazonaws\.com\/v1\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Rewind',
        short_name: 'Rewind',
        description: 'Rediscover older podcast episodes',
        theme_color: '#eb4034',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
  // ... rest of config
})
```

#### 2. Update Check Hook

**Location**: `frontend/src/hooks/useUpdateCheck.ts`

```typescript
import { useEffect, useState } from 'react'
import { updateService } from '../services/updateService'

export const useUpdateCheck = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    updateService.onUpdateReady(() => {
      setUpdateAvailable(true)
    })
  }, [])

  const applyUpdate = async () => {
    setIsUpdating(true)
    try {
      await updateService.applyUpdate()
      return true
    } catch (error) {
      console.error('Update failed:', error)
      setIsUpdating(false)
      return false
    }
  }

  const checkForUpdates = async () => {
    await updateService.checkForUpdates()
  }

  return {
    updateAvailable,
    isUpdating,
    applyUpdate,
    checkForUpdates,
  }
}
```

### Phase 3: Advanced Update Features

#### 1. Background Update with User Preferences

```typescript
// Location: frontend/src/services/updatePreferencesService.ts

export class UpdatePreferencesService {
  private preferences = {
    autoUpdate: false,
    notificationEnabled: true,
    updateCheckInterval: 5 * 60 * 1000, // 5 minutes
  }

  constructor() {
    this.loadPreferences()
  }

  private loadPreferences() {
    const saved = localStorage.getItem('update-preferences')
    if (saved) {
      this.preferences = { ...this.preferences, ...JSON.parse(saved) }
    }
  }

  private savePreferences() {
    localStorage.setItem('update-preferences', JSON.stringify(this.preferences))
  }

  setAutoUpdate(enabled: boolean) {
    this.preferences.autoUpdate = enabled
    this.savePreferences()
  }

  setNotificationEnabled(enabled: boolean) {
    this.preferences.notificationEnabled = enabled
    this.savePreferences()
  }

  getPreferences() {
    return { ...this.preferences }
  }
}
```

#### 2. Update History and Rollback

```typescript
// Location: frontend/src/services/updateHistoryService.ts

interface UpdateRecord {
  version: string
  timestamp: number
  success: boolean
  rollbackAvailable: boolean
}

export class UpdateHistoryService {
  private history: UpdateRecord[] = []

  constructor() {
    this.loadHistory()
  }

  private loadHistory() {
    const saved = localStorage.getItem('update-history')
    if (saved) {
      this.history = JSON.parse(saved)
    }
  }

  private saveHistory() {
    localStorage.setItem('update-history', JSON.stringify(this.history))
  }

  recordUpdate(version: string, success: boolean) {
    this.history.push({
      version,
      timestamp: Date.now(),
      success,
      rollbackAvailable: this.history.length > 0,
    })

    // Keep only last 10 updates
    if (this.history.length > 10) {
      this.history = this.history.slice(-10)
    }

    this.saveHistory()
  }

  getHistory(): UpdateRecord[] {
    return [...this.history]
  }

  getLastSuccessfulUpdate(): UpdateRecord | null {
    return this.history.reverse().find(record => record.success) || null
  }
}
```

## 🚀 Implementation Steps

### Step 1: Create Update Service (Priority: High)
1. Create `frontend/src/services/updateService.ts`
2. Create `frontend/src/services/versionService.ts`
3. Create `frontend/src/components/UpdateNotification.tsx`

### Step 2: Update Main App (Priority: High)
1. Update `frontend/src/main.tsx` to initialize services
2. Update `frontend/vite.config.ts` configuration
3. Add version to environment variables

### Step 3: Add Update Hook (Priority: Medium)
1. Create `frontend/src/hooks/useUpdateCheck.ts`
2. Update components to use the hook

### Step 4: Testing and Validation (Priority: High)
1. Test service worker registration
2. Test update notifications
3. Test version management
4. Test offline functionality

### Step 5: Advanced Features (Priority: Low)
1. Add user preferences
2. Add update history
3. Add rollback capability

## 📋 Testing Strategy

### Manual Testing
1. **Development**: Test with `npm run dev`
2. **Production Build**: Test with `npm run build && npm run preview`
3. **Multiple Versions**: Deploy different versions and test updates
4. **Offline Testing**: Test offline functionality and update behavior

### Automated Testing
```typescript
// Location: frontend/src/services/__tests__/updateService.test.ts

describe('UpdateService', () => {
  it('should register service worker', async () => {
    const updateService = new UpdateService()
    await updateService.initialize()
    
    expect(navigator.serviceWorker.ready).toBeDefined()
  })

  it('should check for updates', async () => {
    const updateService = new UpdateService()
    await updateService.initialize()
    
    const checkSpy = jest.spyOn(updateService, 'checkForUpdates')
    await updateService.checkForUpdates()
    
    expect(checkSpy).toHaveBeenCalled()
  })

  it('should handle update notifications', async () => {
    const updateService = new UpdateService()
    let updateCallbackCalled = false
    
    updateService.onUpdateReady(() => {
      updateCallbackCalled = true
    })
    
    // Simulate update ready
    updateService['showUpdatePrompt']()
    
    expect(updateCallbackCalled).toBe(true)
  })
})
```

## 🔧 Configuration Updates

### Environment Variables
Add to `frontend/.env`:
```
VITE_APP_VERSION=1.0.0
```

### Package.json Updates
Add version script:
```json
{
  "scripts": {
    "version": "echo $npm_package_version"
  }
}
```

### Build Process Integration
Update CI/CD to include version in build:
```bash
# In deployment script
export VITE_APP_VERSION=$(npm run version --silent)
npm run build
```

## 🎯 Success Metrics

### Key Performance Indicators
- **Update Detection Time**: < 5 minutes after deployment
- **Update Application Success Rate**: > 95%
- **User Update Adoption**: > 80% within 24 hours
- **Cache Hit Rate**: > 90% for repeated visits

### Monitoring
- Track update notifications shown
- Track update applications
- Monitor service worker registration success
- Monitor cache performance

## 📚 Best Practices

### User Experience
1. **Non-intrusive**: Don't force immediate updates
2. **Informative**: Explain why updates are beneficial
3. **Timely**: Check for updates when app becomes active
4. **Reliable**: Handle update failures gracefully

### Technical Implementation
1. **Progressive Enhancement**: Work without service workers
2. **Error Handling**: Graceful degradation on failures
3. **Performance**: Minimize impact on app performance
4. **Compatibility**: Support all target browsers

### Security
1. **HTTPS Only**: Service workers require HTTPS
2. **Content Security Policy**: Proper CSP headers
3. **Update Verification**: Validate update integrity
4. **Rollback Capability**: Ability to revert problematic updates

## 🔗 Related Documentation

- [PWA_FEATURES.md](./PWA_FEATURES.md): Complete PWA implementation guide
- [UI_TECH.md](./UI_TECH.md): Frontend technology stack
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md): Deployment and CDN setup

## 📞 Support and Troubleshooting

### Common Issues
1. **Service Worker Not Registering**: Check HTTPS and file paths
2. **Updates Not Detected**: Verify service worker registration
3. **Cache Not Clearing**: Implement proper cache management
4. **Offline Issues**: Test offline functionality thoroughly

### Debug Tools
1. **Chrome DevTools**: Application tab for service workers
2. **Lighthouse**: PWA audit and recommendations
3. **Workbox**: Built-in debugging for service workers
4. **Console Logging**: Comprehensive logging for debugging

---

**Implementation Priority**: High - This is critical for ensuring users receive updates and maintain app functionality after deployments.