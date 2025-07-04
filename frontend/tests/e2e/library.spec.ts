import { test, expect } from '@playwright/test'

// Mock data with problematic long titles and descriptions
const mockPodcastsResponse = {
  podcasts: [
    {
      podcastId: 'podcast-1',
      title: 'This Is An Extremely Long Podcast Title That Should Cause Layout Issues When Displayed In The Library Component Because It Exceeds Normal Length Expectations',
      description: 'This is an extremely long podcast description that goes on and on and on and should cause text wrapping issues in the library component layout. The description contains multiple sentences that describe the podcast in great detail, including information about the hosts, the format, the topics covered, and the target audience. This lengthy description is designed to test how the UI handles very long text content and whether it truncates properly or causes layout breaking issues.',
      rssUrl: 'https://example.com/rss',
      imageUrl: 'https://invalid-image-url.com/broken-image.jpg', // Broken image URL
      createdAt: '2024-01-01T00:00:00Z',
      lastUpdated: '2024-01-01T00:00:00Z',
      episodeCount: 50,
      unreadCount: 3,
      lastSynced: '2024-01-01T00:00:00Z'
    },
    {
      podcastId: 'podcast-2',
      title: 'Another Podcast With A Very Long Title That Should Test The Layout System And Text Wrapping Capabilities Of The Library Component',
      description: 'Another extremely verbose podcast description with multiple paragraphs of text that should challenge the layout system. This podcast covers various topics including technology, science, culture, and entertainment. The hosts bring years of experience and expertise to every episode, delivering high-quality content that educates and entertains listeners from around the world.',
      rssUrl: 'https://example.com/rss2',
      imageUrl: 'https://another-broken-image.com/missing.jpg', // Another broken image
      createdAt: '2024-01-02T00:00:00Z',
      lastUpdated: '2024-01-02T00:00:00Z',
      episodeCount: 25,
      unreadCount: 1,
      lastSynced: '2024-01-02T00:00:00Z'
    }
  ],
  total: 2,
  hasMore: false
}

const mockEpisodesResponse = {
  episodes: [
    {
      episodeId: 'episode-1',
      podcastId: 'podcast-1',
      title: 'Episode 1: This Is An Extremely Long Episode Title That Should Cause Significant Layout Issues When Displayed In The Episode Card Component Because It Exceeds All Normal Length Expectations And Contains Multiple Clauses',
      description: 'This is an extremely long episode description that should test the layout system to its limits. The description contains multiple paragraphs of detailed information about the episode content, including background context, key discussion points, guest information, and related resources. This lengthy description is specifically designed to test how the UI handles very long text content in episode cards and whether it causes layout breaking issues or scrolling problems. The episode covers various topics including technology trends, industry analysis, expert interviews, and practical advice for listeners. Additional content includes show notes, references, and supplementary materials that enhance the listening experience.',
      audioUrl: 'https://example.com/audio1.mp3',
      duration: '1:45:30',
      releaseDate: '2024-01-01T00:00:00Z',
      imageUrl: 'https://broken-episode-image.com/missing-thumbnail.jpg', // Broken episode image
      guests: ['Guest 1', 'Guest 2'],
      tags: ['technology', 'interview'],
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      episodeId: 'episode-2',
      podcastId: 'podcast-1',
      title: 'Episode 2: Another Episode With An Exceptionally Long Title That Tests The Boundaries Of The Episode Card Layout System And Text Wrapping Capabilities',
      description: 'Another extremely verbose episode description with multiple sections of detailed information. This episode features in-depth discussions about various topics, expert analysis, and practical insights. The content is designed to provide comprehensive coverage of the subject matter while also testing the UI layout system with extensive text content.',
      audioUrl: 'https://example.com/audio2.mp3',
      duration: '2:15:45',
      releaseDate: '2024-01-02T00:00:00Z',
      imageUrl: 'https://another-broken-episode-image.com/missing.jpg', // Another broken episode image
      guests: ['Expert Guest', 'Industry Professional'],
      tags: ['analysis', 'deep-dive'],
      createdAt: '2024-01-02T00:00:00Z'
    },
    {
      episodeId: 'episode-3',
      podcastId: 'podcast-1',
      title: 'Episode 3: Yet Another Episode With A Ridiculously Long Title That Should Push The Episode Card Component To Its Absolute Limits And Beyond',
      description: 'A third episode with an extremely long description to test multiple episode cards with problematic content. This episode continues the pattern of extensive text content that challenges the layout system.',
      audioUrl: 'https://example.com/audio3.mp3',
      duration: '1:30:20',
      releaseDate: '2024-01-03T00:00:00Z',
      imageUrl: 'https://yet-another-broken-image.com/404.jpg', // Yet another broken image
      guests: ['Long Name Expert Professional'],
      tags: ['testing', 'layout-breaking'],
      createdAt: '2024-01-03T00:00:00Z'
    }
  ],
  pagination: {
    hasMore: false,
    limit: 20
  }
}

