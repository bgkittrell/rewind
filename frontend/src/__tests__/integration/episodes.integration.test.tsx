import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, clearAuth, mockAuthenticatedUser } from './setup/testUtils'
import { server } from './setup/mswServer'
import { http, HttpResponse } from 'msw'
import App from '../../App'

// Set up MSW server
import './setup/mswServer'

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

describe.skip('Episode Integration Tests', () => {
  beforeEach(() => {
    clearAuth()
    mockAuthenticatedUser()
  })

  describe('Episode List', () => {
    it('should display podcast episodes', async () => {
      const user = userEvent.setup()

      // Mock podcast list first
      server.use(
        http.get(`${API_URL}/api/podcasts`, () => {
          return HttpResponse.json({
            podcasts: [
              {
                id: 'podcast-123',
                title: 'Tech Podcast',
                description: 'Tech discussions',
                rssFeedUrl: 'https://example.com/tech.rss',
                imageUrl: 'https://example.com/tech.jpg',
                author: 'Tech Host',
                categories: ['Technology'],
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
          })
        }),
        http.get(`${API_URL}/api/episodes/podcast-123`, () => {
          return HttpResponse.json({
            episodes: [
              {
                id: 'episode-1',
                podcastId: 'podcast-123',
                title: 'Episode 1: Introduction',
                description: 'Welcome to our podcast',
                audioUrl: 'https://example.com/ep1.mp3',
                duration: 1800,
                publishedAt: '2024-01-15T00:00:00Z',
                imageUrl: 'https://example.com/ep1.jpg',
                playbackPosition: 0,
              },
              {
                id: 'episode-2',
                podcastId: 'podcast-123',
                title: 'Episode 2: Deep Dive',
                description: 'Going deeper into tech',
                audioUrl: 'https://example.com/ep2.mp3',
                duration: 2400,
                publishedAt: '2024-01-22T00:00:00Z',
                imageUrl: 'https://example.com/ep2.jpg',
                playbackPosition: 50, // 50% complete
              },
            ],
          })
        }),
      )

      render(<App />)

      // Navigate to podcast detail
      const libraryLink = await screen.findByText(/library/i)
      await user.click(libraryLink)

      const podcastTitle = await screen.findByText('Tech Podcast')
      await user.click(podcastTitle)

      // Should display episodes
      const episode1 = await screen.findByText('Episode 1: Introduction')
      const episode2 = await screen.findByText('Episode 2: Deep Dive')

      expect(episode1).toBeInTheDocument()
      expect(episode2).toBeInTheDocument()

      // Should show progress for episode 2
      const progress = await screen.findByText(/50%/i)
      expect(progress).toBeInTheDocument()
    })

    it('should handle pagination for large episode lists', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(`${API_URL}/api/episodes/podcast-123`, ({ request }) => {
          const url = new URL(request.url)
          const lastKey = url.searchParams.get('lastEvaluatedKey')

          if (!lastKey) {
            // First page
            return HttpResponse.json({
              episodes: Array.from({ length: 20 }, (_, i) => ({
                id: `episode-${i + 1}`,
                podcastId: 'podcast-123',
                title: `Episode ${i + 1}`,
                description: `Description ${i + 1}`,
                audioUrl: `https://example.com/ep${i + 1}.mp3`,
                duration: 1800,
                publishedAt: new Date(2024, 0, i + 1).toISOString(),
                imageUrl: `https://example.com/ep${i + 1}.jpg`,
                playbackPosition: 0,
              })),
              lastEvaluatedKey: 'page-2',
            })
          } else {
            // Second page
            return HttpResponse.json({
              episodes: Array.from({ length: 10 }, (_, i) => ({
                id: `episode-${i + 21}`,
                podcastId: 'podcast-123',
                title: `Episode ${i + 21}`,
                description: `Description ${i + 21}`,
                audioUrl: `https://example.com/ep${i + 21}.mp3`,
                duration: 1800,
                publishedAt: new Date(2024, 0, i + 21).toISOString(),
                imageUrl: `https://example.com/ep${i + 21}.jpg`,
                playbackPosition: 0,
              })),
              lastEvaluatedKey: undefined,
            })
          }
        }),
      )

      render(<App />)

      // Navigate to episodes
      const podcastLink = await screen.findByText('Tech Podcast')
      await user.click(podcastLink)

      // Should show first 20 episodes
      const firstEpisode = await screen.findByText('Episode 1')
      expect(firstEpisode).toBeInTheDocument()

      // Should have load more button
      const loadMoreButton = await screen.findByRole('button', { name: /load more|show more/i })
      await user.click(loadMoreButton)

      // Should load additional episodes
      const laterEpisode = await screen.findByText('Episode 21')
      expect(laterEpisode).toBeInTheDocument()
    })
  })

  describe('Playback Progress', () => {
    it('should save playback progress', async () => {
      const user = userEvent.setup()

      let savedProgress: any = null

      server.use(
        http.get(`${API_URL}/api/episodes/podcast-123`, () => {
          return HttpResponse.json({
            episodes: [
              {
                id: 'episode-1',
                podcastId: 'podcast-123',
                title: 'Test Episode',
                description: 'Test',
                audioUrl: 'https://example.com/test.mp3',
                duration: 3600,
                publishedAt: '2024-01-01T00:00:00Z',
                imageUrl: 'https://example.com/test.jpg',
                playbackPosition: 0,
              },
            ],
          })
        }),
        http.post(`${API_URL}/api/episodes/episode-1/progress`, async ({ request }) => {
          savedProgress = await request.json()
          return HttpResponse.json({ message: 'Progress saved' })
        }),
      )

      render(<App />)

      // Play episode
      const playButton = await screen.findByRole('button', { name: /play/i })
      await user.click(playButton)

      // Simulate playback progress (this would normally happen via audio element events)
      // The media player should automatically save progress periodically

      // Wait for progress to be saved
      await waitFor(
        () => {
          expect(savedProgress).toBeTruthy()
        },
        { timeout: 5000 },
      )

      expect(savedProgress).toMatchObject({
        position: expect.any(Number),
        duration: expect.any(Number),
      })
    })

    it('should resume from saved position', async () => {
      server.use(
        http.get(`${API_URL}/api/episodes/podcast-123`, () => {
          return HttpResponse.json({
            episodes: [
              {
                id: 'episode-1',
                podcastId: 'podcast-123',
                title: 'Resume Test Episode',
                description: 'Test',
                audioUrl: 'https://example.com/resume.mp3',
                duration: 3600,
                publishedAt: '2024-01-01T00:00:00Z',
                imageUrl: 'https://example.com/resume.jpg',
                playbackPosition: 30, // 30% complete
              },
            ],
          })
        }),
      )

      render(<App />)

      // Should show resume button or indicator
      const resumeIndicator = await screen.findByText(/resume|continue|30%/i)
      expect(resumeIndicator).toBeInTheDocument()
    })
  })

  describe('Episode Player', () => {
    it('should play episode when play button is clicked', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(`${API_URL}/api/episodes/podcast-123`, () => {
          return HttpResponse.json({
            episodes: [
              {
                id: 'episode-1',
                podcastId: 'podcast-123',
                title: 'Playable Episode',
                description: 'Test playback',
                audioUrl: 'https://example.com/play.mp3',
                duration: 1800,
                publishedAt: '2024-01-01T00:00:00Z',
                imageUrl: 'https://example.com/play.jpg',
                playbackPosition: 0,
              },
            ],
          })
        }),
      )

      render(<App />)

      await screen.findByText('Playable Episode')
      const playButton = screen.getByRole('button', { name: /play/i })

      await user.click(playButton)

      // Should show media player
      const mediaPlayer = await screen.findByTestId('floating-media-player')
      expect(mediaPlayer).toBeInTheDocument()

      // Should display episode info in player
      const playerTitle = within(mediaPlayer).getByText('Playable Episode')
      expect(playerTitle).toBeInTheDocument()
    })

    it('should handle playback errors gracefully', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(`${API_URL}/api/episodes/podcast-123`, () => {
          return HttpResponse.json({
            episodes: [
              {
                id: 'episode-1',
                podcastId: 'podcast-123',
                title: 'Broken Episode',
                description: 'This will fail',
                audioUrl: 'https://example.com/broken.mp3',
                duration: 1800,
                publishedAt: '2024-01-01T00:00:00Z',
                imageUrl: 'https://example.com/broken.jpg',
                playbackPosition: 0,
              },
            ],
          })
        }),
      )

      render(<App />)

      const playButton = await screen.findByRole('button', { name: /play/i })
      await user.click(playButton)

      // Simulate audio error (this would be triggered by the audio element)
      // Should show error message
      const errorMessage = await screen.findByText(/failed to load|playback error/i)
      expect(errorMessage).toBeInTheDocument()
    })
  })

  describe('Episode Search and Filter', () => {
    it('should filter episodes by search term', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(`${API_URL}/api/episodes/podcast-123`, () => {
          return HttpResponse.json({
            episodes: [
              {
                id: 'episode-1',
                podcastId: 'podcast-123',
                title: 'JavaScript Basics',
                description: 'Learn JS fundamentals',
                audioUrl: 'https://example.com/js.mp3',
                duration: 1800,
                publishedAt: '2024-01-01T00:00:00Z',
                imageUrl: 'https://example.com/js.jpg',
                playbackPosition: 0,
              },
              {
                id: 'episode-2',
                podcastId: 'podcast-123',
                title: 'Python Introduction',
                description: 'Python for beginners',
                audioUrl: 'https://example.com/python.mp3',
                duration: 2400,
                publishedAt: '2024-01-08T00:00:00Z',
                imageUrl: 'https://example.com/python.jpg',
                playbackPosition: 0,
              },
            ],
          })
        }),
      )

      render(<App />)

      // Wait for episodes to load
      await screen.findByText('JavaScript Basics')
      await screen.findByText('Python Introduction')

      // Search for JavaScript
      const searchInput = await screen.findByPlaceholderText(/search episodes/i)
      await user.type(searchInput, 'JavaScript')

      // Should only show JavaScript episode
      expect(screen.getByText('JavaScript Basics')).toBeInTheDocument()
      expect(screen.queryByText('Python Introduction')).not.toBeInTheDocument()
    })
  })
})
