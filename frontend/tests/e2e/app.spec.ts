import { test, expect } from '@playwright/test'

test.describe('Rewind App', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the homepage
    await page.goto('/')
  })

  test('should load the homepage and take screenshot', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Check that we're on the home page
    await expect(page.locator('h1').filter({ hasText: 'Recommended Episodes' })).toBeVisible()

    // Take a screenshot for analysis
    await page.screenshot({
      path: 'test-results/screenshots/homepage-full.png',
      fullPage: true,
    })

    // Take a viewport screenshot as well
    await page.screenshot({
      path: 'test-results/screenshots/homepage-viewport.png',
    })
  })

  test('should have working navigation', async ({ page }) => {
    // Test bottom navigation
    await page.click('[data-testid="nav-library"]')
    await expect(page).toHaveURL('/library')
    await page.screenshot({
      path: 'test-results/screenshots/library-page.png',
      fullPage: true,
    })

    await page.click('[data-testid="nav-search"]')
    await expect(page).toHaveURL('/search')
    await page.screenshot({
      path: 'test-results/screenshots/search-page.png',
      fullPage: true,
    })

    await page.click('[data-testid="nav-home"]')
    await expect(page).toHaveURL('/')
  })

  test('should open auth modal when clicking login', async ({ page }) => {
    // Click the login button in header
    await page.click('[data-testid="login-button"]')

    // Check that auth modal is visible
    await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible()

    // Take screenshot of auth modal
    await page.screenshot({
      path: 'test-results/screenshots/auth-modal-login.png',
    })

    // Switch to signup form
    await page.click('text=Sign up')
    await page.screenshot({
      path: 'test-results/screenshots/auth-modal-signup.png',
    })

    // Close modal
    await page.click('[data-testid="close-modal"]')
    await expect(page.locator('[data-testid="auth-modal"]')).not.toBeVisible()
  })

  test('should handle responsive design on mobile', async ({ page, browserName }) => {
    // Only run on mobile configurations
    const viewport = page.viewportSize()
    test.skip(browserName !== 'chromium' || !viewport?.width || viewport.width > 500)

    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Take mobile screenshot
    await page.screenshot({
      path: 'test-results/screenshots/homepage-mobile.png',
      fullPage: true,
    })

    // Test mobile menu (if header has a menu button)
    const menuButton = page.locator('[data-testid="menu-button"]')
    if (await menuButton.isVisible()) {
      await menuButton.click()
      await page.screenshot({
        path: 'test-results/screenshots/mobile-menu.png',
      })
    }
  })

  test('should display episode cards correctly', async ({ page }) => {
    // Wait for any dynamic content to load
    await page.waitForTimeout(1000)

    // Check if episode cards are present
    const episodeCards = page.locator('[data-testid="episode-card"]')
    await expect(episodeCards).toHaveCount(4) // Now has 4 sample episodes

    // Take a focused screenshot of the episode card area
    await page.locator('[data-testid="episode-card"]').first().screenshot({
      path: 'test-results/screenshots/episode-card.png',
    })

    // Take a screenshot of all episode cards
    await page.screenshot({
      path: 'test-results/screenshots/episode-cards-full.png',
      fullPage: true,
    })
  })

  test('should handle audio playback with floating media player', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(1000)

    // Take initial screenshot
    await page.screenshot({
      path: 'test-results/screenshots/initial-state.png',
      fullPage: true,
    })

    // Initially, media player should not be visible
    await expect(page.locator('[data-testid="floating-media-player"]')).not.toBeVisible()

    // Click the episode card play button
    await page.locator('[data-testid="episode-card"]').first().locator('button:has-text("Play")').click()
    await page.waitForTimeout(1000)

    // Take screenshot after episode card play button
    await page.screenshot({
      path: 'test-results/screenshots/after-episode-play.png',
      fullPage: true,
    })

    // Check if media player appears
    const mediaPlayer = page.locator('[data-testid="floating-media-player"]')

    if (await mediaPlayer.isVisible()) {
      console.log('Success! Media player is visible')

      // Take screenshot of mini player
      await page.screenshot({
        path: 'test-results/screenshots/floating-media-player-mini.png',
        fullPage: true,
      })

      // Test expanding the player
      await page.locator('[data-testid="expand-player"]').scrollIntoViewIfNeeded()
      await page.click('[data-testid="expand-player"]', { force: true })
      await page.waitForTimeout(500)

      // Take screenshot of expanded player
      await page.screenshot({
        path: 'test-results/screenshots/floating-media-player-expanded.png',
        fullPage: true,
      })

      // Test minimize button
      await page.click('[data-testid="minimize-player"]')
      await page.waitForTimeout(500)

      // Should be back to mini player
      await expect(page.locator('[data-testid="floating-media-player"]')).toBeVisible()

      // Test pause/play functionality
      await page.click('[data-testid="mini-play-pause-button"]')
      await page.waitForTimeout(500)

      // Take screenshot of paused state
      await page.screenshot({
        path: 'test-results/screenshots/floating-media-player-paused.png',
        fullPage: true,
      })

      // Test close button
      await page.click('[data-testid="mini-close-player"]')
      await page.waitForTimeout(500)

      // Media player should no longer be visible
      await expect(page.locator('[data-testid="floating-media-player"]')).not.toBeVisible()
    } else {
      // If media player is still not visible, this will fail the test
      console.log('Media player still not visible, failing test')
      await expect(page.locator('[data-testid="floating-media-player"]')).toBeVisible()
    }
  })

  test('should handle error states gracefully', async ({ page }) => {
    // Test navigation to non-existent page
    await page.goto('/non-existent-page')

    // Should show error page
    await page.screenshot({
      path: 'test-results/screenshots/error-page.png',
      fullPage: true,
    })
  })
})

test.describe('Authentication Flow', () => {
  test('should handle login form validation', async ({ page }) => {
    await page.goto('/')

    // Open auth modal
    await page.click('[data-testid="login-button"]')

    // Try to submit empty form
    await page.click('button[type="submit"]')

    // Take screenshot of validation errors
    await page.screenshot({
      path: 'test-results/screenshots/login-validation-errors.png',
    })
  })

  test('should handle signup form validation', async ({ page }) => {
    await page.goto('/')

    // Open auth modal and switch to signup
    await page.click('[data-testid="login-button"]')
    await page.click('text=Sign up')

    // Try to submit empty form
    await page.click('button[type="submit"]')

    // Take screenshot of validation errors
    await page.screenshot({
      path: 'test-results/screenshots/signup-validation-errors.png',
    })
  })
})

test.describe('Accessibility', () => {
  test('should be accessible with keyboard navigation', async ({ page }) => {
    await page.goto('/')

    // Test tab navigation through main elements
    await page.keyboard.press('Tab') // Should focus on first interactive element
    await page.keyboard.press('Tab') // Next element
    await page.keyboard.press('Tab') // Next element

    // Take screenshot showing focus states
    await page.screenshot({
      path: 'test-results/screenshots/keyboard-navigation.png',
    })
  })
})
