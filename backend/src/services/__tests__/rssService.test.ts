import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RSSService } from '../rssService'

// Mock rss-parser
vi.mock('rss-parser', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      parseURL: vi.fn(),
    })),
  }
})

describe('RSSService', () => {
  let rssService: RSSService
  let mockParser: any

  beforeEach(() => {
    vi.clearAllMocks()
    rssService = new RSSService()
    mockParser = (rssService as any).parser
  })

  describe('parseEpisodesFromFeed', () => {
    it('should parse episodes successfully', async () => {
      const mockFeed = {
        title: 'Test Podcast',
        image: { url: 'https://example.com/image.jpg' },
        items: [
          {
            title: 'Test Episode',
            content: 'Episode description',
            enclosure: { url: 'https://example.com/episode.mp3' },
            duration: '30:00',
            pubDate: '2024-01-01T00:00:00Z',
            categories: ['comedy'],
          },
        ],
      }

      mockParser.parseURL.mockResolvedValue(mockFeed)

      const result = await rssService.parseEpisodesFromFeed('https://example.com/feed.xml')

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Test Episode')
      expect(result[0].audioUrl).toBe('https://example.com/episode.mp3')
      expect(result[0].duration).toBe('30:00')
    })

    it('should return empty array when no items', async () => {
      const mockFeed = {
        title: 'Test Podcast',
        items: [],
      }

      mockParser.parseURL.mockResolvedValue(mockFeed)

      const result = await rssService.parseEpisodesFromFeed('https://example.com/feed.xml')

      expect(result).toHaveLength(0)
    })

    it('should handle missing audio URLs', async () => {
      const mockFeed = {
        title: 'Test Podcast',
        items: [
          {
            title: 'Test Episode',
            content: 'Episode description',
            // No enclosure/audio URL
          },
        ],
      }

      mockParser.parseURL.mockResolvedValue(mockFeed)

      const result = await rssService.parseEpisodesFromFeed('https://example.com/feed.xml')

      expect(result).toHaveLength(0) // Should filter out episodes without audio
    })

    it('should handle RSS parsing errors', async () => {
      mockParser.parseURL.mockRejectedValue(new Error('Network error'))

      await expect(rssService.parseEpisodesFromFeed('https://example.com/feed.xml')).rejects.toThrow(
        'Failed to parse episodes from RSS feed',
      )
    })
  })

  describe('validateAndParseFeed', () => {
    it('should validate and parse feed successfully', async () => {
      const mockFeed = {
        title: 'Test Podcast',
        description: 'Test description',
        items: [{ title: 'Episode 1' }],
      }

      mockParser.parseURL.mockResolvedValue(mockFeed)

      const result = await rssService.validateAndParseFeed('https://example.com/feed.xml')

      expect(result.title).toBe('Test Podcast')
      expect(result.episodeCount).toBe(1)
    })

    it('should handle invalid URL protocol', async () => {
      await expect(rssService.validateAndParseFeed('ftp://example.com/feed.xml')).rejects.toThrow(
        'Invalid RSS URL protocol',
      )
    })

    it('should handle missing title', async () => {
      const mockFeed = {
        // Missing title
        description: 'Test description',
        items: [],
      }

      mockParser.parseURL.mockResolvedValue(mockFeed)

      await expect(rssService.validateAndParseFeed('https://example.com/feed.xml')).rejects.toThrow(
        'RSS feed is missing required title',
      )
    })
  })
})
