import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import RewindLogger from '../logger'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock console methods
const mockConsoleLog = vi.fn()
const mockConsoleWarn = vi.fn()
const mockConsoleError = vi.fn()
const mockConsoleDebug = vi.fn()

global.console = {
  ...console,
  log: mockConsoleLog,
  warn: mockConsoleWarn,
  error: mockConsoleError,
  debug: mockConsoleDebug,
}

describe('RewindLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true, message: 'Log sent successfully' })
    })
    
    // Mock environment variables using Object.defineProperty
    Object.defineProperty(import.meta, 'env', {
      value: {
        VITE_API_BASE_URL: 'https://test-api.com',
        MODE: 'test'
      },
      writable: true
    })
    
    // Reset logger state
    RewindLogger.setEnabled(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should be enabled by default', () => {
      expect(RewindLogger.setEnabled).toBeDefined()
      expect(typeof RewindLogger.setEnabled).toBe('function')
    })

    it('should have all required logging methods', () => {
      expect(RewindLogger.info).toBeDefined()
      expect(RewindLogger.warn).toBeDefined()
      expect(RewindLogger.error).toBeDefined()
      expect(RewindLogger.debug).toBeDefined()
      expect(typeof RewindLogger.info).toBe('function')
      expect(typeof RewindLogger.warn).toBe('function')
      expect(typeof RewindLogger.error).toBe('function')
      expect(typeof RewindLogger.debug).toBe('function')
    })
  })

  describe('Enable/Disable Functionality', () => {
    it('should allow enabling and disabling', () => {
      RewindLogger.setEnabled(false)
      RewindLogger.info('Test message')
      
      // Should not make API call when disabled
      expect(mockFetch).not.toHaveBeenCalled()
      
      RewindLogger.setEnabled(true)
      RewindLogger.info('Test message')
      
      // Should make API call when enabled
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should still log to console when disabled', () => {
      RewindLogger.setEnabled(false)
      RewindLogger.info('Test message')
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[Rewind] Test message', undefined)
    })
  })

  describe('Log Level Methods', () => {
    describe('info()', () => {
      it('should log to console and send to API', () => {
        RewindLogger.info('Test info message')
        
        expect(mockConsoleLog).toHaveBeenCalledWith('[Rewind] Test info message', undefined)
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test-api.com/logs',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"level":"INFO"')
          })
        )
      })

      it('should include metadata in API call', () => {
        const metadata = { userId: 'user123', action: 'test' }
        RewindLogger.info('Test message', metadata)
        
        expect(mockConsoleLog).toHaveBeenCalledWith('[Rewind] Test message', metadata)
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test-api.com/logs',
          expect.objectContaining({
            body: expect.stringContaining('"userId":"user123"')
          })
        )
      })
    })

    describe('warn()', () => {
      it('should log to console and send to API', () => {
        RewindLogger.warn('Test warning message')
        
        expect(mockConsoleWarn).toHaveBeenCalledWith('[Rewind] Test warning message', undefined)
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test-api.com/logs',
          expect.objectContaining({
            body: expect.stringContaining('"level":"WARN"')
          })
        )
      })
    })

    describe('error()', () => {
      it('should log to console and send to API', () => {
        RewindLogger.error('Test error message')
        
        expect(mockConsoleError).toHaveBeenCalledWith('[Rewind] Test error message', undefined)
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test-api.com/logs',
          expect.objectContaining({
            body: expect.stringContaining('"level":"ERROR"')
          })
        )
      })

      it('should handle Error objects', () => {
        const error = new Error('Test error')
        RewindLogger.error('Error occurred', { error: error.message })
        
        expect(mockConsoleError).toHaveBeenCalledWith('[Rewind] Error occurred', { error: 'Test error' })
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test-api.com/logs',
          expect.objectContaining({
            body: expect.stringContaining('"error":"Test error"')
          })
        )
      })
    })

    describe('debug()', () => {
             it('should only log in development mode', () => {
         Object.defineProperty(import.meta, 'env', {
           value: { MODE: 'development' },
           writable: true
         })
         RewindLogger.debug('Test debug message')
         
         expect(mockConsoleDebug).toHaveBeenCalledWith('[Rewind] Test debug message', undefined)
         expect(mockFetch).toHaveBeenCalled()
       })
 
       it('should not log in production mode', () => {
         Object.defineProperty(import.meta, 'env', {
           value: { MODE: 'production' },
           writable: true
         })
         RewindLogger.debug('Test debug message')
         
         expect(mockConsoleDebug).not.toHaveBeenCalled()
         expect(mockFetch).not.toHaveBeenCalled()
       })
    })
  })

  describe('API Integration', () => {
    it('should send logs to correct endpoint', () => {
      RewindLogger.info('Test message')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.com/logs',
        expect.any(Object)
      )
    })

    it('should send proper request structure', () => {
      const metadata = { endpoint: '/api/test', status: 200 }
      RewindLogger.info('API call successful', metadata)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.com/logs',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'INFO',
            message: 'API call successful',
            metadata
          })
        }
      )
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      // Should not throw error
      expect(() => RewindLogger.info('Test message')).not.toThrow()
      
      // Should still log to console
      expect(mockConsoleLog).toHaveBeenCalledWith('[Rewind] Test message', undefined)
    })

    it('should handle API error responses gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      })
      
      // Should not throw error
      expect(() => RewindLogger.info('Test message')).not.toThrow()
      
      // Should still log to console
      expect(mockConsoleLog).toHaveBeenCalledWith('[Rewind] Test message', undefined)
    })
  })

  describe('Retry Logic', () => {
    it('should retry failed requests', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ success: true })
        })
      
      RewindLogger.info('Test message')
      
      // Wait for potential retries
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Should have made multiple attempts
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should give up after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent network error'))
      
      RewindLogger.info('Test message')
      
      // Wait for potential retries
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Should have made max retry attempts
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

     describe('Specialized Logging Methods', () => {
     describe('apiCall()', () => {
       it('should log API calls with proper metadata', () => {
         RewindLogger.apiCall('/api/episodes', 'GET', 200, 150)
         
         expect(mockConsoleDebug).toHaveBeenCalledWith('[Rewind API] GET /api/episodes - 200 (150ms)')
         expect(mockFetch).toHaveBeenCalledWith(
           'https://test-api.com/logs',
           expect.objectContaining({
             body: expect.stringContaining('"method":"GET"')
           })
         )
       })
 
       it('should mark failed API calls as unsuccessful', () => {
         RewindLogger.apiCall('/api/episodes', 'POST', 500, 300)
         
         expect(mockConsoleDebug).toHaveBeenCalledWith('[Rewind API] POST /api/episodes - 500 (300ms)')
         expect(mockFetch).toHaveBeenCalledWith(
           'https://test-api.com/logs',
           expect.objectContaining({
             body: expect.stringContaining('"success":false')
           })
         )
       })
     })
 
     describe('userAction()', () => {
       it('should log user actions with metadata', () => {
         RewindLogger.userAction('play_episode', { episodeId: 'ep123' })
         
         expect(mockConsoleDebug).toHaveBeenCalledWith(
           '[Rewind User] play_episode',
           expect.objectContaining({
             episodeId: 'ep123'
           })
         )
       })
     })
 
     describe('apiError()', () => {
       it('should log API errors with proper formatting', () => {
         const error = new Error('Test error')
         RewindLogger.apiError('/api/test', 'GET', error, 150)
         
         expect(mockConsoleError).toHaveBeenCalledWith(
           '[Rewind API] GET /api/test failed:',
           error
         )
         
         expect(mockFetch).toHaveBeenCalledWith(
           'https://test-api.com/logs',
           expect.objectContaining({
             body: expect.stringContaining('"level":"API_ERROR"')
           })
         )
       })
     })
 
     describe('performance()', () => {
       it('should log performance metrics', () => {
         RewindLogger.performance('page_load', 1500)
         
         expect(mockConsoleDebug).toHaveBeenCalledWith(
           '[Rewind Perf] page_load: 1500',
           undefined
         )
         
         expect(mockFetch).toHaveBeenCalledWith(
           'https://test-api.com/logs',
           expect.objectContaining({
             body: expect.stringContaining('"metricValue":1500')
           })
         )
       })
     })
   })

  describe('Edge Cases', () => {
    it('should handle undefined metadata gracefully', () => {
      RewindLogger.info('Test message', undefined)
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[Rewind] Test message', undefined)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.com/logs',
        expect.objectContaining({
          body: expect.stringContaining('"metadata":{}')
        })
      )
    })

    it('should handle empty strings', () => {
      RewindLogger.info('')
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[Rewind] ', undefined)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.com/logs',
        expect.objectContaining({
          body: expect.stringContaining('"message":""')
        })
      )
    })

    it('should handle circular references in metadata', () => {
      const circular: any = { name: 'test' }
      circular.self = circular
      
      // Should not throw error
      expect(() => RewindLogger.info('Test message', circular)).not.toThrow()
      
      // Should still log to console
      expect(mockConsoleLog).toHaveBeenCalled()
    })
  })

  describe('Environment Handling', () => {
    it('should use fallback API URL when environment variable is not set', () => {
      import.meta.env.VITE_API_BASE_URL = undefined
      
      RewindLogger.info('Test message')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/logs',
        expect.any(Object)
      )
    })

    it('should handle different environment modes', () => {
      import.meta.env.MODE = 'production'
      
      RewindLogger.debug('Debug message')
      expect(mockConsoleDebug).not.toHaveBeenCalled()
      
      import.meta.env.MODE = 'development'
      
      RewindLogger.debug('Debug message')
      expect(mockConsoleDebug).toHaveBeenCalled()
    })
  })
})