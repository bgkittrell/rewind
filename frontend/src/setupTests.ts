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

// Mock console methods for cleaner test output
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    warn: vi.fn(),
    error: vi.fn(),
  }
}
