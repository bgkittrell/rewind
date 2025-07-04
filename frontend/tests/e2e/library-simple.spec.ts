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
      description: 'Another extremely verbose podcast description with multiple paragraphs of text that should challenge the layout system.',
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
      description: 'This is an extremely long episode description that should test the layout system to its limits. The description contains multiple paragraphs of detailed information about the episode content, including background context, key discussion points, guest information, and related resources.',
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
      description: 'Another extremely verbose episode description with multiple sections of detailed information.',
      audioUrl: 'https://example.com/audio2.mp3',
      duration: '2:15:45',
      releaseDate: '2024-01-02T00:00:00Z',
      imageUrl: 'https://another-broken-episode-image.com/missing.jpg', // Another broken episode image
      guests: ['Expert Guest', 'Industry Professional'],
      tags: ['analysis', 'deep-dive'],
      createdAt: '2024-01-02T00:00:00Z'
    }
  ],
  pagination: {
    hasMore: false,
    limit: 20
  }
}

test.describe('Library Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the authentication to be logged in
    await page.addInitScript(() => {
      localStorage.setItem('rewind_auth_token', 'mock-token')
      localStorage.setItem('rewind_user', JSON.stringify({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      }))
    })

    // Mock API responses
    await page.route('**/podcasts', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: mockPodcastsResponse,
          timestamp: new Date().toISOString()
        })
      })
    })

    await page.route('**/episodes/podcast-1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: mockEpisodesResponse,
          timestamp: new Date().toISOString()
        })
      })
    })
  })

  test('library with long titles - desktop view', async ({ page }) => {
    await page.goto('http://localhost:5173/library')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Take screenshot of library with long titles
    await page.screenshot({
      path: 'test-results/screenshots/library-long-titles-desktop.png',
      fullPage: true
    })
  })

  test('library with long titles - mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('http://localhost:5173/library')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Take screenshot of library with long titles on mobile
    await page.screenshot({
      path: 'test-results/screenshots/library-long-titles-mobile.png',
      fullPage: true
    })
  })

  test('library with expanded episodes', async ({ page }) => {
    await page.goto('http://localhost:5173/library')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Take screenshot before expanding
    await page.screenshot({
      path: 'test-results/screenshots/library-before-expand.png',
      fullPage: true
    })

    // Try to expand first podcast
    const expandButton = page.locator('button[title="Show episodes"]').first()
    if (await expandButton.isVisible()) {
      await expandButton.click()
      await page.waitForTimeout(3000)
      
      // Take screenshot after expanding
      await page.screenshot({
        path: 'test-results/screenshots/library-expanded-episodes.png',
        fullPage: true
      })
      
      // Take screenshot showing broken thumbnails specifically
      await page.screenshot({
        path: 'test-results/screenshots/library-broken-thumbnails.png',
        fullPage: true
      })
    }
  })

  test('library broken images showcase', async ({ page }) => {
    await page.goto('http://localhost:5173/library')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000) // Give more time for images to fail loading

    // Take screenshot showing broken podcast images
    await page.screenshot({
      path: 'test-results/screenshots/library-broken-images-showcase.png',
      fullPage: true
    })
  })
})