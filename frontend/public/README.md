# Icon Assets

This directory contains placeholder icons for the Rewind PWA. For production deployment, proper PNG icons in multiple sizes need to be generated.

## Current Status

- `icon.svg` - Simple placeholder SVG icon (red square with "R")

## Required Icons for Production

### PWA Manifest Icons
- `icon-192.png` - 192x192 PNG (required for PWA)
- `icon-512.png` - 512x512 PNG (required for PWA)

### iOS-Specific Icons (Apple Touch Icons)
- `icon-120x120.png` - iPhone (older models)
- `icon-152x152.png` - iPad
- `icon-167x167.png` - iPad Pro
- `icon-180x180.png` - iPhone (newer models)

### Additional Sizes for Media Session
- `icon-96x96.png` - Small media notification
- `icon-128x128.png` - Medium size
- `icon-256x256.png` - Large size
- `icon-384x384.png` - Extra large

## How to Generate Icons

1. Create a high-resolution logo (at least 512x512 PNG)
2. Use a tool like ImageMagick or an online PWA icon generator
3. Update `vite.config.ts` to uncomment the icon entries
4. Update `index.html` with proper apple-touch-icon links
5. Update `pwaService.ts` to uncomment icon references

## Icon Requirements

- Format: PNG with transparency
- Color: Should work on both light and dark backgrounds
- Design: Simple and recognizable at small sizes
- Maskable: Consider creating maskable versions for Android