// Base API configuration and utilities
import { rumService } from './rumService'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export interface APIResponse<T = any> {
  data?: T
  error?: {
    message: string
    code: string
    details?: any
  }
  timestamp: string
  path?: string
}

export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any,
  ) {
    super(message)
    this.name = 'APIError'
  }
}

class APIClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>

  constructor(baseURL: string) {
    // Normalize baseURL by removing trailing slash
    this.baseURL = baseURL.replace(/\/$/, '')
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  setAuthToken(token: string) {
    console.log('API Client: Setting auth token', token.substring(0, 20) + '...')
    this.defaultHeaders['Authorization'] = `Bearer ${token}`
    console.log('API Client: Default headers now:', this.defaultHeaders)
  }

  clearAuthToken() {
    console.log('API Client: Clearing auth token')
    delete this.defaultHeaders['Authorization']
    console.log('API Client: Default headers now:', this.defaultHeaders)
  }

  private async request<T>(
    endpoint: string,
    options: Partial<{ method: string; headers: Record<string, string>; body?: string }> = {},
  ): Promise<T> {
    // Ensure endpoint starts with a slash
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

    // Start timing for RUM monitoring
    const startTime = Date.now()

    try {
      const response = await fetch(url, config)
      const data: APIResponse<T> = await response.json()

      // Calculate duration
      const duration = Date.now() - startTime

      // Record API call in RUM
      rumService.recordApiCall(
        endpoint,
        url,
        config.method,
        response.status,
        duration,
        {
          hasAuth: !!this.defaultHeaders['Authorization'],
          contentType: response.headers.get('content-type'),
        },
      )

      if (!response.ok) {
        const apiError = new APIError(
          data.error?.message || 'Request failed',
          data.error?.code || 'UNKNOWN_ERROR',
          response.status,
          data.error?.details,
        )

        // Record error in RUM
        rumService.recordError(apiError, {
          endpoint,
          method: config.method,
          statusCode: response.status,
          duration,
          hasAuth: !!this.defaultHeaders['Authorization'],
        })

        throw apiError
      }

      return data.data as T
    } catch (error) {
      const duration = Date.now() - startTime

      if (error instanceof APIError) {
        // API error already recorded above
        throw error
      }

      // Handle network errors
      const networkError = new APIError('Network error occurred', 'NETWORK_ERROR', 0, { originalError: error })

      // Record network error in RUM
      rumService.recordError(networkError, {
        endpoint,
        method: config.method,
        duration,
        hasAuth: !!this.defaultHeaders['Authorization'],
        errorType: 'network',
      })

      throw networkError
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    // Ensure endpoint starts with a slash
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

    // Use the full URL directly instead of reconstructing it
    const config = {
      method: 'GET',
      headers: {
        ...this.defaultHeaders,
      },
    }
    console.log('Fetching URL:', url)
    console.log('Headers:', this.defaultHeaders)

    // Start timing for RUM monitoring
    const startTime = Date.now()

    try {
      const response = await fetch(url, config)
      const data: APIResponse<T> = await response.json()

      // Calculate duration
      const duration = Date.now() - startTime

      // Record API call in RUM
      rumService.recordApiCall(
        endpoint,
        url,
        config.method,
        response.status,
        duration,
        {
          hasAuth: !!this.defaultHeaders['Authorization'],
          contentType: response.headers.get('content-type'),
          hasParams: !!params,
        },
      )

      if (!response.ok) {
        const apiError = new APIError(
          data.error?.message || 'Request failed',
          data.error?.code || 'UNKNOWN_ERROR',
          response.status,
          data.error?.details,
        )

        // Record error in RUM
        rumService.recordError(apiError, {
          endpoint,
          method: config.method,
          statusCode: response.status,
          duration,
          hasAuth: !!this.defaultHeaders['Authorization'],
          hasParams: !!params,
        })

        throw apiError
      }

      return data.data as T
    } catch (error) {
      const duration = Date.now() - startTime

      if (error instanceof APIError) {
        // API error already recorded above
        throw error
      }

      // Handle network errors
      const networkError = new APIError('Network error occurred', 'NETWORK_ERROR', 0, { originalError: error })

      // Record network error in RUM
      rumService.recordError(networkError, {
        endpoint,
        method: config.method,
        duration,
        hasAuth: !!this.defaultHeaders['Authorization'],
        hasParams: !!params,
        errorType: 'network',
      })

      throw networkError
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

export const apiClient = new APIClient(API_BASE_URL)

// Debug helper function to test URL construction
export const debugAPIConfiguration = () => {
  console.log('API Configuration:')
  console.log('Base URL:', API_BASE_URL)
  console.log('Example URLs:')
  console.log('  /podcasts ->', `${API_BASE_URL}/podcasts`)
  console.log('  /auth/signin ->', `${API_BASE_URL}/auth/signin`)
  console.log('  /health ->', `${API_BASE_URL}/health`)
}

export default apiClient
