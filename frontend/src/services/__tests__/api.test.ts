import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { APIError } from '../api'

// Create a local APIClient class for testing
class APIClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>

  constructor(baseURL: string) {
    this.baseURL = baseURL.replace(/\/$/, '')
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  clearAuthToken() {
    delete this.defaultHeaders['Authorization']
  }

  private async request<T>(
    endpoint: string,
    options: Partial<{ method: string; headers: Record<string, string>; body?: string }> = {},
  ): Promise<T> {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = `${this.baseURL}${normalizedEndpoint}`

    const config = {
      method: options.method || 'GET',
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      body: options.body,
    }

    try {
      const response = await fetch(url, config)
      const data: any = await response.json()

      if (!response.ok) {
        throw new APIError(
          data.error?.message || 'Request failed',
          data.error?.code || 'UNKNOWN_ERROR',
          response.status,
          data.error?.details,
        )
      }

      return data.data as T
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }
      throw new APIError('Network error occurred', 'NETWORK_ERROR', 0, { originalError: error })
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    let url = `${this.baseURL}${normalizedEndpoint}`

    if (params) {
      const urlObj = new URL(url)
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlObj.searchParams.append(key, String(value))
        }
      })
      url = urlObj.toString()
    }

    const config = {
      method: 'GET',
      headers: {
        ...this.defaultHeaders,
      },
    }

    try {
      const response = await fetch(url, config)
      const data: any = await response.json()

      if (!response.ok) {
        throw new APIError(
          data.error?.message || 'Request failed',
          data.error?.code || 'UNKNOWN_ERROR',
          response.status,
          data.error?.details,
        )
      }

      return data.data as T
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }
      throw new APIError('Network error occurred', 'NETWORK_ERROR', 0, { originalError: error })
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }
}

// Mock fetch globally
const mockFetch = vi.fn()
Object.defineProperty(globalThis, 'fetch', {
  value: mockFetch,
  writable: true,
})

