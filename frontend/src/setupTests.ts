// Setup for vitest testing environment
import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock global fetch for tests
global.fetch = vi.fn()

// Mock URL constructor for test environment
global.URL = global.URL || URL

// Mock console methods for cleaner test output
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    warn: vi.fn(),
    error: vi.fn(),
  }
}
