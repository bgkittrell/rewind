# iOS PWA Media Session Lock Screen Issue

## Problem Description
When multiple PWAs are installed on iOS, clicking the lock screen media controls may open the wrong PWA instead of the Rewind app. This is a known iOS limitation with how it handles media session API across multiple PWAs.

## Root Causes
1. iOS doesn't properly distinguish between multiple PWAs when handling media session controls
2. The system may cache or remember the last PWA that used media controls
3. Limited and undocumented PWA support on iOS

## Solutions

### Solution 1: Enhanced Manifest Configuration
Add more specific identifiers to help iOS distinguish your PWA:

```json
{
  "name": "Rewind - Rediscover Podcasts",
  "short_name": "Rewind",
  "description": "Rediscover older podcast episodes with AI-powered recommendations",
  "theme_color": "#eb4034",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait-primary",
  "start_url": "/",
  "scope": "/",
  "id": "com.rewind.podcast",  // Add unique ID
  "categories": ["entertainment", "music"],  // Add categories
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ]
}
```

### Solution 2: Enhanced Media Session Implementation
Modify the media session implementation to be more specific:

```typescript
// Add unique identifier to album name
navigator.mediaSession.metadata = new MediaMetadata({
  title: episode.title,
  artist: episode.podcastName,
  album: 'Rewind Podcast Player',  // Make this unique
  artwork: episode.imageUrl ? [
    { src: episode.imageUrl, sizes: '96x96', type: 'image/png' },
    { src: episode.imageUrl, sizes: '128x128', type: 'image/png' },
    { src: episode.imageUrl, sizes: '192x192', type: 'image/png' },
    { src: episode.imageUrl, sizes: '256x256', type: 'image/png' },
    { src: episode.imageUrl, sizes: '384x384', type: 'image/png' },
    { src: episode.imageUrl, sizes: '512x512', type: 'image/png' },
  ] : [
    // Provide default artwork when no episode image
    { src: '/icon-96.png', sizes: '96x96', type: 'image/png' },
    { src: '/icon-128.png', sizes: '128x128', type: 'image/png' },
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-256.png', sizes: '256x256', type: 'image/png' },
    { src: '/icon-384.png', sizes: '384x384', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
});
```

### Solution 3: iOS-Specific Meta Tags
Add iOS-specific meta tags to index.html:

```html
<!-- iOS-specific PWA tags -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="Rewind">

<!-- Apple touch icons for various sizes -->
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120x120.png">
<link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png">
<link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167x167.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png">
```

### Solution 4: Service Worker Optimization
Ensure the service worker properly claims control:

```javascript
// In your service worker
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// Handle media session in service worker context
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'MEDIA_SESSION_UPDATE') {
    // Handle media session updates
  }
});
```

### Solution 5: Force Media Focus
Implement a more aggressive media focus strategy:

```typescript
// When starting playback
const playAudio = async () => {
  try {
    // Request audio focus
    await audioRef.current.play();
    
    // Force update media session
    if ('mediaSession' in navigator) {
      // Clear any existing session
      navigator.mediaSession.metadata = null;
      
      // Set new metadata with a slight delay
      setTimeout(() => {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: episode.title,
          artist: episode.podcastName,
          album: 'Rewind - Podcast Player',
          artwork: getArtworkArray(episode)
        });
      }, 100);
    }
  } catch (error) {
    console.error('Playback failed:', error);
  }
};
```

## User Workarounds

If the technical solutions don't fully resolve the issue, suggest these workarounds to users:

1. **Remove and Reinstall**: Remove both PWAs and reinstall only Rewind first, then the other app
2. **Clear Safari Cache**: Settings → Safari → Clear History and Website Data
3. **Use Native Controls**: Use the in-app player controls instead of lock screen controls
4. **Single PWA**: If possible, use only one media-playing PWA at a time

## Testing Instructions

1. Install Rewind PWA first
2. Play a podcast episode
3. Lock the screen and verify controls work
4. Install another PWA
5. Test lock screen controls again
6. If issue persists, implement solutions in order

## Known Limitations

- iOS does not fully support Web App Manifest
- Media Session API support is limited on iOS
- No official Apple documentation for PWA media handling
- Issue may vary between iOS versions

## References

- [iOS PWA Media Session Issues](https://overdevs.com/ios-mediasession.html)
- [PWA on iOS Limitations](https://whatpwacando.today/)
- [Media Session API Documentation](https://web.dev/media-session/)