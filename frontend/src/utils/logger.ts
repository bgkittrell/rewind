interface LogMetadata {
  endpoint?: string
  status?: number
  headers?: Record<string, string>
  userId?: string
  sessionId?: string
  error?: string
  responseTime?: number
  method?: string
  success?: boolean
  [key: string]: any
}

interface LogRequest {
  level: string
  message: string
  metadata: LogMetadata
}

class RewindLogger {
  private static apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  private static isEnabled = true
  private static maxRetries = 3
  private static retryDelay = 1000

  /**
   * Enable or disable logging
   */
  static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  /**
   * Send log to backend with retry logic
   */
  private static async sendLog(level: string, message: string, metadata: LogMetadata = {}): Promise<void> {
    if (!this.isEnabled) {
      return
    }

    const logRequest: LogRequest = {
      level,
      message,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        sessionId: this.getSessionId(),
        userId: this.getUserId(),
      },
    }

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(logRequest),
        })

        if (response.ok) {
          console.debug(`[RewindLogger] Log sent successfully (attempt ${attempt})`)
          return
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      } catch (error) {
        lastError = error as Error
        console.warn(`[RewindLogger] Log attempt ${attempt} failed:`, error)

        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt)
        }
      }
    }

    console.error('[RewindLogger] All log attempts failed:', lastError)
  }

  /**
   * Sleep utility for retry logic
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get session ID from sessionStorage or generate one
   */
  private static getSessionId(): string {
    let sessionId = sessionStorage.getItem('rewind_session_id')
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      sessionStorage.setItem('rewind_session_id', sessionId)
    }
    return sessionId
  }

  /**
   * Get user ID from localStorage
   */
  private static getUserId(): string | undefined {
    try {
      const authData = localStorage.getItem('auth')
      if (authData) {
        const parsed = JSON.parse(authData)
        return parsed.user?.id || parsed.userId || 'unknown'
      }
    } catch (error) {
      console.debug('[RewindLogger] Could not parse auth data for user ID')
    }
    return undefined
  }

  /**
   * Log an error
   */
  static error(message: string, metadata?: LogMetadata): void {
    console.error(`[Rewind] ${message}`, metadata)
    this.sendLog('ERROR', message, metadata).catch(() => {
      // Silently fail - we don't want logging to break the app
    })
  }

  /**
   * Log an authentication error
   */
  static authError(endpoint: string, error: any, metadata?: LogMetadata): void {
    const errorMetadata: LogMetadata = {
      ...metadata,
      endpoint,
      error: error.message || String(error),
      status: error.status || error.statusCode,
      headers: error.headers,
    }

    console.error(`[Rewind Auth] Error at ${endpoint}:`, error)
    this.sendLog('AUTH_ERROR', 'Authentication failed', errorMetadata).catch(() => {
      // Silently fail
    })
  }

  /**
   * Log an API call for monitoring
   */
  static apiCall(endpoint: string, method: string, status: number, responseTime: number, metadata?: LogMetadata): void {
    const callMetadata: LogMetadata = {
      ...metadata,
      endpoint,
      method,
      status,
      responseTime,
      success: status >= 200 && status < 300,
    }

    console.debug(`[Rewind API] ${method} ${endpoint} - ${status} (${responseTime}ms)`)
    this.sendLog('API_CALL', `${method} ${endpoint}`, callMetadata).catch(() => {
      // Silently fail
    })
  }

  /**
   * Log API errors specifically
   */
  static apiError(endpoint: string, method: string, error: any, responseTime?: number, metadata?: LogMetadata): void {
    const errorMetadata: LogMetadata = {
      ...metadata,
      endpoint,
      method,
      error: error.message || String(error),
      status: error.status || error.statusCode,
      responseTime,
      headers: error.headers,
    }

    console.error(`[Rewind API] ${method} ${endpoint} failed:`, error)
    this.sendLog('API_ERROR', `API call failed: ${method} ${endpoint}`, errorMetadata).catch(() => {
      // Silently fail
    })
  }

  /**
   * Log informational messages
   */
  static info(message: string, metadata?: LogMetadata): void {
    console.info(`[Rewind] ${message}`, metadata)
    this.sendLog('INFO', message, metadata).catch(() => {
      // Silently fail
    })
  }

  /**
   * Log warnings
   */
  static warn(message: string, metadata?: LogMetadata): void {
    console.warn(`[Rewind] ${message}`, metadata)
    this.sendLog('WARN', message, metadata).catch(() => {
      // Silently fail
    })
  }

  /**
   * Log debug messages (only in development)
   */
  static debug(message: string, metadata?: LogMetadata): void {
    if (import.meta.env.MODE === 'development') {
      console.debug(`[Rewind] ${message}`, metadata)
      this.sendLog('DEBUG', message, metadata).catch(() => {
        // Silently fail
      })
    }
  }

  /**
   * Log user actions for analytics
   */
  static userAction(action: string, metadata?: LogMetadata): void {
    console.debug(`[Rewind User] ${action}`, metadata)
    this.sendLog('USER_ACTION', action, metadata).catch(() => {
      // Silently fail
    })
  }

  /**
   * Log performance metrics
   */
  static performance(metric: string, value: number, metadata?: LogMetadata): void {
    const perfMetadata: LogMetadata = {
      ...metadata,
      metricValue: value,
      metricName: metric,
    }

    console.debug(`[Rewind Perf] ${metric}: ${value}`, metadata)
    this.sendLog('PERFORMANCE', `Performance metric: ${metric}`, perfMetadata).catch(() => {
      // Silently fail
    })
  }
}

export default RewindLogger
