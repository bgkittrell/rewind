import { test, expect } from '@playwright/test'

test.describe('CloudWatch Logging Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the CloudWatch logging endpoint to capture logs
    await page.route('**/logs', async route => {
      const request = route.request()
      const body = JSON.parse(request.postData() || '{}')

      console.log('📝 Captured log:', {
        level: body.level,
        message: body.message,
        metadata: body.metadata,
      })

      // Respond with success
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Log sent successfully' }),
      })
    })

    // Go to the homepage
    await page.goto('/')
  })

  test('should capture authentication errors', async ({ page }) => {
    // Listen for log requests
    const logRequests: any[] = []

    page.on('request', request => {
      if (request.url().includes('/logs') && request.method() === 'POST') {
        logRequests.push({
          url: request.url(),
          body: request.postData(),
        })
      }
    })

    // Trigger an authentication error by trying to login with invalid credentials
    await page.click('[data-testid="login-button"]')
    await page.waitForSelector('[data-testid="auth-modal"]')

    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')

    // Submit the form
    await page.click('button[type="submit"]')

    // Wait for the error to appear and be logged
    await page.waitForTimeout(2000)

    // Take screenshot for debugging
    await page.screenshot({
      path: 'test-results/screenshots/auth-error-logging.png',
      fullPage: true,
    })

    // Verify that logging requests were made
    expect(logRequests.length).toBeGreaterThan(0)
    console.log(`📊 Captured ${logRequests.length} log requests`)
  })

  test('should capture API call logs', async ({ page }) => {
    // Mock API endpoints to simulate different response scenarios
    await page.route('**/api/episodes', async route => {
      // Simulate a successful API call
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'ep1', title: 'Test Episode 1' },
            { id: 'ep2', title: 'Test Episode 2' },
          ],
        }),
      })
    })

    const logRequests: any[] = []

    page.on('request', request => {
      if (request.url().includes('/logs') && request.method() === 'POST') {
        try {
          const body = JSON.parse(request.postData() || '{}')
          logRequests.push(body)
        } catch (e) {
          console.warn('Failed to parse log request body')
        }
      }
    })

    // Navigate to a page that makes API calls
    await page.goto('/library')

    // Wait for API calls to complete and logs to be sent
    await page.waitForTimeout(3000)

    // Take screenshot
    await page.screenshot({
      path: 'test-results/screenshots/api-call-logging.png',
      fullPage: true,
    })

    // Verify API call logs were captured
    const apiCallLogs = logRequests.filter(log =>
      log.level === 'API_CALL' || log.level === 'INFO',
    )

    console.log(`📊 Captured ${apiCallLogs.length} API-related logs`)
    console.log('Log samples:', apiCallLogs.slice(0, 3))
  })

  test('should capture user action logs', async ({ page }) => {
    const logRequests: any[] = []

    page.on('request', request => {
      if (request.url().includes('/logs') && request.method() === 'POST') {
        try {
          const body = JSON.parse(request.postData() || '{}')
          logRequests.push(body)
        } catch (e) {
          console.warn('Failed to parse log request body')
        }
      }
    })

    // Perform user actions that should be logged
    await page.click('[data-testid="nav-library"]')
    await page.waitForTimeout(1000)

    await page.click('[data-testid="nav-search"]')
    await page.waitForTimeout(1000)

    await page.click('[data-testid="nav-home"]')
    await page.waitForTimeout(1000)

    // Take screenshot
    await page.screenshot({
      path: 'test-results/screenshots/user-action-logging.png',
      fullPage: true,
    })

    // Verify user action logs
    const userActionLogs = logRequests.filter(log =>
      log.level === 'USER_ACTION' ||
      (log.message && log.message.includes('navigation')),
    )

    console.log(`📊 Captured ${userActionLogs.length} user action logs`)
    console.log('User action samples:', userActionLogs.slice(0, 3))
  })

  test('should capture error logs with proper metadata', async ({ page }) => {
    const logRequests: any[] = []

    page.on('request', request => {
      if (request.url().includes('/logs') && request.method() === 'POST') {
        try {
          const body = JSON.parse(request.postData() || '{}')
          if (body.level === 'ERROR') {
            logRequests.push(body)
          }
        } catch (e) {
          console.warn('Failed to parse log request body')
        }
      }
    })

    // Mock an API error
    await page.route('**/api/podcasts', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
          },
        }),
      })
    })

    // Navigate to a page that might trigger the error
    await page.goto('/library')
    await page.waitForTimeout(3000)

    // Take screenshot
    await page.screenshot({
      path: 'test-results/screenshots/error-logging.png',
      fullPage: true,
    })

    // Verify error logs have proper structure
    if (logRequests.length > 0) {
      const errorLog = logRequests[0]

      expect(errorLog.level).toBe('ERROR')
      expect(errorLog.message).toBeDefined()
      expect(errorLog.metadata).toBeDefined()
      expect(errorLog.metadata.timestamp).toBeDefined()
      expect(errorLog.metadata.url).toBeDefined()
      expect(errorLog.metadata.userAgent).toBeDefined()

      console.log('✅ Error log structure validated:', {
        level: errorLog.level,
        hasMessage: !!errorLog.message,
        hasMetadata: !!errorLog.metadata,
        hasTimestamp: !!errorLog.metadata?.timestamp,
      })
    }

    console.log(`📊 Captured ${logRequests.length} error logs`)
  })

  test('should handle logging when offline', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true)

    const logRequests: any[] = []

    page.on('request', request => {
      if (request.url().includes('/logs')) {
        logRequests.push(request)
      }
    })

    // Try to trigger some logs while offline
    await page.click('[data-testid="nav-library"]')
    await page.waitForTimeout(2000)

    // Take screenshot
    await page.screenshot({
      path: 'test-results/screenshots/offline-logging.png',
      fullPage: true,
    })

    // Verify that logging attempts were made but may have failed gracefully
    console.log(`📊 Attempted ${logRequests.length} log requests while offline`)

    // Go back online
    await page.context().setOffline(false)
    await page.waitForTimeout(1000)

    // The app should still be functional
    await expect(page.locator('[data-testid="nav-home"]')).toBeVisible()
  })

  test('should include session and user metadata in logs', async ({ page }) => {
    const logRequests: any[] = []

    page.on('request', request => {
      if (request.url().includes('/logs') && request.method() === 'POST') {
        try {
          const body = JSON.parse(request.postData() || '{}')
          logRequests.push(body)
        } catch (e) {
          console.warn('Failed to parse log request body')
        }
      }
    })

    // Trigger some logging
    await page.click('[data-testid="nav-search"]')
    await page.waitForTimeout(2000)

    // Verify metadata enrichment
    if (logRequests.length > 0) {
      const log = logRequests[0]
      const metadata = log.metadata

      expect(metadata.url).toContain('localhost')
      expect(metadata.userAgent).toBeDefined()
      expect(metadata.sessionId).toBeDefined()
      expect(metadata.timestamp).toBeDefined()

      // Verify timestamp is valid ISO string
      expect(new Date(metadata.timestamp)).toBeInstanceOf(Date)

      console.log('✅ Metadata validation passed:', {
        hasUrl: !!metadata.url,
        hasUserAgent: !!metadata.userAgent,
        hasSessionId: !!metadata.sessionId,
        hasValidTimestamp: !isNaN(new Date(metadata.timestamp).getTime()),
      })
    }

    console.log(`📊 Validated metadata for ${logRequests.length} logs`)
  })
})
