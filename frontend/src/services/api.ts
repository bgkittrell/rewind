// Base API configuration and utilities
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
    this.baseURL = baseURL
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
    const url = `${this.baseURL}${endpoint}`

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
      const data: APIResponse<T> = await response.json()

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

      // Handle network errors
      throw new APIError('Network error occurred', 'NETWORK_ERROR', 0, { originalError: error })
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    return this.request<T>(url.pathname + url.search, {
      method: 'GET',
    })
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
export default apiClient