describe('APIClient', () => {
  let apiClient: APIClient
  const baseURL = 'https://api.example.com'

  beforeEach(() => {
    vi.clearAllMocks()
    apiClient = new APIClient(baseURL)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Authentication', () => {
    it('should set auth token correctly', () => {
      const token = 'test-jwt-token'
      apiClient.setAuthToken(token)
      
      // Verify token is set (we can test this through a request)
      expect(apiClient['defaultHeaders']['Authorization']).toBe(`Bearer ${token}`)
    })

    it('should clear auth token correctly', () => {
      apiClient.setAuthToken('test-token')
      apiClient.clearAuthToken()
      
      expect(apiClient['defaultHeaders']['Authorization']).toBeUndefined()
    })

    it('should include auth token in requests', async () => {
      const token = 'test-jwt-token'
      apiClient.setAuthToken(token)

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: { success: true } })
      }
      mockFetch.mockResolvedValue(mockResponse)

      await apiClient.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseURL}/test`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`
          })
        })
      )
    })
  })

  describe('Network Requests', () => {
    it('should handle successful GET requests', async () => {
      const mockData = { episodes: [] }
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: mockData })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await apiClient.get('/episodes')

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseURL}/episodes`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
      expect(result).toEqual(mockData)
    })

    it('should handle successful POST requests', async () => {
      const mockData = { message: 'Success' }
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: mockData })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const postData = { podcastId: 'test-id' }
      const result = await apiClient.post('/episodes/sync', postData)

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseURL}/episodes/sync`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(postData)
        })
      )
      expect(result).toEqual(mockData)
    })

    it('should normalize endpoints without leading slash', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: {} })
      }
      mockFetch.mockResolvedValue(mockResponse)

      await apiClient.get('episodes')

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseURL}/episodes`,
        expect.any(Object)
      )
    })

    it('should handle query parameters correctly', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: {} })
      }
      mockFetch.mockResolvedValue(mockResponse)

      await apiClient.get('/episodes', { limit: 20, cursor: 'test-cursor' })

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseURL}/episodes?limit=20&cursor=test-cursor`,
        expect.any(Object)
      )
    })

    it('should filter out null/undefined query parameters', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: {} })
      }
      mockFetch.mockResolvedValue(mockResponse)

      await apiClient.get('/episodes', { limit: 20, cursor: null, offset: undefined })

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseURL}/episodes?limit=20`,
        expect.any(Object)
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle HTTP error responses', async () => {
      const errorResponse = {
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'Not found',
            code: 'NOT_FOUND'
          }
        })
      }
      mockFetch.mockResolvedValue(errorResponse)

      await expect(apiClient.get('/episodes')).rejects.toThrow(APIError)
    })

    it('should handle authentication errors', async () => {
      const errorResponse = {
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'Unauthorized',
            code: 'UNAUTHORIZED'
          }
        })
      }
      mockFetch.mockResolvedValue(errorResponse)

      await expect(apiClient.get('/episodes')).rejects.toThrow(APIError)
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(apiClient.get('/episodes')).rejects.toThrow(APIError)
      await expect(apiClient.get('/episodes')).rejects.toThrow('Network error occurred')
    })

    it('should handle invalid JSON responses', async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      }
      mockFetch.mockResolvedValue(errorResponse)

      await expect(apiClient.get('/episodes')).rejects.toThrow()
    })

    it('should handle missing error details', async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({}) // No error object
      }
      mockFetch.mockResolvedValue(errorResponse)

      await expect(apiClient.get('/episodes')).rejects.toThrow(APIError)
    })

    it('should handle CORS errors', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

      await expect(apiClient.get('/episodes')).rejects.toThrow(APIError)
    })

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValue(new Error('Request timeout'))

      await expect(apiClient.get('/episodes')).rejects.toThrow(APIError)
    })
  })

  describe('Request Configuration', () => {
    it('should normalize base URL by removing trailing slash', () => {
      const clientWithTrailingSlash = new APIClient('https://api.example.com/')
      expect(clientWithTrailingSlash['baseURL']).toBe('https://api.example.com')
    })

    it('should set default headers correctly', () => {
      const expectedHeaders = {
        'Content-Type': 'application/json'
      }
      expect(apiClient['defaultHeaders']).toEqual(expectedHeaders)
    })

    it('should merge custom headers with default headers', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: {} })
      }
      mockFetch.mockResolvedValue(mockResponse)

      await apiClient['request']('/test', {
        headers: { 'X-Custom-Header': 'test-value' }
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseURL}/test`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom-Header': 'test-value'
          })
        })
      )
    })
  })

  describe('Real-world Sync Scenarios', () => {
    it('should handle successful sync with authentication', async () => {
      const token = 'valid-jwt-token'
      apiClient.setAuthToken(token)

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            message: 'Episodes synced successfully',
            episodeCount: 5,
            episodes: []
          }
        })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await apiClient.post('/episodes/podcast-1/sync')

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseURL}/episodes/podcast-1/sync`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          })
        })
      )
      expect(result).toEqual({
        message: 'Episodes synced successfully',
        episodeCount: 5,
        episodes: []
      })
    })

    it('should handle sync failure due to expired token', async () => {
      const expiredToken = 'expired-jwt-token'
      apiClient.setAuthToken(expiredToken)

      const errorResponse = {
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'Token expired',
            code: 'TOKEN_EXPIRED'
          }
        })
      }
      mockFetch.mockResolvedValue(errorResponse)

      await expect(apiClient.post('/episodes/podcast-1/sync')).rejects.toThrow(APIError)
    })

    it('should handle sync failure due to invalid podcast', async () => {
      const token = 'valid-jwt-token'
      apiClient.setAuthToken(token)

      const errorResponse = {
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'Podcast not found or access denied',
            code: 'NOT_FOUND'
          }
        })
      }
      mockFetch.mockResolvedValue(errorResponse)

      await expect(apiClient.post('/episodes/invalid-podcast/sync')).rejects.toThrow(APIError)
    })

    it('should handle sync failure due to RSS parsing errors', async () => {
      const token = 'valid-jwt-token'
      apiClient.setAuthToken(token)

      const errorResponse = {
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'Failed to parse RSS feed',
            code: 'RSS_PARSE_ERROR'
          }
        })
      }
      mockFetch.mockResolvedValue(errorResponse)

      await expect(apiClient.post('/episodes/podcast-1/sync')).rejects.toThrow(APIError)
    })
  })
})