\# Rewind PWA Features Specifications

## Overview
This document outlines the Progressive Web App \(PWA\) features for Rewind, a mobile-first application for podcast enthusiasts aged 35\+. These features enhance offline capabilities, performance, and user engagement, integrating with the frontend \(see UI_TECH.md\) and backend \(see BACKEND_API.md\).

## Service Worker
- **Purpose**: Manages caching, offline access, and push notifications.
- **Implementation**:
  - Use Workbox to generate and manage the service worker.
  - Register via `vite-plugin-pwa` in the Vite configuration.
- **Caching Strategy**:
  - **Cache-First**: Cache static assets (HTML, CSS, JS) and episode metadata.
  - **Network-First**: Fetch episode audio files, falling back to cache if offline.
  - **Cache Expiration**: Set a 30-day expiration for assets, 7 days for audio.
- **Offline Logic**:
  - Detect offline status and display a custom offline page.
  - Queue API requests (e.g., feedback submission) when offline, syncing when online.
- **Push Notifications**:
  - Send notifications for new episode recommendations.
  - Use Web Push API with VAPID keys for subscription.

## Manifest Configuration
- **File**: `manifest.json`
- **Contents**:
  \```
  {
    "name": "Rewind",
    "short_name": "Rewind",
    "start_url": "/",
    "display": "standalone",
    "theme_color": "#26A69A",
    "background_color": "#FFFFFF",
    "icons": [
      {
        "src": "/icon-192.png",
        "sizes": "192x192",
        "type": "image/png"
      },
      {
        "src": "/icon-512.png",
        "sizes": "512x512",
        "type": "image/png"
      }
    ]
  }
  \```
- **Purpose**:
  - Enables "Add to Home Screen" functionality.
  - Defines app icon and theme colors.

## Offline Playback
- **Mechanism**:
  - Cache episode audio files using the service worker when played.
  - Store playback position in IndexedDB (see UI_TECH.md for `playbackService.ts`).
- **Sync Logic**:
  - Update cache when a new podcast is added via `/podcasts/add` (see BACKEND_API.md).
  - Remove cached files when a podcast is deleted.
- **Fallback**:
  - Display cached episode list when offline.
  - Show error if audio file is unavailable.

## Performance Optimization
- **Preloading**:
  - Preload critical assets (e.g., episode thumbnails) using `<link rel="preload">`.
- **Lazy Loading**:
  - Lazy-load images and non-critical JS using `loading="lazy"`.
- **Compression**:
  - Serve compressed assets (e.g., Gzip) via Vite build.

## Installation Prompt
- **Trigger**:
  - Show "Add to Home Screen" prompt after 2 visits or 5 minutes.
  - Use `beforeinstallprompt` event in JavaScript.
- **User Experience**:
  - Provide clear instructions and benefits (e.g., offline access).

## Notes for AI Agent
- Implement service worker with Workbox and `vite-plugin-pwa`.
- Configure `manifest.json` in the public directory.
- Test offline scenarios with Lighthouse or DevTools.
- Integrate with IndexedDB for persistent state (see UI_TECH.md).
- Commit changes to Git after implementing each feature.
- Report issues (e.g., unclear caching strategy) in PLAN.md.

## References
- UI_TECH.md: Frontend integration details.
- BACKEND_API.md: API endpoint definitions.
- BACKEND_LOGIC.md: Business logic details.
- DATABASE.md: Database schema.
- PLAN.md: Task list and progress tracking.
