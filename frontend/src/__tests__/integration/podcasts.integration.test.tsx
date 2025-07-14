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

describe.skip('Podcast Integration Tests', () => {
  beforeEach(() => {
    clearAuth()
  })

  describe('Add Podcast Flow', () => {
    beforeEach(() => {
      mockAuthenticatedUser()
    })

    it('should successfully add a podcast with valid RSS URL', async () => {
      const user = userEvent.setup()

      // Set up handler for successful podcast addition
      server.use(
        http.post(`${API_URL}/api/podcasts`, async ({ request }) => {
          const body = (await request.json()) as { rssUrl: string }

          return HttpResponse.json({
            podcast: {
              id: 'new-podcast-123',
              title: 'Tech Talks Daily',
              description: 'Daily technology discussions',
              rssFeedUrl: body.rssUrl,
              imageUrl: 'https://example.com/tech-talks.jpg',
              author: 'Tech Media',
              categories: ['Technology'],
              createdAt: new Date().toISOString(),
            },
            episodeCount: 150,
          })
        }),
      )

      render(<App />)

      // Navigate to add podcast
      const addPodcastButton = await screen.findByText(/add podcast/i)
      await user.click(addPodcastButton)

      // Enter RSS URL
      const rssInput = await screen.findByLabelText(/rss url|podcast url/i)
      await user.type(rssInput, 'https://example.com/podcast.rss')

      // Submit
      const submitButton = screen.getByRole('button', { name: /add|subscribe/i })
      await user.click(submitButton)

      // Should show success message
      const successMessage = await screen.findByText(/added successfully|subscribed/i)
      expect(successMessage).toBeInTheDocument()

      // Should show episode count
      const episodeCount = await screen.findByText(/150 episodes/i)
      expect(episodeCount).toBeInTheDocument()
    })

    it('should show error for invalid RSS URL', async () => {
      const user = userEvent.setup()

      server.use(
        http.post(`${API_URL}/api/podcasts`, () => {
          return HttpResponse.json({ error: 'Invalid RSS feed URL' }, { status: 400 })
        }),
      )

      render(<App />)

      const addPodcastButton = await screen.findByText(/add podcast/i)
      await user.click(addPodcastButton)

      const rssInput = await screen.findByLabelText(/rss url|podcast url/i)
      await user.type(rssInput, 'not-a-valid-url')

      const submitButton = screen.getByRole('button', { name: /add|subscribe/i })
      await user.click(submitButton)

      const errorMessage = await screen.findByText(/invalid rss|invalid url/i)
      expect(errorMessage).toBeInTheDocument()
    })

    it('should handle podcast already exists error', async () => {
      const user = userEvent.setup()

      server.use(
        http.post(`${API_URL}/api/podcasts`, () => {
          return HttpResponse.json({ error: 'Podcast already in your library' }, { status: 409 })
        }),
      )

      render(<App />)

      const addPodcastButton = await screen.findByText(/add podcast/i)
      await user.click(addPodcastButton)

      const rssInput = await screen.findByLabelText(/rss url|podcast url/i)
      await user.type(rssInput, 'https://example.com/existing.rss')

      const submitButton = screen.getByRole('button', { name: /add|subscribe/i })
      await user.click(submitButton)

      const errorMessage = await screen.findByText(/already in your library|already subscribed/i)
      expect(errorMessage).toBeInTheDocument()
    })
  })

  describe('List Podcasts', () => {
    it('should display user podcasts', async () => {
      mockAuthenticatedUser()

      server.use(
        http.get(`${API_URL}/api/podcasts`, () => {
          return HttpResponse.json({
            podcasts: [
              {
                id: 'podcast-1',
                title: 'Tech Talks',
                description: 'Technology discussions',
                rssFeedUrl: 'https://example.com/tech.rss',
                imageUrl: 'https://example.com/tech.jpg',
                author: 'Tech Host',
                categories: ['Technology'],
                createdAt: '2024-01-01T00:00:00Z',
              },
              {
                id: 'podcast-2',
                title: 'Science Weekly',
                description: 'Weekly science news',
                rssFeedUrl: 'https://example.com/science.rss',
                imageUrl: 'https://example.com/science.jpg',
                author: 'Science Team',
                categories: ['Science'],
                createdAt: '2024-01-02T00:00:00Z',
              },
            ],
          })
        }),
      )

      render(<App />)

      // Navigate to library
      const libraryLink = await screen.findByText(/library|my podcasts/i)
      await userEvent.click(libraryLink)

      // Should display both podcasts
      const techPodcast = await screen.findByText('Tech Talks')
      const sciencePodcast = await screen.findByText('Science Weekly')

      expect(techPodcast).toBeInTheDocument()
      expect(sciencePodcast).toBeInTheDocument()
    })

    it('should show empty state when no podcasts', async () => {
      mockAuthenticatedUser()

      server.use(
        http.get(`${API_URL}/api/podcasts`, () => {
          return HttpResponse.json({ podcasts: [] })
        }),
      )

      render(<App />)

      const libraryLink = await screen.findByText(/library|my podcasts/i)
      await userEvent.click(libraryLink)

      const emptyMessage = await screen.findByText(/no podcasts|add your first podcast/i)
      expect(emptyMessage).toBeInTheDocument()
    })

    it('should require authentication to view podcasts', async () => {
      // No auth setup
      server.use(
        http.get(`${API_URL}/api/podcasts`, () => {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }),
      )

      render(<App />)

      // Try to navigate to library
      window.history.pushState({}, '', '/library')

      // Should redirect to login
      const loginPrompt = await screen.findByText(/sign in|log in/i)
      expect(loginPrompt).toBeInTheDocument()
    })
  })

  describe('Delete Podcast', () => {
    beforeEach(() => {
      mockAuthenticatedUser()
    })

    it('should successfully delete a podcast', async () => {
      const user = userEvent.setup()

      // Set up initial podcasts list
      server.use(
        http.get(`${API_URL}/api/podcasts`, () => {
          return HttpResponse.json({
            podcasts: [
              {
                id: 'podcast-to-delete',
                title: 'Podcast to Delete',
                description: 'This will be deleted',
                rssFeedUrl: 'https://example.com/delete.rss',
                imageUrl: 'https://example.com/delete.jpg',
                author: 'Delete Author',
                categories: ['Test'],
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
          })
        }),
        http.delete(`${API_URL}/api/podcasts/podcast-to-delete`, () => {
          return new HttpResponse(null, { status: 204 })
        }),
      )

      render(<App />)

      const libraryLink = await screen.findByText(/library|my podcasts/i)
      await user.click(libraryLink)

      // Find the podcast
      const podcastTitle = await screen.findByText('Podcast to Delete')
      expect(podcastTitle).toBeInTheDocument()

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete|remove/i })
      await user.click(deleteButton)

      // Confirm deletion
      const confirmButton = await screen.findByRole('button', { name: /confirm|yes/i })
      await user.click(confirmButton)

      // Podcast should be removed
      await waitFor(() => {
        expect(screen.queryByText('Podcast to Delete')).not.toBeInTheDocument()
      })
    })

    it('should handle delete errors gracefully', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(`${API_URL}/api/podcasts`, () => {
          return HttpResponse.json({
            podcasts: [
              {
                id: 'podcast-1',
                title: 'Test Podcast',
                description: 'Test',
                rssFeedUrl: 'https://example.com/test.rss',
                imageUrl: 'https://example.com/test.jpg',
                author: 'Test',
                categories: ['Test'],
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
          })
        }),
        http.delete(`${API_URL}/api/podcasts/podcast-1`, () => {
          return HttpResponse.json({ error: 'Failed to delete podcast' }, { status: 500 })
        }),
      )

      render(<App />)

      const libraryLink = await screen.findByText(/library|my podcasts/i)
      await user.click(libraryLink)

      const deleteButton = await screen.findByRole('button', { name: /delete|remove/i })
      await user.click(deleteButton)

      const confirmButton = await screen.findByRole('button', { name: /confirm|yes/i })
      await user.click(confirmButton)

      // Should show error message
      const errorMessage = await screen.findByText(/failed to delete|error deleting/i)
      expect(errorMessage).toBeInTheDocument()

      // Podcast should still be there
      expect(screen.getByText('Test Podcast')).toBeInTheDocument()
    })
  })
})
