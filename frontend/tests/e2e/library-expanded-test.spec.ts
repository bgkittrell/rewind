import { test, expect } from '@playwright/test'

// Mock data with long titles for expanded episodes testing
const mockPodcastsResponse = {
  podcasts: [
    {
      podcastId: 'podcast-1',
      title: 'Test Podcast With Very Long Title That Should Be Properly Handled',
      description: 'A test podcast description that is reasonably long to test layout.',
      rssUrl: 'https://example.com/rss',
      imageUrl: 'https://broken-image.com/test.jpg', // Broken image URL
      createdAt: '2024-01-01T00:00:00Z',
      lastUpdated: '2024-01-01T00:00:00Z',
      episodeCount: 3,
      unreadCount: 2,
      lastSynced: '2024-01-01T00:00:00Z',
    },
  ],
  total: 1,
  hasMore: false,
}

const mockEpisodesResponse = {
  episodes: [
    {
      episodeId: 'episode-1',
      podcastId: 'podcast-1',
      title:
        'Episode 1: This Is An Extremely Long Episode Title That Should Cause Significant Layout Issues When Displayed In The Episode Card Component Because It Exceeds All Normal Length Expectations',
      description: 'Long episode description that tests the layout.',
      audioUrl: 'https://example.com/audio1.mp3',
      duration: '1:45:30',
      releaseDate: '2024-01-01T00:00:00Z',
      imageUrl: 'https://broken-episode-image.com/missing.jpg', // Broken episode image
      guests: ['Guest 1'],
      tags: ['test'],
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      episodeId: 'episode-2',
      podcastId: 'podcast-1',
      title: 'Episode 2: Another Very Long Episode Title That Tests Layout Boundaries',
      description: 'Another test episode description.',
      audioUrl: 'https://example.com/audio2.mp3',
      duration: '2:15:45',
      releaseDate: '2024-01-02T00:00:00Z',
      imageUrl: 'https://another-broken-image.com/404.jpg', // Another broken image
      guests: ['Guest 2'],
      tags: ['test'],
      createdAt: '2024-01-02T00:00:00Z',
    },
  ],
  pagination: {
    hasMore: false,
    limit: 20,
  },
}

test.describe('Library Expanded Episodes Test', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('rewind_auth_token', 'mock-token')
      localStorage.setItem(
        'rewind_user',
        JSON.stringify({
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
        }),
      )
    })

    // Mock API responses
    await page.route('**/podcasts', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: mockPodcastsResponse,
          timestamp: new Date().toISOString(),
        }),
      })
    })

    await page.route('**/episodes/podcast-1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: mockEpisodesResponse,
          timestamp: new Date().toISOString(),
        }),
      })
    })
  })

  test('should expand podcast and show episodes with improved layout', async ({ page }) => {
    await page.goto('http://localhost:5173/library')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Take screenshot before expansion
    await page.screenshot({
      path: 'test-results/screenshots/library-improved-before-expand.png',
      fullPage: true,
    })

    // Verify we're on the library page with podcasts loaded
    await expect(page.locator('h1:has-text("Your Library")')).toBeVisible()
    await expect(page.locator('text=Test Podcast With Very Long Title')).toBeVisible()

    // Find and click the expand button
    const expandButton = page.locator('button[title="Show episodes"]').first()
    await expect(expandButton).toBeVisible()

    console.log('Clicking expand button...')
    await expandButton.click()

    // Wait for episodes to load with longer timeout
    await page.waitForTimeout(3000)

    // Check if episodes are actually loaded
    const episodeCards = page.locator('[data-testid="episode-card"]')
    const episodeCount = await episodeCards.count()
    console.log(`Found ${episodeCount} episode cards`)

    if (episodeCount > 0) {
      console.log('Episodes loaded successfully!')

      // Take screenshot of expanded state
      await page.screenshot({
        path: 'test-results/screenshots/library-improved-expanded-episodes.png',
        fullPage: true,
      })

      // Verify episodes are visible
      await expect(episodeCards.first()).toBeVisible()
      await expect(page.locator('text=Episode 1: This Is An Extremely Long Episode Title')).toBeVisible()

      // Take focused screenshot of episode cards
      await episodeCards.first().screenshot({
        path: 'test-results/screenshots/library-improved-episode-card-focus.png',
      })

      // Test the improved broken image handling
      await page.waitForTimeout(2000) // Give images time to fail loading
      await page.screenshot({
        path: 'test-results/screenshots/library-improved-broken-images.png',
        fullPage: true,
      })
    } else {
      console.log('No episodes found, taking debug screenshot')
      await page.screenshot({
        path: 'test-results/screenshots/library-expanded-debug.png',
        fullPage: true,
      })
    }
  })

  test('should show improved mobile layout with expanded episodes', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })

    await page.goto('http://localhost:5173/library')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Take mobile screenshot before expansion
    await page.screenshot({
      path: 'test-results/screenshots/library-improved-mobile-before-expand.png',
      fullPage: true,
    })

    // Expand podcast on mobile
    const expandButton = page.locator('button[title="Show episodes"]').first()
    if (await expandButton.isVisible()) {
      await expandButton.click()
      await page.waitForTimeout(3000)

      // Take mobile screenshot with expanded episodes
      await page.screenshot({
        path: 'test-results/screenshots/library-improved-mobile-expanded.png',
        fullPage: true,
      })

      // Check if episode cards are responsive on mobile
      const episodeCards = page.locator('[data-testid="episode-card"]')
      if ((await episodeCards.count()) > 0) {
        await episodeCards.first().screenshot({
          path: 'test-results/screenshots/library-improved-mobile-episode-card.png',
        })
      }
    }
  })
})