const mockEpisodesResponsePodcast2 = {
  episodes: [
    {
      episodeId: 'episode-4',
      podcastId: 'podcast-2',
      title: 'Podcast 2 Episode 1: This Is Another Long Episode Title From The Second Podcast That Should Also Cause Layout Issues',
      description: 'This episode from the second podcast also has a very long description to test the layout system with multiple podcasts and their episodes.',
      audioUrl: 'https://example.com/audio4.mp3',
      duration: '55:30',
      releaseDate: '2024-01-04T00:00:00Z',
      imageUrl: 'https://broken-podcast2-image.com/missing.jpg', // Broken image for podcast 2
      guests: ['Podcast 2 Guest'],
      tags: ['podcast2', 'test'],
      createdAt: '2024-01-04T00:00:00Z'
    }
  ],
  pagination: {
    hasMore: false,
    limit: 20
  }
}

test.describe('Library Page with Long Content', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the authentication to be logged in
    await page.addInitScript(() => {
      // Mock localStorage to simulate logged in state
      localStorage.setItem('rewind_auth_token', 'mock-token')
      localStorage.setItem('rewind_user', JSON.stringify({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      }))
    })

    // Mock API responses - using localhost:3000 as the base URL
    await page.route('**/podcasts', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: mockPodcastsResponse,
            timestamp: new Date().toISOString()
          })
        })
      }
    })

    await page.route('**/episodes/podcast-1', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: mockEpisodesResponse,
            timestamp: new Date().toISOString()
          })
        })
      }
    })

    await page.route('**/episodes/podcast-2', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: mockEpisodesResponsePodcast2,
            timestamp: new Date().toISOString()
          })
        })
      }
    })

    await page.route('**/episodes/podcast-*/sync', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              message: 'Episodes synced successfully',
              episodeCount: 3,
              episodes: mockEpisodesResponse.episodes
            },
            timestamp: new Date().toISOString()
          })
        })
      }
    })

    // Mock the API base URL pattern - catch all for unmocked endpoints
    await page.route('**/localhost:3000/**', async route => {
      // Default fallback for any unmocked API calls
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: { message: 'Not found', code: 'NOT_FOUND' },
          timestamp: new Date().toISOString()
        })
      })
    })
  })

  test('should display library with long titles and broken images', async ({ page }) => {
    // Navigate to library page
    await page.goto('/library')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Verify we're on the library page
    await expect(page.locator('h1:has-text("Your Library")')).toBeVisible()

    // Take initial screenshot of library with collapsed podcasts
    await page.screenshot({
      path: 'test-results/screenshots/library-long-titles-collapsed.png',
      fullPage: true
    })

    // Verify podcasts are displayed
    await expect(page.locator('text=This Is An Extremely Long Podcast Title')).toBeVisible()
    await expect(page.locator('text=Another Podcast With A Very Long Title')).toBeVisible()

    // Take screenshot showing long titles in podcast cards
    await page.screenshot({
      path: 'test-results/screenshots/library-long-podcast-titles.png',
      fullPage: true
    })
  })

  test('should expand first podcast and show episodes with broken thumbnails', async ({ page }) => {
    await page.goto('/library')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Find and click the expand button for the first podcast
    const expandButton = page.locator('button[title="Show episodes"]').first()
    await expandButton.click()

    // Wait for episodes to load
    await page.waitForTimeout(2000)

    // Verify episodes are displayed
    await expect(page.locator('text=Episode 1: This Is An Extremely Long Episode Title')).toBeVisible()

    // Take screenshot of expanded first podcast with episode cards
    await page.screenshot({
      path: 'test-results/screenshots/library-first-podcast-expanded.png',
      fullPage: true
    })

    // Verify episode cards are present
    const episodeCards = page.locator('[data-testid="episode-card"]')
    await expect(episodeCards).toHaveCount(3)

    // Take focused screenshot of episode cards area
    await page.locator('[data-testid="episode-card"]').first().screenshot({
      path: 'test-results/screenshots/library-episode-card-with-long-title.png'
    })

    // Take screenshot showing all episode cards with broken images
    await page.screenshot({
      path: 'test-results/screenshots/library-episodes-with-broken-thumbnails.png',
      fullPage: true
    })
  })

  test('should expand both podcasts and show layout issues', async ({ page }) => {
    await page.goto('/library')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Expand first podcast
    const firstExpandButton = page.locator('button[title="Show episodes"]').first()
    await firstExpandButton.click()
    await page.waitForTimeout(1500)

    // Expand second podcast
    const secondExpandButton = page.locator('button[title="Show episodes"]').nth(1)
    await secondExpandButton.click()
    await page.waitForTimeout(1500)

    // Take screenshot with both podcasts expanded
    await page.screenshot({
      path: 'test-results/screenshots/library-both-podcasts-expanded.png',
      fullPage: true
    })

    // Verify both sets of episodes are visible
    await expect(page.locator('text=Episode 1: This Is An Extremely Long Episode Title')).toBeVisible()
    await expect(page.locator('text=Podcast 2 Episode 1: This Is Another Long Episode Title')).toBeVisible()

    // Take screenshot showing the full layout problems
    await page.screenshot({
      path: 'test-results/screenshots/library-full-layout-issues.png',
      fullPage: true
    })
  })

  test('should handle mobile viewport with long content', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })
    
    await page.goto('/library')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Take mobile screenshot of library
    await page.screenshot({
      path: 'test-results/screenshots/library-mobile-long-titles.png',
      fullPage: true
    })

    // Expand first podcast on mobile
    const expandButton = page.locator('button[title="Show episodes"]').first()
    await expandButton.click()
    await page.waitForTimeout(1500)

    // Take mobile screenshot with expanded episodes
    await page.screenshot({
      path: 'test-results/screenshots/library-mobile-expanded-episodes.png',
      fullPage: true
    })

    // Verify episode cards are responsive
    const episodeCards = page.locator('[data-testid="episode-card"]')
    await expect(episodeCards).toHaveCount(3)

    // Take focused screenshot of mobile episode card
    await page.locator('[data-testid="episode-card"]').first().screenshot({
      path: 'test-results/screenshots/library-mobile-episode-card.png'
    })
  })

  test('should handle episode interactions with long titles', async ({ page }) => {
    await page.goto('/library')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Expand first podcast
    const expandButton = page.locator('button[title="Show episodes"]').first()
    await expandButton.click()
    await page.waitForTimeout(1500)

    // Take screenshot before interaction
    await page.screenshot({
      path: 'test-results/screenshots/library-before-episode-interaction.png',
      fullPage: true
    })

    // Try to click play button on first episode
    const playButton = page.locator('[data-testid="episode-card"]').first().locator('button:has-text("Play")')
    await playButton.click()
    await page.waitForTimeout(1000)

    // Take screenshot after play button click
    await page.screenshot({
      path: 'test-results/screenshots/library-after-play-button-click.png',
      fullPage: true
    })

    // Try to click AI explanation button
    const aiButton = page.locator('[data-testid="episode-card"]').first().locator('button[aria-label="Get AI explanation"]')
    await aiButton.click()
    await page.waitForTimeout(1000)

    // Take screenshot after AI button click
    await page.screenshot({
      path: 'test-results/screenshots/library-after-ai-button-click.png',
      fullPage: true
    })
  })

  test('should test sync functionality with long content', async ({ page }) => {
    await page.goto('/library')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Take initial screenshot
    await page.screenshot({
      path: 'test-results/screenshots/library-before-sync.png',
      fullPage: true
    })

    // Click sync button on first podcast
    const syncButton = page.locator('button[title="Sync episodes"]').first()
    await syncButton.click()
    await page.waitForTimeout(1000)

    // Take screenshot during sync
    await page.screenshot({
      path: 'test-results/screenshots/library-during-sync.png',
      fullPage: true
    })

    // Wait for sync to complete
    await page.waitForTimeout(2000)

    // Take screenshot after sync
    await page.screenshot({
      path: 'test-results/screenshots/library-after-sync.png',
      fullPage: true
    })
  })

  test('should capture broken image states', async ({ page }) => {
    await page.goto('/library')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // Give images time to fail loading

    // Take screenshot showing broken podcast images
    await page.screenshot({
      path: 'test-results/screenshots/library-broken-podcast-images.png',
      fullPage: true
    })

    // Expand first podcast to show broken episode images
    const expandButton = page.locator('button[title="Show episodes"]').first()
    await expandButton.click()
    await page.waitForTimeout(2000) // Give episode images time to fail loading

    // Take screenshot showing broken episode images
    await page.screenshot({
      path: 'test-results/screenshots/library-broken-episode-images.png',
      fullPage: true
    })

    // Verify placeholder images are shown instead of broken images
    const podcastPlaceholders = page.locator('svg').filter({ hasText: 'play' })
    await expect(podcastPlaceholders).toHaveCount(2) // 2 podcasts with broken images

    // Take final screenshot highlighting the placeholder images
    await page.screenshot({
      path: 'test-results/screenshots/library-placeholder-images-final.png',
      fullPage: true
    })
  })
})