import { http, HttpResponse } from 'msw'
import {
  signupResponses,
  signinResponses,
  confirmResponses,
  resendResponses,
  validTokens,
} from '../fixtures/auth.fixtures'
import type { SignupRequest, SigninRequest, ConfirmRequest, ResendRequest } from '../types/api.types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Auth handlers
export const authHandlers = [
  // Signup
  http.post<never, SignupRequest>(`${API_BASE_URL}/api/auth/signup`, async ({ request }) => {
    const body = await request.json()

    // Simulate existing user
    if (body.email === 'existing@example.com') {
      return HttpResponse.json(signupResponses.emailExists, { status: 400 })
    }

    // Simulate weak password
    if (body.password.length < 8) {
      return HttpResponse.json(signupResponses.invalidPassword, { status: 400 })
    }

    // Success case
    return HttpResponse.json(signupResponses.success)
  }),

  // Signin
  http.post<never, SigninRequest>(`${API_BASE_URL}/api/auth/signin`, async ({ request }) => {
    const body = await request.json()

    // Simulate user not found
    if (body.email === 'notfound@example.com') {
      return HttpResponse.json(signinResponses.userNotFound, { status: 400 })
    }

    // Simulate unconfirmed user
    if (body.email === 'unconfirmed@example.com') {
      return HttpResponse.json(signinResponses.userNotConfirmed, { status: 400 })
    }

    // Simulate invalid password
    if (body.password === 'wrongpassword') {
      return HttpResponse.json(signinResponses.invalidCredentials, { status: 401 })
    }

    // Success case
    return HttpResponse.json(signinResponses.success)
  }),

  // Confirm
  http.post<never, ConfirmRequest>(`${API_BASE_URL}/api/auth/confirm`, async ({ request }) => {
    const body = await request.json()

    // Simulate invalid code
    if (body.code === '000000') {
      return HttpResponse.json(confirmResponses.invalidCode, { status: 400 })
    }

    // Simulate expired code
    if (body.code === '999999') {
      return HttpResponse.json(confirmResponses.codeExpired, { status: 400 })
    }

    // Success case
    return HttpResponse.json(confirmResponses.success)
  }),

  // Resend
  http.post<never, ResendRequest>(`${API_BASE_URL}/api/auth/resend`, async ({ request }) => {
    const body = await request.json()

    // Simulate user not found
    if (body.email === 'notfound@example.com') {
      return HttpResponse.json(resendResponses.userNotFound, { status: 400 })
    }

    // Simulate already confirmed
    if (body.email === 'confirmed@example.com') {
      return HttpResponse.json(resendResponses.userAlreadyConfirmed, { status: 400 })
    }

    // Success case
    return HttpResponse.json(resendResponses.success)
  }),

  // Token refresh (placeholder - implement when needed)
  http.post(`${API_BASE_URL}/api/auth/refresh`, async ({ request }) => {
    const body = await request.json()

    // Check if refresh token is expired
    if (body.refreshToken === 'expired-refresh-token') {
      return HttpResponse.json({ error: 'Refresh token expired' }, { status: 401 })
    }

    // Success case - return new tokens
    return HttpResponse.json({
      ...validTokens,
      refreshToken: body.refreshToken, // Keep same refresh token
    })
  }),
]

// Podcast handlers
export const podcastHandlers = [
  // Add podcast
  http.post<never, { rssUrl: string }>(`${API_BASE_URL}/api/podcasts`, async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Simulate invalid URL
    if (body.rssUrl === 'not-a-valid-url') {
      return HttpResponse.json({ error: 'Invalid RSS feed', details: 'Invalid URL format' }, { status: 400 })
    }

    // Simulate existing podcast
    if (body.rssUrl === 'https://example.com/existing.rss') {
      return HttpResponse.json(
        { error: 'Podcast already exists', details: 'You have already added this podcast' },
        { status: 400 },
      )
    }

    // Simulate not found
    if (body.rssUrl === 'https://example.com/404.rss') {
      return HttpResponse.json({ error: 'RSS feed not found', details: 'The RSS URL returned 404' }, { status: 404 })
    }

    // Success case
    return HttpResponse.json({
      podcast: {
        podcastId: 'new-podcast-id',
        userId: 'test-user-123',
        title: 'New Podcast',
        author: 'Podcast Author',
        description: 'A great new podcast',
        imageUrl: 'https://example.com/new-podcast.jpg',
        rssUrl: body.rssUrl,
        categories: ['General'],
        createdAt: new Date().toISOString(),
        lastFetched: new Date().toISOString(),
      },
      episodeCount: 10,
    })
  }),

  // Get podcasts
  http.get(`${API_BASE_URL}/api/podcasts`, ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return HttpResponse.json({
      podcasts: [
        {
          podcastId: 'podcast-1',
          userId: 'test-user-123',
          title: 'The Daily Tech Talk',
          author: 'Tech News Network',
          description: 'Daily updates on the latest in technology',
          imageUrl: 'https://example.com/tech-talk.jpg',
          rssUrl: 'https://example.com/tech-talk.rss',
          categories: ['Technology', 'News'],
          createdAt: '2024-01-01T00:00:00Z',
          lastFetched: '2024-01-15T00:00:00Z',
        },
      ],
    })
  }),

  // Delete podcast
  http.delete(`${API_BASE_URL}/api/podcasts/:podcastId`, ({ request, params }) => {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { podcastId } = params

    // Simulate not found
    if (podcastId === 'not-found') {
      return HttpResponse.json({ error: 'Podcast not found' }, { status: 404 })
    }

    // Success case - return 204 No Content
    return new HttpResponse(null, { status: 204 })
  }),
]

