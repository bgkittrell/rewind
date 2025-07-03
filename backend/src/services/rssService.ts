import Parser from 'rss-parser'

interface RSSFeedData {
  title: string
  description: string
  image?: string
  episodeCount: number
  lastUpdated: string
}

export class RSSService {
  private parser: Parser

  constructor() {
    this.parser = new Parser({
      // Custom fields to extract from RSS
      customFields: {
        item: [
          ['itunes:duration', 'duration'],
          ['itunes:image', 'image'],
          ['itunes:explicit', 'explicit'],
        ],
      },
    })
  }

  async validateAndParseFeed(rssUrl: string): Promise<RSSFeedData> {
    try {
      // Validate URL format
      const url = new URL(rssUrl)
      if (!url.protocol.startsWith('http')) {
        throw new Error('Invalid RSS URL protocol')
      }

      // Parse the RSS feed
      const feed = await this.parser.parseURL(rssUrl)

      // Validate required fields
      if (!feed.title) {
        throw new Error('RSS feed is missing required title')
      }

      // Extract podcast information
      const podcastData: RSSFeedData = {
        title: feed.title,
        description: feed.description || 'No description available',
        image: this.extractImageUrl(feed),
        episodeCount: feed.items?.length || 0,
        lastUpdated: new Date().toISOString(),
      }

      return podcastData
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse RSS feed: ${error.message}`)
      }
      throw new Error('Failed to parse RSS feed: Unknown error')
    }
  }

  private extractImageUrl(feed: any): string | undefined {
    // Try different ways to get the podcast image
    if (feed.image?.url) {
      return feed.image.url
    }
    if (feed.image?.link) {
      return feed.image.link
    }
    if (feed.itunes?.image) {
      return feed.itunes.image
    }
    if (feed['itunes:image']?.href) {
      return feed['itunes:image'].href
    }
    return undefined
  }

  async getEpisodeCount(rssUrl: string): Promise<number> {
    try {
      const feed = await this.parser.parseURL(rssUrl)
      return feed.items?.length || 0
    } catch {
      return 0
    }
  }
}

export const rssService = new RSSService()
export default rssService
