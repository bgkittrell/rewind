import { DatabaseService, Tables } from './database.js'

export interface Podcast {
  userId: string
  podcastId: string
  title: string
  rssUrl: string
  imageUrl: string
  description: string
  episodeCount: number
  lastSynced: string
  createdAt: string
  updatedAt: string
}

export interface PodcastInput {
  title: string
  rssUrl: string
  imageUrl: string
  description: string
  episodeCount?: number
}

export class PodcastService extends DatabaseService {
  constructor() {
    super(Tables.PODCASTS)
  }

  async addPodcast(userId: string, podcastData: PodcastInput): Promise<Podcast> {
    const now = new Date().toISOString()
    const podcastId = this.generatePodcastId()

    const podcast: Podcast = {
      userId,
      podcastId,
      title: podcastData.title,
      rssUrl: podcastData.rssUrl,
      imageUrl: podcastData.imageUrl,
      description: podcastData.description,
      episodeCount: podcastData.episodeCount || 0,
      lastSynced: now,
      createdAt: now,
      updatedAt: now,
    }

    await this.put(podcast)
    return podcast
  }

  async getUserPodcasts(userId: string, limit?: number, offset?: string): Promise<{ podcasts: Podcast[], hasMore: boolean, total: number }> {
    const result = await this.queryWithFilter(
      'userId',
      userId,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      limit,
      offset ? { userId, podcastId: offset } : undefined
    )

    // For total count, we'd need a separate query or maintain a counter
    // For now, we'll estimate based on the current page
    const total = result.items.length

    return {
      podcasts: result.items as Podcast[],
      hasMore: result.hasMore,
      total,
    }
  }

  async getPodcast(userId: string, podcastId: string): Promise<Podcast | undefined> {
    const podcast = await this.get({ userId, podcastId })
    return podcast as Podcast | undefined
  }

  async updatePodcast(userId: string, podcastId: string, updates: Partial<Omit<Podcast, 'userId' | 'podcastId' | 'createdAt'>>): Promise<Podcast> {
    const now = new Date().toISOString()
    const updateExpression = 'SET updatedAt = :updatedAt'
    const expressionAttributeValues: Record<string, any> = { ':updatedAt': now }

    const updateParts: string[] = []
    if (updates.title) {
      updateParts.push('title = :title')
      expressionAttributeValues[':title'] = updates.title
    }
    if (updates.description) {
      updateParts.push('description = :description')
      expressionAttributeValues[':description'] = updates.description
    }
    if (updates.imageUrl) {
      updateParts.push('imageUrl = :imageUrl')
      expressionAttributeValues[':imageUrl'] = updates.imageUrl
    }
    if (updates.episodeCount !== undefined) {
      updateParts.push('episodeCount = :episodeCount')
      expressionAttributeValues[':episodeCount'] = updates.episodeCount
    }
    if (updates.lastSynced) {
      updateParts.push('lastSynced = :lastSynced')
      expressionAttributeValues[':lastSynced'] = updates.lastSynced
    }

    const finalUpdateExpression = updateParts.length > 0 
      ? `${updateExpression}, ${updateParts.join(', ')}`
      : updateExpression

    const result = await this.update(
      { userId, podcastId },
      finalUpdateExpression,
      expressionAttributeValues
    )

    return result as Podcast
  }

  async removePodcast(userId: string, podcastId: string): Promise<void> {
    await this.delete({ userId, podcastId })
  }

  async checkPodcastExists(rssUrl: string): Promise<boolean> {
    const items = await this.query('rssUrl', rssUrl, undefined, undefined, 'RssUrlIndex')
    return items.length > 0
  }

  async syncPodcast(userId: string, podcastId: string): Promise<Podcast> {
    const now = new Date().toISOString()
    const result = await this.update(
      { userId, podcastId },
      'SET lastSynced = :lastSynced, updatedAt = :updatedAt',
      { ':lastSynced': now, ':updatedAt': now }
    )

    return result as Podcast
  }

  private generatePodcastId(): string {
    return `podcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}