// Episode handlers
export const episodeHandlers = [
  // Get episodes
  http.get(`${API_BASE_URL}/api/episodes/:podcastId`, ({ request, params }) => {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { podcastId } = params

    // Simulate not found
    if (podcastId === 'not-found') {
      return HttpResponse.json({ error: 'Podcast not found' }, { status: 404 })
    }

    // Check for pagination
    const url = new URL(request.url)
    const lastKey = url.searchParams.get('lastEvaluatedKey')

    if (lastKey) {
      // Return empty array to simulate end of pagination
      return HttpResponse.json({ episodes: [] })
    }

    // Return episodes with optional pagination
    return HttpResponse.json({
      episodes: [
        {
          episodeId: 'episode-1',
          podcastId: podcastId as string,
          title: 'Test Episode 1',
          description: 'Test description',
          audioUrl: 'https://example.com/episode1.mp3',
          duration: '30:00',
          releaseDate: '2024-01-15T00:00:00Z',
        },
      ],
      lastEvaluatedKey: podcastId === 'podcast-with-many-episodes' ? 'next-page' : undefined,
    })
  }),

  // Save progress
  http.post(`${API_BASE_URL}/api/episodes/:episodeId/progress`, async ({ request, params }) => {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request
    if (typeof body.position !== 'number' || typeof body.duration !== 'number') {
      return HttpResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    return HttpResponse.json({ message: 'Progress saved' })
  }),
]

// Recommendation handlers
export const recommendationHandlers = [
  // Get recommendations
  http.get(`${API_BASE_URL}/api/recommendations`, ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const filter = url.searchParams.get('filter')

    // Return empty recommendations for specific test case
    if (filter === 'empty') {
      return HttpResponse.json({ recommendations: [] })
    }

    // Return sample recommendations
    return HttpResponse.json({
      recommendations: [
        {
          episodeId: 'rec-1',
          podcastId: 'podcast-1',
          score: 0.95,
          reasons: ['Based on your listening history'],
          factors: {
            content_similarity: 0.9,
            listening_history: 0.85,
            popularity: 0.8,
          },
          episode: {
            episodeId: 'rec-1',
            podcastId: 'podcast-1',
            title: 'Recommended Episode 1',
            podcastName: 'Tech Talk',
            releaseDate: '2024-01-20T00:00:00Z',
            duration: '30:00',
            audioUrl: 'https://example.com/rec1.mp3',
            imageUrl: 'https://example.com/rec1.jpg',
            description: 'Great episode about tech',
          },
        },
      ],
    })
  }),

  // Submit feedback
  http.post(`${API_BASE_URL}/api/recommendations/feedback`, async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.episodeId || !['up', 'down'].includes(body.feedback)) {
      return HttpResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    return HttpResponse.json({ message: 'Feedback recorded' })
  }),

  // Track play
  http.post(`${API_BASE_URL}/api/recommendations/play`, async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return HttpResponse.json({ message: 'Play event tracked' })
  }),
]

// Search handlers
export const searchHandlers = [
  http.get(`${API_BASE_URL}/api/search`, ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const query = url.searchParams.get('q')
    const filter = url.searchParams.get('filter')

    // No query provided
    if (!query) {
      return HttpResponse.json({ error: 'Query parameter required' }, { status: 400 })
    }

    // No results case
    if (query === 'xyzabc123notfound') {
      return HttpResponse.json({
        results: [],
        totalResults: 0,
        searchTime: 0.015,
      })
    }

    // Return sample results
    return HttpResponse.json({
      results: [
        {
          episodeId: 'search-1',
          podcastId: 'podcast-1',
          episodeTitle: 'Search Result 1',
          podcastTitle: 'Tech Talk',
          description: `Result matching "${query}"`,
          releaseDate: '2024-01-15T00:00:00Z',
          imageUrl: 'https://example.com/search1.jpg',
          relevanceScore: 0.95,
        },
      ],
      totalResults: 1,
      searchTime: 0.023,
    })
  }),
]

// Combine all handlers
export const handlers = [
  ...authHandlers,
  ...podcastHandlers,
  ...episodeHandlers,
  ...recommendationHandlers,
  ...searchHandlers,
]
