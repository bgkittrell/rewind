import { test, expect } from '@playwright/test'

test.describe('Storybook Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Storybook
    await page.goto('http://localhost:6006')
  })

  test('should load Storybook', async ({ page }) => {
    // Wait for Storybook to load
    await expect(page.locator('[title="Storybook"]')).toBeVisible()

    // Check that the sidebar is visible
    await expect(page.locator('#storybook-explorer-menu')).toBeVisible()
  })

  test('should display EpisodeCard story', async ({ page }) => {
    // Navigate to EpisodeCard story
    await page.goto('http://localhost:6006/?path=/story/components-episodecard--default')

    // Wait for the story to render
    await page.waitForSelector('iframe[title="storybook-preview-iframe"]')

    // Switch to iframe context
    const frame = page.frameLocator('iframe[title="storybook-preview-iframe"]')

    // Check that the episode card is rendered
    await expect(frame.locator('text=Building Better Software')).toBeVisible()
  })

  test('should display Header story', async ({ page }) => {
    // Navigate to Header story
    await page.goto('http://localhost:6006/?path=/story/components-header--default')

    // Wait for the story to render
    await page.waitForSelector('iframe[title="storybook-preview-iframe"]')

    // Switch to iframe context
    const frame = page.frameLocator('iframe[title="storybook-preview-iframe"]')

    // Check that the header is rendered
    await expect(frame.locator('nav')).toBeVisible()
  })

  test('should interact with controls', async ({ page }) => {
    // Navigate to EpisodeCard story
    await page.goto('http://localhost:6006/?path=/story/components-episodecard--default')

    // Open controls panel if not already open
    await page.click('button:has-text("Controls")')

    // Find and toggle the showImage control
    const showImageToggle = page.locator('label:has-text("showImage")').locator('input[type="checkbox"]')
    await showImageToggle.uncheck()

    // Verify the image is hidden in the story
    const frame = page.frameLocator('iframe[title="storybook-preview-iframe"]')
    await expect(frame.locator('img')).not.toBeVisible()
  })
})
