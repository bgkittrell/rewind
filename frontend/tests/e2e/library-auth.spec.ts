import { test, expect } from '@playwright/test'

test.describe('Library Page - Auth Aware', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/library')
    await page.waitForLoadState('networkidle')
  })

  test('should handle unauthenticated state', async ({ page }) => {
    // Check if authentication message is shown
    const authMessage = page.locator('text=Please sign in to view your library')
    const isAuthenticated = !(await authMessage.isVisible())

    if (!isAuthenticated) {
      // Verify auth message is displayed
      await expect(authMessage).toBeVisible()

      // Take screenshot of auth state
      await page.screenshot({
        path: 'test-results/screenshots/library-auth-required.png',
        fullPage: true,
      })

      console.log('Library shows authentication required message')
    } else {
      // User is authenticated, check for library content
      const libraryTitle = page.locator('h1:has-text("Your Library")')
      await expect(libraryTitle).toBeVisible()

      // Check for empty state or podcast list
      const emptyState = page.locator('text=No podcasts yet')
      const podcastList = page.locator('[data-testid="podcast-item"]')

      const isEmpty = await emptyState.isVisible()

      if (isEmpty) {
        console.log('Library is empty')
        await page.screenshot({
          path: 'test-results/screenshots/library-empty-state.png',
          fullPage: true,
        })
      } else {
        const podcastCount = await podcastList.count()
        console.log(`Library has ${podcastCount} podcasts`)
        await page.screenshot({
          path: 'test-results/screenshots/library-with-podcasts.png',
          fullPage: true,
        })
      }
    }
  })

  test('should display library page elements correctly', async ({ page }) => {
    // Always check for library title
    const libraryTitle = page.locator('h1:has-text("Your Library")')
    await expect(libraryTitle).toBeVisible()

    // Check for description
    const description = page.locator('text=Manage your podcast subscriptions')
    await expect(description).toBeVisible()

    // Take full page screenshot
    await page.screenshot({
      path: 'test-results/screenshots/library-page-full.png',
      fullPage: true,
    })
  })
})
