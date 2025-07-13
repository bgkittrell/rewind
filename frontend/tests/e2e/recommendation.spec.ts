import { test, expect, Page } from '@playwright/test'

test.describe('Recommendation Engine E2E Tests', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    
    // Navigate to the app
    await page.goto('/')
    
    // Mock the API endpoints for testing
    await page.route('**/api/auth/signin', async route => {
      await route.fulfill({
        json: {
          message: 'Sign in successful',
          tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            idToken: 'mock-id-token',
          },
          user: {
            id: 'test-user-123',
            email: 'test@example.com',
            name: 'Test User',
          },
        },
      })
    })

    await page.route('**/api/podcasts', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: {
            data: {
              podcasts: [
                {
                  podcastId: 'pod-123',
                  title: 'Test Comedy Podcast',
                  rssUrl: 'https://example.com/podcast.rss',
                  imageUrl: 'https://example.com/podcast-image.jpg',
                  description: 'A test comedy podcast',
                  episodeCount: 50,
                  createdAt: '2024-01-01T00:00:00Z',
                  lastUpdated: '2024-01-15T00:00:00Z',
                },
              ],
              total: 1,
              hasMore: false,
            },
          },
        })
      }
    })

    await page.route('**/api/recommendations', async route => {
      await route.fulfill({
        json: {
          data: [
            {
              episodeId: 'ep-123',
              episode: {
                episodeId: 'ep-123',
                title: 'Hilarious Episode from 2022',
                podcastName: 'Test Comedy Podcast',
                podcastId: 'pod-123',
                releaseDate: '2022-06-15T08:00:00Z',
                duration: '45:30',
                audioUrl: 'https://example.com/episode.mp3',
                imageUrl: 'https://example.com/episode-image.jpg',
                description: 'A funny episode with great guests',
                extractedGuests: ['Comedian A', 'Comedian B'],
              },
              score: 0.85,
              reasons: [
                'You haven\'t listened to this in a while',
                'Features comedians you\'ve enjoyed before',
                'High rating from similar users',
              ],
              factors: {
                recentShowListening: 0.7,
                newEpisodeBonus: 0.0,
                rediscoveryBonus: 0.9,
                guestMatchBonus: 0.8,
                favoriteBonus: 0.6,
              },
            },
            {
              episodeId: 'ep-456',
              episode: {
                episodeId: 'ep-456',
                title: 'Classic Episode Worth Revisiting',
                podcastName: 'Test Comedy Podcast',
                podcastId: 'pod-123',
                releaseDate: '2021-03-20T08:00:00Z',
                duration: '52:15',
                audioUrl: 'https://example.com/episode2.mp3',
                imageUrl: 'https://example.com/episode2-image.jpg',
                description: 'A classic episode that aged well',
                extractedGuests: ['Comedian C'],
              },
              score: 0.78,
              reasons: [
                'One of your favorite episodes from the past',
                'Great for rediscovery',
              ],
              factors: {
                recentShowListening: 0.6,
                newEpisodeBonus: 0.0,
                rediscoveryBonus: 0.8,
                guestMatchBonus: 0.7,
                favoriteBonus: 0.9,
              },
            },
          ],
          timestamp: '2024-01-15T10:30:00Z',
          path: '/recommendations',
        },
      })
    })
  })

  test.describe('Authentication Flow', () => {
    test('should authenticate user before showing recommendations', async () => {
      // User should see login form initially
      await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible()
      
      // Fill in login credentials
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      
      // Submit login
      await page.click('[data-testid="login-button"]')
      
      // Should redirect to home page with recommendations
      await expect(page.locator('[data-testid="auth-modal"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="recommendations-section"]')).toBeVisible()
    })
  })

  test.describe('Recommendation Display', () => {
    test.beforeEach(async () => {
      // Login first
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      await expect(page.locator('[data-testid="recommendations-section"]')).toBeVisible()
    })

    test('should display recommendation cards with episode information', async () => {
      // Check that recommendation cards are displayed
      const recommendationCards = page.locator('[data-testid="recommendation-card"]')
      await expect(recommendationCards).toHaveCount(2)
      
      // Check first recommendation card content
      const firstCard = recommendationCards.first()
      await expect(firstCard.locator('[data-testid="episode-title"]')).toContainText('Hilarious Episode from 2022')
      await expect(firstCard.locator('[data-testid="podcast-name"]')).toContainText('Test Comedy Podcast')
      await expect(firstCard.locator('[data-testid="episode-duration"]')).toContainText('45:30')
      await expect(firstCard.locator('[data-testid="episode-image"]')).toBeVisible()
    })

    test('should show recommendation explanations', async () => {
      const firstCard = page.locator('[data-testid="recommendation-card"]').first()
      
      // Check that explanation button is present
      await expect(firstCard.locator('[data-testid="explanation-button"]')).toBeVisible()
      
      // Click explanation button
      await firstCard.locator('[data-testid="explanation-button"]').click()
      
      // Check that explanation modal is displayed
      await expect(page.locator('[data-testid="explanation-modal"]')).toBeVisible()
      
      // Check explanation content
      await expect(page.locator('[data-testid="explanation-reasons"]')).toContainText('You haven\'t listened to this in a while')
      await expect(page.locator('[data-testid="explanation-reasons"]')).toContainText('Features comedians you\'ve enjoyed before')
      
      // Check scoring factors
      await expect(page.locator('[data-testid="scoring-factors"]')).toBeVisible()
      await expect(page.locator('[data-testid="rediscovery-score"]')).toContainText('0.9')
    })

    test('should handle recommendation feedback', async () => {
      let feedbackCaptured = false
      
      // Mock feedback API endpoint
      await page.route('**/api/recommendations/guest-analytics', async route => {
        feedbackCaptured = true
        await route.fulfill({
          json: {
            data: {
              message: 'Guest analytics updated successfully',
            },
          },
        })
      })
      
      const firstCard = page.locator('[data-testid="recommendation-card"]').first()
      
      // Click thumbs up
      await firstCard.locator('[data-testid="thumbs-up-button"]').click()
      
      // Check that feedback was sent
      await expect(page.locator('[data-testid="feedback-success"]')).toBeVisible()
      expect(feedbackCaptured).toBe(true)
      
      // Check that button state changed
      await expect(firstCard.locator('[data-testid="thumbs-up-button"]')).toHaveClass(/active/)
    })
  })

  test.describe('Recommendation Filtering', () => {
    test.beforeEach(async () => {
      // Login first
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      await expect(page.locator('[data-testid="recommendations-section"]')).toBeVisible()
    })

    test('should filter recommendations by favorites', async () => {
      let filterApplied = false
      
      // Mock filtered recommendations API
      await page.route('**/api/recommendations?*favorites=true*', async route => {
        filterApplied = true
        await route.fulfill({
          json: {
            data: [
              {
                episodeId: 'ep-456',
                episode: {
                  episodeId: 'ep-456',
                  title: 'Favorite Episode',
                  podcastName: 'Test Comedy Podcast',
                  podcastId: 'pod-123',
                  releaseDate: '2021-03-20T08:00:00Z',
                  duration: '52:15',
                  audioUrl: 'https://example.com/episode2.mp3',
                  imageUrl: 'https://example.com/episode2-image.jpg',
                  description: 'A favorite episode',
                  extractedGuests: ['Comedian C'],
                },
                score: 0.95,
                reasons: ['This is one of your favorite episodes'],
                factors: {
                  recentShowListening: 0.6,
                  newEpisodeBonus: 0.0,
                  rediscoveryBonus: 0.8,
                  guestMatchBonus: 0.7,
                  favoriteBonus: 1.0,
                },
              },
            ],
          },
        })
      })
      
      // Apply favorites filter
      await page.click('[data-testid="favorites-filter"]')
      
      // Check that filter was applied
      expect(filterApplied).toBe(true)
      
      // Check that only favorite episodes are shown
      const recommendationCards = page.locator('[data-testid="recommendation-card"]')
      await expect(recommendationCards).toHaveCount(1)
      await expect(recommendationCards.first().locator('[data-testid="episode-title"]')).toContainText('Favorite Episode')
    })

    test('should filter recommendations by guests', async () => {
      // Apply guests filter
      await page.click('[data-testid="guests-filter"]')
      
      // Check that filter indicator is active
      await expect(page.locator('[data-testid="guests-filter"]')).toHaveClass(/active/)
      
      // Check that recommendations still show guest information
      const firstCard = page.locator('[data-testid="recommendation-card"]').first()
      await expect(firstCard.locator('[data-testid="episode-guests"]')).toContainText('Comedian A')
      await expect(firstCard.locator('[data-testid="episode-guests"]')).toContainText('Comedian B')
    })
  })

  test.describe('Mobile Experience', () => {
    test.beforeEach(async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Login
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      await expect(page.locator('[data-testid="recommendations-section"]')).toBeVisible()
    })

    test('should display recommendations properly on mobile', async () => {
      // Check that cards are stacked vertically on mobile
      const recommendationCards = page.locator('[data-testid="recommendation-card"]')
      await expect(recommendationCards).toHaveCount(2)
      
      // Check that cards take full width on mobile
      const firstCard = recommendationCards.first()
      const cardWidth = await firstCard.evaluate(el => el.getBoundingClientRect().width)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      
      // Card should take most of the viewport width (accounting for padding)
      expect(cardWidth).toBeGreaterThan(viewportWidth * 0.8)
    })

    test('should support touch gestures for feedback', async () => {
      const firstCard = page.locator('[data-testid="recommendation-card"]').first()
      
      // Test touch tap on thumbs up button
      await firstCard.locator('[data-testid="thumbs-up-button"]').tap()
      
      // Check that feedback was registered
      await expect(page.locator('[data-testid="feedback-success"]')).toBeVisible()
      await expect(firstCard.locator('[data-testid="thumbs-up-button"]')).toHaveClass(/active/)
    })

    test('should support pull-to-refresh', async () => {
      let refreshRequested = false
      
      // Mock refresh API call
      await page.route('**/api/recommendations', async route => {
        refreshRequested = true
        await route.fulfill({
          json: {
            data: [
              {
                episodeId: 'ep-789',
                episode: {
                  episodeId: 'ep-789',
                  title: 'Fresh Recommendation',
                  podcastName: 'Test Comedy Podcast',
                  podcastId: 'pod-123',
                  releaseDate: '2022-12-01T08:00:00Z',
                  duration: '38:45',
                  audioUrl: 'https://example.com/episode3.mp3',
                  imageUrl: 'https://example.com/episode3-image.jpg',
                  description: 'A fresh recommendation',
                  extractedGuests: ['New Comedian'],
                },
                score: 0.92,
                reasons: ['Fresh content you might enjoy'],
                factors: {
                  recentShowListening: 0.8,
                  newEpisodeBonus: 0.1,
                  rediscoveryBonus: 0.7,
                  guestMatchBonus: 0.6,
                  favoriteBonus: 0.5,
                },
              },
            ],
          },
        })
      })
      
      // Simulate pull-to-refresh gesture
      const recommendationsSection = page.locator('[data-testid="recommendations-section"]')
      await recommendationsSection.hover()
      await page.mouse.down()
      await page.mouse.move(0, 100) // Pull down
      await page.mouse.up()
      
      // Check that refresh was triggered
      expect(refreshRequested).toBe(true)
      
      // Check that new recommendation appears
      await expect(page.locator('[data-testid="recommendation-card"]')).toHaveCount(1)
      await expect(page.locator('[data-testid="episode-title"]')).toContainText('Fresh Recommendation')
    })
  })

  test.describe('Error Handling', () => {
    test.beforeEach(async () => {
      // Login first
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
    })

    test('should handle recommendation loading errors gracefully', async () => {
      // Mock API error
      await page.route('**/api/recommendations', async route => {
        await route.fulfill({
          status: 500,
          json: {
            error: {
              message: 'Internal server error',
              code: 'INTERNAL_SERVER_ERROR',
            },
          },
        })
      })
      
      // Navigate to recommendations
      await page.click('[data-testid="recommendations-tab"]')
      
      // Check that error message is displayed
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Unable to load recommendations')
      
      // Check that retry button is present
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    })

    test('should handle network failures with offline support', async () => {
      // Go offline
      await page.context().setOffline(true)
      
      // Try to refresh recommendations
      await page.click('[data-testid="refresh-button"]')
      
      // Check that offline message is displayed
      await expect(page.locator('[data-testid="offline-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="offline-message"]')).toContainText('You\'re offline')
      
      // Check that cached recommendations are still available
      await expect(page.locator('[data-testid="recommendation-card"]')).toHaveCount(2)
    })
  })

  test.describe('Performance', () => {
    test('should load recommendations within acceptable time', async () => {
      // Login first
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      
      // Measure recommendation loading time
      const startTime = Date.now()
      
      // Navigate to recommendations
      await page.click('[data-testid="recommendations-tab"]')
      
      // Wait for recommendations to load
      await expect(page.locator('[data-testid="recommendation-card"]')).toHaveCount(2)
      
      const loadTime = Date.now() - startTime
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
    })

    test('should handle large recommendation sets efficiently', async () => {
      // Mock large recommendation set
      const largeRecommendationSet = Array.from({ length: 50 }, (_, i) => ({
        episodeId: `ep-${i}`,
        episode: {
          episodeId: `ep-${i}`,
          title: `Episode ${i}`,
          podcastName: 'Test Comedy Podcast',
          podcastId: 'pod-123',
          releaseDate: '2022-01-01T08:00:00Z',
          duration: '45:30',
          audioUrl: `https://example.com/episode${i}.mp3`,
          imageUrl: `https://example.com/episode${i}-image.jpg`,
          description: `Episode ${i} description`,
          extractedGuests: [`Guest ${i}`],
        },
        score: Math.random(),
        reasons: [`Reason for episode ${i}`],
        factors: {
          recentShowListening: Math.random(),
          newEpisodeBonus: Math.random(),
          rediscoveryBonus: Math.random(),
          guestMatchBonus: Math.random(),
          favoriteBonus: Math.random(),
        },
      }))
      
      await page.route('**/api/recommendations', async route => {
        await route.fulfill({
          json: {
            data: largeRecommendationSet,
          },
        })
      })
      
      // Login and navigate to recommendations
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      
      // Check that virtual scrolling or pagination handles large sets
      await expect(page.locator('[data-testid="recommendation-card"]')).toHaveCount(20) // Should show first page
      
      // Check that scroll loading works
      await page.locator('[data-testid="recommendations-section"]').scrollIntoViewIfNeeded()
      await page.mouse.wheel(0, 1000) // Scroll down
      
      // Should load more recommendations
      await expect(page.locator('[data-testid="recommendation-card"]')).toHaveCount(40)
    })
  })
})