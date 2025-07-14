import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, clearAuth, mockAuthenticatedUser } from './setup/testUtils'
import { server } from './setup/mswServer'
import { http, HttpResponse } from 'msw'
import App from '../../App'

// Set up MSW server
import './setup/mswServer'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

describe.skip('Search Integration Tests', () => {
  beforeEach(() => {
    clearAuth()
    mockAuthenticatedUser()
  })

  describe('Search Functionality', () => {
    it('should search episodes by query', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(`${API_URL}/api/search`, ({ request }) => {
          const url = new URL(request.url)
          const query = url.searchParams.get('q')

          if (query === 'javascript') {
            return HttpResponse.json({
              results: [
                {
                  episodeId: 'js-1',
                  podcastId: 'tech-podcast',
                  episodeTitle: 'JavaScript Best Practices',
                  podcastTitle: 'Tech Talks',
                  description: 'Learn modern JavaScript patterns and practices',
                  releaseDate: '2024-01-20',
                  imageUrl: 'https://example.com/js.jpg',
                  relevanceScore: 0.98,
                },
                {
                  episodeId: 'js-2',
                  podcastId: 'web-dev',
                  episodeTitle: 'Async JavaScript Deep Dive',
                  podcastTitle: 'Web Dev Weekly',
                  description: 'Understanding promises and async/await',
                  releaseDate: '2024-01-15',
                  imageUrl: 'https://example.com/async.jpg',
                  relevanceScore: 0.92,
                },
              ],
              totalResults: 2,
              searchTime: 0.245,
            })
          }

          return HttpResponse.json({
            results: [],
            totalResults: 0,
            searchTime: 0.1,
          })
        }),
      )

      render(<App />)

      // Navigate to search
      const searchLink = await screen.findByText(/search/i)
      await user.click(searchLink)

      // Enter search query
      const searchInput = await screen.findByPlaceholderText(/search episodes|search podcasts/i)
      await user.type(searchInput, 'javascript')

      // Wait for debounce and results
      const jsEpisode1 = await screen.findByText('JavaScript Best Practices')
      const jsEpisode2 = await screen.findByText('Async JavaScript Deep Dive')

      expect(jsEpisode1).toBeInTheDocument()
      expect(jsEpisode2).toBeInTheDocument()

      // Should show result count
      const resultCount = await screen.findByText(/2 results/i)
      expect(resultCount).toBeInTheDocument()
    })

    it('should filter search by type', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(`${API_URL}/api/search`, ({ request }) => {
          const url = new URL(request.url)
          const query = url.searchParams.get('q')
          const filter = url.searchParams.get('filter')

          if (query === 'tech' && filter === 'title') {
            return HttpResponse.json({
              results: [
                {
                  episodeId: 'title-match',
                  podcastId: 'podcast-1',
                  episodeTitle: 'Tech Trends 2024',
                  podcastTitle: 'Future Cast',
                  description: 'Looking at emerging technologies',
                  releaseDate: '2024-01-25',
                  imageUrl: 'https://example.com/trends.jpg',
                  relevanceScore: 1.0,
                },
              ],
              totalResults: 1,
              searchTime: 0.15,
            })
          }

          if (query === 'tech' && filter === 'description') {
            return HttpResponse.json({
              results: [
                {
                  episodeId: 'desc-match',
                  podcastId: 'podcast-2',
                  episodeTitle: 'Morning News Update',
                  podcastTitle: 'Daily Brief',
                  description: 'Today we discuss tech industry layoffs',
                  releaseDate: '2024-01-24',
                  imageUrl: 'https://example.com/news.jpg',
                  relevanceScore: 0.85,
                },
              ],
              totalResults: 1,
              searchTime: 0.18,
            })
          }

          return HttpResponse.json({
            results: [],
            totalResults: 0,
            searchTime: 0.1,
          })
        }),
      )

      render(<App />)

      const searchLink = await screen.findByText(/search/i)
      await user.click(searchLink)

      const searchInput = await screen.findByPlaceholderText(/search/i)
      await user.type(searchInput, 'tech')

      // Default should search all fields
      await waitFor(() => {
        expect(screen.queryByText('Tech Trends 2024')).not.toBeInTheDocument()
      })

      // Filter by title
      const titleFilter = await screen.findByRole('button', { name: /title/i })
      await user.click(titleFilter)

      const titleResult = await screen.findByText('Tech Trends 2024')
      expect(titleResult).toBeInTheDocument()
      expect(screen.queryByText('Morning News Update')).not.toBeInTheDocument()

      // Filter by description
      const descFilter = await screen.findByRole('button', { name: /description/i })
      await user.click(descFilter)

      const descResult = await screen.findByText('Morning News Update')
      expect(descResult).toBeInTheDocument()
      expect(screen.queryByText('Tech Trends 2024')).not.toBeInTheDocument()
    })

    it('should handle no search results', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(`${API_URL}/api/search`, () => {
          return HttpResponse.json({
            results: [],
            totalResults: 0,
            searchTime: 0.08,
          })
        }),
      )

      render(<App />)

      const searchLink = await screen.findByText(/search/i)
      await user.click(searchLink)

      const searchInput = await screen.findByPlaceholderText(/search/i)
      await user.type(searchInput, 'nonexistentquery123')

      const noResults = await screen.findByText(/no results found|no episodes found|try different keywords/i)
      expect(noResults).toBeInTheDocument()
    })

    it('should debounce search requests', async () => {
      const user = userEvent.setup({ delay: null }) // Remove delay for faster typing
      let searchCount = 0

      server.use(
        http.get(`${API_URL}/api/search`, () => {
          searchCount++
          return HttpResponse.json({
            results: [],
            totalResults: 0,
            searchTime: 0.1,
          })
        }),
      )

      render(<App />)

      const searchLink = await screen.findByText(/search/i)
      await user.click(searchLink)

      const searchInput = await screen.findByPlaceholderText(/search/i)

      // Type quickly
      await user.type(searchInput, 'test')

      // Wait for debounce
      await waitFor(
        () => {
          // Should only make one request after debounce, not 4
          expect(searchCount).toBeLessThan(4)
        },
        { timeout: 1000 },
      )
    })

    it('should handle special characters in search', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(`${API_URL}/api/search`, ({ request }) => {
          const url = new URL(request.url)
          const query = url.searchParams.get('q')

          // Verify special characters are properly encoded
          if (query === 'C++ & algorithms') {
            return HttpResponse.json({
              results: [
                {
                  episodeId: 'special-chars',
                  podcastId: 'coding-podcast',
                  episodeTitle: 'C++ & Algorithms Explained',
                  podcastTitle: 'Code Masters',
                  description: 'Deep dive into C++ algorithms',
                  releaseDate: '2024-01-18',
                  imageUrl: 'https://example.com/cpp.jpg',
                  relevanceScore: 0.95,
                },
              ],
              totalResults: 1,
              searchTime: 0.22,
            })
          }

          return HttpResponse.json({
            results: [],
            totalResults: 0,
            searchTime: 0.1,
          })
        }),
      )

      render(<App />)

      const searchLink = await screen.findByText(/search/i)
      await user.click(searchLink)

      const searchInput = await screen.findByPlaceholderText(/search/i)
      await user.type(searchInput, 'C++ & algorithms')

      const result = await screen.findByText('C++ & Algorithms Explained')
      expect(result).toBeInTheDocument()
    })
  })

  describe('Search Results Interaction', () => {
    it('should play episode from search results', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(`${API_URL}/api/search`, () => {
          return HttpResponse.json({
            results: [
              {
                episodeId: 'play-from-search',
                podcastId: 'podcast-1',
                episodeTitle: 'Playable Search Result',
                podcastTitle: 'Test Podcast',
                description: 'Click to play this episode',
                releaseDate: '2024-01-20',
                imageUrl: 'https://example.com/play.jpg',
                relevanceScore: 0.9,
              },
            ],
            totalResults: 1,
            searchTime: 0.15,
          })
        }),
      )

      render(<App />)

      const searchLink = await screen.findByText(/search/i)
      await user.click(searchLink)

      const searchInput = await screen.findByPlaceholderText(/search/i)
      await user.type(searchInput, 'playable')

      await screen.findByText('Playable Search Result')

      const playButton = screen.getByRole('button', { name: /play/i })
      await user.click(playButton)

      // Should show media player
      const mediaPlayer = await screen.findByTestId('floating-media-player')
      expect(mediaPlayer).toBeInTheDocument()
    })

    it('should navigate to episode detail from search', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(`${API_URL}/api/search`, () => {
          return HttpResponse.json({
            results: [
              {
                episodeId: 'detail-nav',
                podcastId: 'podcast-1',
                episodeTitle: 'Click for Details',
                podcastTitle: 'Info Podcast',
                description: 'Navigate to see more information',
                releaseDate: '2024-01-19',
                imageUrl: 'https://example.com/detail.jpg',
                relevanceScore: 0.88,
              },
            ],
            totalResults: 1,
            searchTime: 0.12,
          })
        }),
      )

      render(<App />)

      const searchLink = await screen.findByText(/search/i)
      await user.click(searchLink)

      const searchInput = await screen.findByPlaceholderText(/search/i)
      await user.type(searchInput, 'details')

      const episodeTitle = await screen.findByText('Click for Details')
      await user.click(episodeTitle)

      // Should navigate to episode detail page
      await waitFor(() => {
        expect(window.location.pathname).toContain('/episode/')
      })
    })
  })

  describe('Search Error Handling', () => {
    it('should handle search API errors', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(`${API_URL}/api/search`, () => {
          return HttpResponse.json({ error: 'Search service unavailable' }, { status: 503 })
        }),
      )

      render(<App />)

      const searchLink = await screen.findByText(/search/i)
      await user.click(searchLink)

      const searchInput = await screen.findByPlaceholderText(/search/i)
      await user.type(searchInput, 'error test')

      const errorMessage = await screen.findByText(/search unavailable|error searching|try again/i)
      expect(errorMessage).toBeInTheDocument()
    })

    it('should handle network timeouts gracefully', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(`${API_URL}/api/search`, async () => {
          // Simulate timeout
          await new Promise(resolve => setTimeout(resolve, 5000))
          return HttpResponse.json({ results: [] })
        }),
      )

      render(<App />)

      const searchLink = await screen.findByText(/search/i)
      await user.click(searchLink)

      const searchInput = await screen.findByPlaceholderText(/search/i)
      await user.type(searchInput, 'timeout test')

      // Should show loading state
      const loading = await screen.findByTestId(/loading|spinner/i)
      expect(loading).toBeInTheDocument()

      // Eventually should show timeout error or handle gracefully
      const errorMessage = await screen.findByText(/taking too long|timeout|try again/i, {}, { timeout: 6000 })
      expect(errorMessage).toBeInTheDocument()
    })
  })

  describe('Search Persistence', () => {
    it('should maintain search query when navigating back', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(`${API_URL}/api/search`, () => {
          return HttpResponse.json({
            results: [
              {
                episodeId: 'persist-1',
                podcastId: 'podcast-1',
                episodeTitle: 'Persistent Result',
                podcastTitle: 'Test Podcast',
                description: 'This should persist',
                releaseDate: '2024-01-20',
                imageUrl: 'https://example.com/persist.jpg',
                relevanceScore: 0.9,
              },
            ],
            totalResults: 1,
            searchTime: 0.1,
          })
        }),
      )

      render(<App />)

      const searchLink = await screen.findByText(/search/i)
      await user.click(searchLink)

      const searchInput = await screen.findByPlaceholderText(/search/i)
      await user.type(searchInput, 'persistent')

      await screen.findByText('Persistent Result')

      // Navigate away
      const homeLink = await screen.findByText(/home/i)
      await user.click(homeLink)

      // Navigate back to search
      const searchLinkAgain = await screen.findByText(/search/i)
      await user.click(searchLinkAgain)

      // Query should still be there
      const searchInputAgain = screen.getByPlaceholderText(/search/i) as HTMLInputElement
      expect(searchInputAgain.value).toBe('persistent')

      // Results should still be visible
      expect(screen.getByText('Persistent Result')).toBeInTheDocument()
    })
  })
})
