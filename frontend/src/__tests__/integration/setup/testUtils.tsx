import React from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Custom render function that includes all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialAuth?: {
    isAuthenticated: boolean
    user?: any
    token?: string
  }
}

export function renderWithProviders(
  ui: React.ReactElement,
  { initialAuth = { isAuthenticated: false }, ...renderOptions }: CustomRenderOptions = {},
) {
  // For integration tests, we need to render the full App component
  // The ui parameter is expected to be the App component
  return render(ui, renderOptions)
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { renderWithProviders as render }

// Helper to wait for loading states to resolve
export async function waitForLoadingToFinish(screen: any) {
  const loadingElements = screen.queryAllByTestId(/loading|spinner|skeleton/i)
  if (loadingElements.length > 0) {
    await screen.findByTestId(/loading|spinner|skeleton/i, { hidden: true })
  }
}

// Helper to simulate authenticated user
export function mockAuthenticatedUser() {
  // Set up localStorage as the auth system might use it
  localStorage.setItem('authToken', 'mock-jwt-token')
  localStorage.setItem(
    'user',
    JSON.stringify({
      email: 'test@example.com',
      name: 'Test User',
      id: 'user-123',
    }),
  )
}

// Helper to clear auth
export function clearAuth() {
  localStorage.removeItem('authToken')
  localStorage.removeItem('user')
}

// Common test data factories
export const testData = {
  user: {
    email: 'test@example.com',
    name: 'Test User',
    id: 'user-123',
  },
  podcast: {
    id: 'podcast-123',
    title: 'Test Podcast',
    description: 'A test podcast',
    rssFeedUrl: 'https://example.com/rss',
    imageUrl: 'https://example.com/image.jpg',
    author: 'Test Author',
    categories: ['Technology'],
    createdAt: '2024-01-01T00:00:00Z',
  },
  episode: {
    id: 'episode-123',
    podcastId: 'podcast-123',
    title: 'Test Episode',
    description: 'A test episode',
    audioUrl: 'https://example.com/audio.mp3',
    duration: 3600,
    publishedAt: '2024-01-01T00:00:00Z',
    imageUrl: 'https://example.com/episode.jpg',
    playbackPosition: 0,
  },
}
