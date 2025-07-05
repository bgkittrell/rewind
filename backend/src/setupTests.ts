// Setup for backend vitest testing environment
import { vi } from 'vitest'

// Store original console for potential debugging
const originalConsole = { ...console }

// Mock console methods to suppress output during tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}

// Suppress specific error patterns that pollute stderr
const originalError = global.console.error
global.console.error = vi.fn((...args: any[]) => {
  const message = args[0]?.toString() || ''

  // Suppress common test error patterns
  if (
    message.includes('Error extracting guests with Bedrock:') ||
    message.includes('Error getting podcasts:') ||
    message.includes('Error adding podcast:') ||
    message.includes('Error deleting podcast:') ||
    message.includes('Error fixing episode image URLs:') ||
    message.includes('Error finding existing episode:') ||
    message.includes('Error creating episode:') ||
    message.includes('Error processing episode:') ||
    message.includes('Error parsing guest extraction response:') ||
    message.includes('Skipping invalid episode data:') ||
    message.includes('Network error') ||
    message.includes('Database error') ||
    message.includes('Connection timeout') ||
    message.includes('Access denied') ||
    message.includes('Unexpected error') ||
    message.includes('Failed to parse RSS feed:') ||
    message.includes('Podcast not found') ||
    message.includes('DynamoDB error') ||
    message.includes('Query error')
  ) {
    return // Suppress these intentional test error messages
  }

  // Allow other errors to be logged if needed for debugging
  // Uncomment the line below if you want to see other errors during development
  // originalError(...args)
})

// Suppress unhandled promise rejections from test scenarios
process.on('unhandledRejection', (reason) => {
  // Only log if it's not a test-related error
  if (reason && typeof reason === 'object' && 'message' in reason) {
    const message = (reason as Error).message
    if (
      !message.includes('Network error') &&
      !message.includes('Database error') &&
      !message.includes('Connection timeout') &&
      !message.includes('Failed to create episode')
    ) {
      // Uncomment if you want to see unhandled rejections during development
      // console.error('Unhandled Rejection:', reason)
    }
  }
})

// Mock Node.js fetch for tests
if (!global.fetch) {
  global.fetch = vi.fn()
}

// Note: AWS SDK mocks are handled by aws-sdk-client-mock in individual test files
// to avoid conflicts with the existing mocking library
