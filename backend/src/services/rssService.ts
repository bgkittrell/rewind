import Parser from 'rss-parser'
import { v4 as uuidv4 } from 'uuid'

interface RSSFeedData {
  title: string
  description: string
  image?: string
  episodeCount: number
  lastUpdated: string
}

export interface EpisodeData {
  title: string
  description: string
  audioUrl: string
  duration: string
  releaseDate: string
  imageUrl?: string
  guests?: string[]
  tags?: string[]
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
      // Handle various image object formats
      if (typeof feed.itunes.image === 'string') {
        return feed.itunes.image
      }
      if (feed.itunes.image.href) {
        return feed.itunes.image.href
      }
      if (feed.itunes.image.url) {
        return feed.itunes.image.url
      }
      if (feed.itunes.image.$ && feed.itunes.image.$.href) {
        return feed.itunes.image.$.href
      }
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

  async parseEpisodesFromFeed(rssUrl: string, limit = 50): Promise<EpisodeData[]> {
    try {
      const feed = await this.parser.parseURL(rssUrl)

      if (!feed.items || feed.items.length === 0) {
        return []
      }

      // Get podcast image as fallback for episodes
      const podcastImageUrl = this.extractImageUrl(feed)

      // Process episodes (limit to most recent)
      const episodes = feed.items
        .slice(0, limit)
        .map((item: any): EpisodeData | null => {
          const audioUrl = this.extractAudioUrl(item)
          if (!audioUrl) {
            return null // Skip episodes without audio
          }

          const episodeImageUrl = this.extractEpisodeImage(item) || podcastImageUrl

          const episode: EpisodeData = {
            title: item.title || 'Untitled Episode',
            description: this.sanitizeDescription(item.content || item.summary || item.description || ''),
            audioUrl,
            duration: this.parseDuration(item.duration || item['itunes:duration'] || '0:00'),
            releaseDate: this.parseReleaseDate(item.pubDate || item.isoDate),
            guests: this.extractGuests(item.content || item.summary || item.description || ''),
            tags: this.extractTags(item.categories || []),
          }

          // Only add imageUrl if it exists
          if (episodeImageUrl) {
            episode.imageUrl = episodeImageUrl
          }

          return episode
        })
        .filter((episode): episode is EpisodeData => episode !== null)

      return episodes
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse episodes from RSS feed: ${error.message}`)
      }
      throw new Error('Failed to parse episodes from RSS feed: Unknown error')
    }
  }

  private extractAudioUrl(item: any): string | null {
    // Try different ways to get the audio URL
    if (item.enclosure?.url && this.isAudioFile(item.enclosure.url)) {
      return item.enclosure.url
    }

    if (item.link && this.isAudioFile(item.link)) {
      return item.link
    }

    // Check in content for audio links
    if (item.content) {
      const audioUrlMatch = item.content.match(/https?:\/\/[^\s"'<>]+\.(?:mp3|m4a|ogg|wav|aac)/i)
      if (audioUrlMatch) {
        return audioUrlMatch[0]
      }
    }

    return null
  }

  private isAudioFile(url: string): boolean {
    const audioExtensions = ['.mp3', '.m4a', '.ogg', '.wav', '.aac']
    const urlLower = url.toLowerCase()
    return audioExtensions.some(ext => urlLower.includes(ext))
  }

  private parseDuration(duration: string): string {
    if (!duration || duration === '0' || duration === '0:00') {
      return '0:00'
    }

    // Handle different duration formats
    // HH:MM:SS or MM:SS or just seconds
    const timeMatch = duration.match(/(\d+):(\d+):(\d+)|(\d+):(\d+)|(\d+)/)

    if (timeMatch) {
      if (timeMatch[1] && timeMatch[2] && timeMatch[3]) {
        // HH:MM:SS format
        return `${timeMatch[1]}:${timeMatch[2].padStart(2, '0')}:${timeMatch[3].padStart(2, '0')}`
      } else if (timeMatch[4] && timeMatch[5]) {
        // MM:SS format
        return `${timeMatch[4]}:${timeMatch[5].padStart(2, '0')}`
      } else if (timeMatch[6]) {
        // Just seconds
        const totalSeconds = parseInt(timeMatch[6], 10)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
      }
    }

    return duration || '0:00'
  }

  private parseReleaseDate(dateString: string): string {
    if (!dateString) {
      return new Date().toISOString()
    }

    try {
      return new Date(dateString).toISOString()
    } catch {
      return new Date().toISOString()
    }
  }

  private extractEpisodeImage(item: any): string | undefined {
    // Try to get episode-specific image
    if (item.image?.url) {
      return item.image.url
    }
    if (item['itunes:image']?.href) {
      return item['itunes:image'].href
    }
    if (item.image) {
      // Handle various image object formats
      if (typeof item.image === 'string') {
        return item.image
      }
      if (item.image.href) {
        return item.image.href
      }
      if (item.image.url) {
        return item.image.url
      }
      if (item.image.$ && item.image.$.href) {
        return item.image.$.href
      }
    }
    return undefined
  }

  private extractGuests(content: string): string[] {
    if (!content) return []

    // Simple guest extraction - look for common patterns
    const guestPatterns = [
      /(?:with|featuring|guest|interview)\s+([A-Z][a-z]+ [A-Z][a-z]+)/gi,
      /([A-Z][a-z]+ [A-Z][a-z]+)\s+(?:joins|appears|guests)/gi,
    ]

    const guests: string[] = []
    guestPatterns.forEach(pattern => {
      const matches = content.match(pattern)
      if (matches) {
        matches.forEach(match => {
          const nameMatch = match.match(/[A-Z][a-z]+ [A-Z][a-z]+/)
          if (nameMatch) {
            guests.push(nameMatch[0])
          }
        })
      }
    })

    // Remove duplicates and return max 5 guests
    return [...new Set(guests)].slice(0, 5)
  }

  private extractTags(categories: any[]): string[] {
    if (!Array.isArray(categories)) return []

    return categories
      .map(cat => {
        if (typeof cat === 'string') return cat.toLowerCase()
        if (cat?._ && typeof cat._ === 'string') return cat._.toLowerCase()
        if (cat?.name && typeof cat.name === 'string') return cat.name.toLowerCase()
        return null
      })
      .filter((tag): tag is string => tag !== null)
      .slice(0, 10) // Limit tags
  }

  private sanitizeDescription(description: string): string {
    if (!description) return ''

    // Remove HTML tags and decode HTML entities
    const withoutHtml = description.replace(/<[^>]*>/g, '')
    const decoded = withoutHtml
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')

    // Trim and limit length
    return decoded.trim().substring(0, 2000)
  }
}

export const rssService = new RSSService()
export default rssService
