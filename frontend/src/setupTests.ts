// Setup for vitest testing environment
import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock global fetch for tests
global.fetch = vi.fn()

// Mock URL constructor for test environment
global.URL = global.URL || URL

// Mock MediaMetadata for MediaSession API
global.MediaMetadata = vi.fn().mockImplementation((metadata: any) => metadata)

// Add mediaSession to existing navigator
if (typeof global.navigator !== 'undefined') {
  Object.defineProperty(global.navigator, 'mediaSession', {
    value: {
      metadata: null,
      setActionHandler: vi.fn(),
    },
    configurable: true,
  })
}

// Mock HTMLMediaElement methods to prevent jsdom "Not implemented" errors
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  value: vi.fn().mockResolvedValue(undefined),
  writable: true,
})

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  value: vi.fn(),
  writable: true,
})

Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  value: vi.fn(),
  writable: true,
})

Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
  get: vi.fn(() => 0),
  set: vi.fn(),
  configurable: true,
})

Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
  get: vi.fn(() => 100),
  configurable: true,
})

Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
  get: vi.fn(() => true),
  configurable: true,
})

Object.defineProperty(HTMLMediaElement.prototype, 'ended', {
  get: vi.fn(() => false),
  configurable: true,
})

Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
  get: vi.fn(() => 1),
  set: vi.fn(),
  configurable: true,
})

// Suppress console output during tests to prevent stderr pollution
const originalConsole = { ...console }

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}

// Suppress jsdom errors about unimplemented features
const originalError = global.console.error
global.console.error = vi.fn((...args: any[]) => {
  const message = args[0]?.toString() || ''

  // Suppress specific jsdom "Not implemented" errors
  if (
    message.includes('Not implemented: HTMLMediaElement') ||
    message.includes('Error: Not implemented:') ||
    message.includes('HTMLAudioElementImpl') ||
    message.includes('jsdom/lib/jsdom/browser/not-implemented') ||
    message.includes('HTMLMediaElement-impl')
  ) {
    return // Suppress these errors
  }

  // Allow other errors to be logged if needed for debugging
  // Uncomment the line below if you want to see other errors during development
  // originalError(...args)
})

// Prevent unhandled promise rejections from polluting output
process.on('unhandledRejection', (reason) => {
  // Only log if it's not a jsdom-related error
  if (reason && typeof reason === 'object' && 'message' in reason) {
    const message = (reason as Error).message
    if (!message.includes('Not implemented: HTMLMediaElement')) {
      // Uncomment if you want to see unhandled rejections during development
      // console.error('Unhandled Rejection:', reason)
    }
  }
})

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
