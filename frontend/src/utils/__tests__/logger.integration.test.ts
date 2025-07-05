import { describe, it, expect, vi, beforeEach } from 'vitest'
import RewindLogger from '../logger'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock window and sessionStorage
Object.defineProperty(window, 'location', {
  value: { href: 'http://localhost:3000/test' },
  writable: true
})

Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(() => 'test-session-123'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  },
  writable: true
})

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  },
  writable: true
})

Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Test Browser)',
  writable: true
})

describe('RewindLogger Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true })
    })
    
    // Enable logging
    RewindLogger.setEnabled(true)
  })

  describe('Core Logging Functions', () => {
    it('should log info messages', async () => {
      RewindLogger.info('Test info message')
      
      // Wait for async logging
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/logs',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      )
      
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      
      expect(body.level).toBe('INFO')
      expect(body.message).toBe('Test info message')
      expect(body.metadata.url).toBe('http://localhost:3000/test')
      expect(body.metadata.userAgent).toBe('Mozilla/5.0 (Test Browser)')
    })

    it('should log error messages', async () => {
      RewindLogger.error('Test error message', { code: 'TEST_ERROR' })
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockFetch).toHaveBeenCalled()
      
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      
      expect(body.level).toBe('ERROR')
      expect(body.message).toBe('Test error message')
      expect(body.metadata.code).toBe('TEST_ERROR')
    })

    it('should log warning messages', async () => {
      RewindLogger.warn('Test warning message')
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockFetch).toHaveBeenCalled()
      
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      
      expect(body.level).toBe('WARN')
      expect(body.message).toBe('Test warning message')
    })
  })

  describe('API Logging Functions', () => {
    it('should log API calls', async () => {
      RewindLogger.apiCall('/api/episodes', 'GET', 200, 150)
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockFetch).toHaveBeenCalled()
      
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      
      expect(body.level).toBe('API_CALL')
      expect(body.message).toBe('GET /api/episodes')
      expect(body.metadata.endpoint).toBe('/api/episodes')
      expect(body.metadata.method).toBe('GET')
      expect(body.metadata.status).toBe(200)
      expect(body.metadata.responseTime).toBe(150)
      expect(body.metadata.success).toBe(true)
    })

    it('should log API errors', async () => {
      const error = new Error('Network error')
      RewindLogger.apiError('/api/podcasts', 'POST', error, 300)
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockFetch).toHaveBeenCalled()
      
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      
      expect(body.level).toBe('API_ERROR')
      expect(body.message).toBe('API call failed: POST /api/podcasts')
      expect(body.metadata.endpoint).toBe('/api/podcasts')
      expect(body.metadata.method).toBe('POST')
      expect(body.metadata.error).toBe('Network error')
      expect(body.metadata.responseTime).toBe(300)
    })

    it('should log authentication errors', async () => {
      const error = { message: 'Unauthorized', status: 401 }
      RewindLogger.authError('/api/auth/signin', error)
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockFetch).toHaveBeenCalled()
      
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      
      expect(body.level).toBe('AUTH_ERROR')
      expect(body.message).toBe('Authentication failed')
      expect(body.metadata.endpoint).toBe('/api/auth/signin')
      expect(body.metadata.error).toBe('Unauthorized')
      expect(body.metadata.status).toBe(401)
    })
  })

  describe('User Action Logging', () => {
    it('should log user actions', async () => {
      RewindLogger.userAction('play_episode', { episodeId: 'ep-123', podcastId: 'pod-456' })
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockFetch).toHaveBeenCalled()
      
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      
      expect(body.level).toBe('USER_ACTION')
      expect(body.message).toBe('play_episode')
      expect(body.metadata.episodeId).toBe('ep-123')
      expect(body.metadata.podcastId).toBe('pod-456')
    })
  })

  describe('Performance Logging', () => {
    it('should log performance metrics', async () => {
      RewindLogger.performance('page_load', 1500, { page: 'home' })
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockFetch).toHaveBeenCalled()
      
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      
      expect(body.level).toBe('PERFORMANCE')
      expect(body.message).toBe('Performance metric: page_load')
      expect(body.metadata.metricValue).toBe(1500)
      expect(body.metadata.metricName).toBe('page_load')
      expect(body.metadata.page).toBe('home')
    })
  })

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      // Mock API failure
      mockFetch.mockRejectedValue(new Error('Network failure'))
      
      // Should not throw
      expect(() => {
        RewindLogger.info('Test message')
      }).not.toThrow()
      
      // Wait for retry attempts
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Should have attempted multiple times
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should handle disabled logging', async () => {
      RewindLogger.setEnabled(false)
      RewindLogger.info('Test message')
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Metadata Enrichment', () => {
    it('should automatically add session and environment metadata', async () => {
      RewindLogger.info('Test message', { custom: 'data' })
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      
      expect(body.metadata).toMatchObject({
        custom: 'data',
        url: 'http://localhost:3000/test',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        sessionId: expect.any(String),
        timestamp: expect.any(String)
      })
      
      // Timestamp should be valid ISO string
      expect(new Date(body.metadata.timestamp)).toBeInstanceOf(Date)
    })

    it('should handle missing session gracefully', async () => {
      // Mock sessionStorage returning null
      window.sessionStorage.getItem = vi.fn(() => null)
      
      RewindLogger.info('Test message')
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockFetch).toHaveBeenCalled()
      
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      
      expect(body.metadata.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/)
    })
  })

  describe('Real-world Scenarios', () => {
    it('should log the authorization error from the original issue', async () => {
      RewindLogger.authError('/api/auth/signin', {
        message: 'Unauthorized access',
        status: 401,
        headers: { 'content-type': 'application/json' }
      }, {
        email: 'user@example.com',
        attemptNumber: 1
      })
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockFetch).toHaveBeenCalled()
      
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      
      expect(body.level).toBe('AUTH_ERROR')
      expect(body.message).toBe('Authentication failed')
      expect(body.metadata).toMatchObject({
        endpoint: '/api/auth/signin',
        error: 'Unauthorized access',
        status: 401,
        email: 'user@example.com',
        attemptNumber: 1
      })
    })

    it('should log failed API calls with proper metadata', async () => {
      RewindLogger.apiCall('/api/episodes', 'GET', 500, 2000, {
        retryAttempt: 2,
        originalError: 'Internal server error'
      })
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockFetch).toHaveBeenCalled()
      
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      
      expect(body.metadata).toMatchObject({
        endpoint: '/api/episodes',
        method: 'GET',
        status: 500,
        responseTime: 2000,
        success: false,
        retryAttempt: 2,
        originalError: 'Internal server error'
      })
    })
  })
})