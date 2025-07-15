import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, clearAuth, mockAuthenticatedUser } from './setup/testUtils'
import { server } from './setup/mswServer'
import { http, HttpResponse } from 'msw'
import App from '../../App'

// Set up MSW server
import './setup/mswServer'

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

describe.skip('Recommendations Integration Tests', () => {
  beforeEach(() => {
    clearAuth()
    mockAuthenticatedUser()
  })

  describe('Recommendation Display', () => {
    it('should display personalized recommendations', async () => {
      server.use(
        http.get(`${API_URL}/api/recommendations`, () => {
          return HttpResponse.json({
            recommendations: [
              {
                episodeId: 'rec-1',
                podcastId: 'podcast-1',
                episodeTitle: 'The Future of AI',
                podcastTitle: 'Tech Talks',
                description: 'Exploring artificial intelligence trends',
                releaseDate: '2024-01-15',
                imageUrl: 'https://example.com/ai.jpg',
                score: 0.95,
                feedback: null,
              },
              {
                episodeId: 'rec-2',
                podcastId: 'podcast-2',
                episodeTitle: 'Climate Change Solutions',
                podcastTitle: 'Science Weekly',
                description: 'Innovative approaches to climate issues',
                releaseDate: '2024-01-10',
                imageUrl: 'https://example.com/climate.jpg',
                score: 0.89,
                feedback: null,
              },
            ],
          })
        }),
      )

      render(<App />)

      // Navigate to home/recommendations
      const homeLink = await screen.findByText(/home|discover/i)
      await userEvent.click(homeLink)

      // Should display recommendations
      const aiEpisode = await screen.findByText('The Future of AI')
      const climateEpisode = await screen.findByText('Climate Change Solutions')

      expect(aiEpisode).toBeInTheDocument()
      expect(climateEpisode).toBeInTheDocument()
    })

    it('should filter recommendations by recency', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(`${API_URL}/api/recommendations`, ({ request }) => {
          const url = new URL(request.url)
          const filter = url.searchParams.get('filter')

          if (filter === 'recent') {
            return HttpResponse.json({
              recommendations: [
                {
                  episodeId: 'recent-1',
                  podcastId: 'podcast-1',
                  episodeTitle: "Yesterday's News",
                  podcastTitle: 'Daily Updates',
                  description: 'Latest happenings',
                  releaseDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                  imageUrl: 'https://example.com/recent.jpg',
                  score: 0.92,
                  feedback: null,
                },
              ],
            })
          }

          // Default recommendations
          return HttpResponse.json({
            recommendations: [
              {
                episodeId: 'old-1',
                podcastId: 'podcast-2',
                episodeTitle: 'Classic Episode',
                podcastTitle: 'Timeless Talks',
                description: 'An older but great episode',
                releaseDate: '2023-01-01',
                imageUrl: 'https://example.com/classic.jpg',
                score: 0.95,
                feedback: null,
              },
            ],
          })
        }),
      )

      render(<App />)

      // Should show default recommendations
      const classicEpisode = await screen.findByText('Classic Episode')
      expect(classicEpisode).toBeInTheDocument()

      // Apply recent filter
      const recentFilter = await screen.findByRole('button', { name: /recent|this week/i })
      await user.click(recentFilter)

      // Should show only recent episodes
      const recentEpisode = await screen.findByText("Yesterday's News")
      expect(recentEpisode).toBeInTheDocument()
      expect(screen.queryByText('Classic Episode')).not.toBeInTheDocument()
    })

    it('should handle empty recommendations gracefully', async () => {
      server.use(
        http.get(`${API_URL}/api/recommendations`, () => {
          return HttpResponse.json({
            recommendations: [],
          })
        }),
      )

      render(<App />)

      const emptyMessage = await screen.findByText(/no recommendations|check back later|listen to more/i)
      expect(emptyMessage).toBeInTheDocument()
    })
  })

  describe('Recommendation Feedback', () => {
    it('should submit positive feedback', async () => {
      const user = userEvent.setup()
      let feedbackReceived: any = null

      server.use(
        http.get(`${API_URL}/api/recommendations`, () => {
          return HttpResponse.json({
            recommendations: [
              {
                episodeId: 'feedback-test',
                podcastId: 'podcast-1',
                episodeTitle: 'Feedback Test Episode',
                podcastTitle: 'Test Podcast',
                description: 'Testing feedback',
                releaseDate: '2024-01-01',
                imageUrl: 'https://example.com/test.jpg',
                score: 0.85,
                feedback: null,
              },
            ],
          })
        }),
        http.post(`${API_URL}/api/recommendations/feedback`, async ({ request }) => {
          feedbackReceived = await request.json()
          return HttpResponse.json({ message: 'Feedback recorded' })
        }),
      )

      render(<App />)

      // Find the recommendation
      await screen.findByText('Feedback Test Episode')

      // Click thumbs up
      const thumbsUpButton = screen.getByRole('button', { name: /thumbs up|like/i })
      await user.click(thumbsUpButton)

      // Verify feedback was sent
      await waitFor(() => {
        expect(feedbackReceived).toEqual({
          episodeId: 'feedback-test',
          feedback: 'up',
        })
      })

      // Button should show active state
      expect(thumbsUpButton).toHaveClass(/active|selected/i)
    })

    it('should submit negative feedback', async () => {
      const user = userEvent.setup()
      let feedbackReceived: any = null

      server.use(
        http.get(`${API_URL}/api/recommendations`, () => {
          return HttpResponse.json({
            recommendations: [
              {
                episodeId: 'dislike-test',
                podcastId: 'podcast-1',
                episodeTitle: 'Not My Style',
                podcastTitle: 'Test Podcast',
                description: 'Testing negative feedback',
                releaseDate: '2024-01-01',
                imageUrl: 'https://example.com/test.jpg',
                score: 0.75,
                feedback: null,
              },
            ],
          })
        }),
        http.post(`${API_URL}/api/recommendations/feedback`, async ({ request }) => {
          feedbackReceived = await request.json()
          return HttpResponse.json({ message: 'Feedback recorded' })
        }),
      )

      render(<App />)

      await screen.findByText('Not My Style')

      // Click thumbs down
      const thumbsDownButton = screen.getByRole('button', { name: /thumbs down|dislike/i })
      await user.click(thumbsDownButton)

      // Verify feedback was sent
      await waitFor(() => {
        expect(feedbackReceived).toEqual({
          episodeId: 'dislike-test',
          feedback: 'down',
        })
      })
    })

    it('should update recommendation after feedback', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(`${API_URL}/api/recommendations`, () => {
          return HttpResponse.json({
            recommendations: [
              {
                episodeId: 'hide-after-dislike',
                podcastId: 'podcast-1',
                episodeTitle: 'This Will Be Hidden',
                podcastTitle: 'Test Podcast',
                description: 'Should disappear after dislike',
                releaseDate: '2024-01-01',
                imageUrl: 'https://example.com/test.jpg',
                score: 0.7,
                feedback: null,
              },
            ],
          })
        }),
        http.post(`${API_URL}/api/recommendations/feedback`, () => {
          return HttpResponse.json({ message: 'Feedback recorded' })
        }),
      )

      render(<App />)

      const episodeTitle = await screen.findByText('This Will Be Hidden')
      expect(episodeTitle).toBeInTheDocument()

      // Dislike the episode
      const thumbsDownButton = screen.getByRole('button', { name: /thumbs down|dislike/i })
      await user.click(thumbsDownButton)

      // Episode should be removed from recommendations
      await waitFor(() => {
        expect(screen.queryByText('This Will Be Hidden')).not.toBeInTheDocument()
      })
    })
  })

  describe('Play Tracking', () => {
    it('should track play events from recommendations', async () => {
      const user = userEvent.setup()
      let playEventReceived: any = null

      server.use(
        http.get(`${API_URL}/api/recommendations`, () => {
          return HttpResponse.json({
            recommendations: [
              {
                episodeId: 'track-play',
                podcastId: 'podcast-1',
                episodeTitle: 'Track This Play',
                podcastTitle: 'Analytics Podcast',
                description: 'Testing play tracking',
                releaseDate: '2024-01-01',
                imageUrl: 'https://example.com/track.jpg',
                score: 0.88,
                feedback: null,
              },
            ],
          })
        }),
        http.post(`${API_URL}/api/recommendations/play`, async ({ request }) => {
          playEventReceived = await request.json()
          return HttpResponse.json({ message: 'Play tracked' })
        }),
      )

      render(<App />)

      await screen.findByText('Track This Play')

      // Click play button
      const playButton = screen.getByRole('button', { name: /play/i })
      await user.click(playButton)

      // Verify play event was tracked
      await waitFor(() => {
        expect(playEventReceived).toMatchObject({
          episodeId: 'track-play',
          context: {
            source: 'recommendations',
            score: 0.88,
          },
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle recommendation API errors gracefully', async () => {
      server.use(
        http.get(`${API_URL}/api/recommendations`, () => {
          return HttpResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 })
        }),
      )

      render(<App />)

      const errorMessage = await screen.findByText(/error loading recommendations|something went wrong/i)
      expect(errorMessage).toBeInTheDocument()

      // Should show retry option
      const retryButton = screen.getByRole('button', { name: /retry|try again/i })
      expect(retryButton).toBeInTheDocument()
    })

    it('should handle feedback submission errors', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(`${API_URL}/api/recommendations`, () => {
          return HttpResponse.json({
            recommendations: [
              {
                episodeId: 'feedback-error',
                podcastId: 'podcast-1',
                episodeTitle: 'Feedback Error Test',
                podcastTitle: 'Test Podcast',
                description: 'Testing feedback errors',
                releaseDate: '2024-01-01',
                imageUrl: 'https://example.com/test.jpg',
                score: 0.8,
                feedback: null,
              },
            ],
          })
        }),
        http.post(`${API_URL}/api/recommendations/feedback`, () => {
          return HttpResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
        }),
      )

      render(<App />)

      await screen.findByText('Feedback Error Test')

      const thumbsUpButton = screen.getByRole('button', { name: /thumbs up|like/i })
      await user.click(thumbsUpButton)

      // Should show error toast/message
      const errorMessage = await screen.findByText(/failed to save feedback|try again/i)
      expect(errorMessage).toBeInTheDocument()
    })
  })
})
