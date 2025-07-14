import { http, HttpResponse } from 'msw'

// Base API URL - this should match your backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Auth handlers with correct response shapes from backend
export const authHandlers = [
  // Login
  http.post(`${API_URL}/api/auth/signin`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }

    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      })
    }

    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }),

  // Signup
  http.post(`${API_URL}/api/auth/signup`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string; name: string }

    // Simulate user already exists
    if (body.email === 'existing@example.com') {
      return HttpResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    return HttpResponse.json({
      message: 'User created successfully',
      userId: 'new-user-123',
    })
  }),

  // Confirm email
  http.post(`${API_URL}/api/auth/confirm`, async ({ request }) => {
    const body = (await request.json()) as { email: string; code: string }

    if (body.code === '123456') {
      return HttpResponse.json({
        message: 'Email confirmed successfully',
      })
    }

    return HttpResponse.json({ error: 'Invalid confirmation code' }, { status: 400 })
  }),

  // Resend confirmation code
  http.post(`${API_URL}/api/auth/resend`, async ({ request }) => {
    const body = (await request.json()) as { email: string }

    return HttpResponse.json({
      message: 'Confirmation code sent',
    })
  }),
]

// Podcast handlers
export const podcastHandlers = [
  // Get user's podcasts
  http.get(`${API_URL}/api/podcasts`, ({ request }) => {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return HttpResponse.json({
      podcasts: [],
    })
  }),

  // Add podcast
  http.post(`${API_URL}/api/podcasts`, async ({ request }) => {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { rssUrl: string }

    return HttpResponse.json({
      podcast: {
        id: 'new-podcast-id',
        title: 'New Podcast',
        description: 'A new podcast',
        rssFeedUrl: body.rssUrl,
        imageUrl: 'https://example.com/podcast.jpg',
        author: 'Author',
        categories: ['General'],
        createdAt: new Date().toISOString(),
      },
      episodeCount: 10,
    })
  }),

  // Delete podcast
  http.delete(`${API_URL}/api/podcasts/:podcastId`, ({ request, params }) => {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return new HttpResponse(null, { status: 204 })
  }),
]

// Episode handlers
export const episodeHandlers = [
  // Get episodes
  http.get(`${API_URL}/api/episodes/:podcastId`, ({ request, params }) => {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return HttpResponse.json({
      episodes: [],
    })
  }),

  // Save progress
  http.post(`${API_URL}/api/episodes/:episodeId/progress`, async ({ request, params }) => {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { position: number; duration: number }

    return HttpResponse.json({
      message: 'Progress saved',
    })
  }),
]

// Recommendation handlers
export const recommendationHandlers = [
  // Get recommendations
  http.get(`${API_URL}/api/recommendations`, ({ request }) => {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return HttpResponse.json({
      recommendations: [],
    })
  }),

  // Submit feedback
  http.post(`${API_URL}/api/recommendations/feedback`, async ({ request }) => {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { episodeId: string; feedback: 'up' | 'down' }

    return HttpResponse.json({
      message: 'Feedback recorded',
    })
  }),

  // Track play event
  http.post(`${API_URL}/api/recommendations/play`, async ({ request }) => {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { episodeId: string; context: any }

    return HttpResponse.json({
      message: 'Play tracked',
    })
  }),
]

// Search handlers
export const searchHandlers = [
  // Search episodes
  http.get(`${API_URL}/api/search`, ({ request }) => {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const query = url.searchParams.get('q')
    const filter = url.searchParams.get('filter')

    // Return empty results by default
    return HttpResponse.json({
      results: [],
      totalResults: 0,
      searchTime: 0.1,
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
