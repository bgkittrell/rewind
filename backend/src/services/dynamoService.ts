import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  DeleteItemCommand,
  BatchWriteItemCommand,
  UpdateItemCommand,
  ScanCommand,
  GetItemCommand,
  ReturnValue,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { Podcast, Episode, EpisodeData, ListeningHistoryItem, LastPlayedEpisode } from '../types'
import { v4 as uuidv4 } from 'uuid'

const crypto = require('crypto')

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })
const PODCASTS_TABLE = process.env.PODCASTS_TABLE || 'RewindPodcasts'
const EPISODES_TABLE = process.env.EPISODES_TABLE || 'RewindEpisodes'
const LISTENING_HISTORY_TABLE = process.env.LISTENING_HISTORY_TABLE || 'RewindListeningHistory'

export class DynamoService {
  private dynamoClient: DynamoDBClient

  constructor(client?: DynamoDBClient) {
    this.dynamoClient = client || new DynamoDBClient({ region: process.env.AWS_REGION })
  }
  async savePodcast(userId: string, podcastData: Omit<Podcast, 'podcastId' | 'userId'>): Promise<Podcast> {
    const podcast: Podcast = {
      podcastId: uuidv4(),
      userId,
      ...podcastData,
    }

    const params = {
      TableName: PODCASTS_TABLE,
      Item: marshall(podcast),
    }

    try {
      await this.dynamoClient.send(new PutItemCommand(params))
      return podcast
    } catch (error) {
      console.error('Error saving podcast:', error)
      throw new Error('Failed to save podcast')
    }
  }

  async getPodcastsByUser(userId: string): Promise<Podcast[]> {
    const params = {
      TableName: PODCASTS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: marshall({
        ':userId': userId,
      }),
    }

    try {
      const result = await this.dynamoClient.send(new QueryCommand(params))

      if (!result.Items || result.Items.length === 0) {
        return []
      }

      return result.Items.map((item: any) => unmarshall(item) as Podcast)
    } catch (error) {
      console.error('Error getting podcasts:', error)
      throw new Error('Failed to get podcasts')
    }
  }

  async deletePodcast(userId: string, podcastId: string): Promise<void> {
    const params = {
      TableName: PODCASTS_TABLE,
      Key: marshall({
        userId,
        podcastId,
      }),
      ConditionExpression: 'attribute_exists(podcastId)',
    }

    try {
      await this.dynamoClient.send(new DeleteItemCommand(params))
    } catch (error: any) {
      console.error('Error deleting podcast:', error)
      if (error.name === 'ConditionalCheckFailedException') {
        throw new Error('Podcast not found')
      }
      throw new Error('Failed to delete podcast')
    }
  }

  async podcastExists(userId: string, rssUrl: string): Promise<boolean> {
    const params = {
      TableName: PODCASTS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: 'rssUrl = :rssUrl',
      ExpressionAttributeValues: marshall({
        ':userId': userId,
        ':rssUrl': rssUrl,
      }),
    }

    try {
      const result = await this.dynamoClient.send(new QueryCommand(params))
      return !!(result.Items && result.Items.length > 0)
    } catch (error) {
      console.error('Error checking podcast existence:', error)
      return false
    }
  }

  // Episode CRUD Operations
  async saveEpisodes(podcastId: string, episodes: EpisodeData[]): Promise<Episode[]> {
    if (episodes.length === 0) {
      return []
    }

    const savedEpisodes: Episode[] = []
    const batchSize = 25 // DynamoDB batch write limit

    // Process episodes in batches to avoid DynamoDB limits
    for (let i = 0; i < episodes.length; i += batchSize) {
      const batch = episodes.slice(i, i + batchSize)

      for (const episodeData of batch) {
        try {
          // Skip completely null/undefined or invalid episodes
          if (!episodeData || typeof episodeData !== 'object') {
            console.warn('Skipping invalid episode data:', episodeData)
            continue
          }

          // Ensure required fields have defaults
          const sanitizedEpisodeData: EpisodeData = {
            title: episodeData.title || 'Untitled Episode',
            description: episodeData.description || '',
            audioUrl: episodeData.audioUrl || '',
            duration: episodeData.duration || '0:00',
            releaseDate: episodeData.releaseDate || new Date().toISOString(),
            imageUrl: episodeData.imageUrl,
            guests: episodeData.guests,
            tags: episodeData.tags,
          }

          // Generate natural key for deduplication
          const naturalKey = this.generateNaturalKey(sanitizedEpisodeData)

          // Check if episode already exists using the natural key index
          const existingEpisode = await this.findExistingEpisode(podcastId, naturalKey)

          if (existingEpisode) {
            // Update existing episode with latest data
            const updatedEpisode = await this.updateEpisodeDirectly(
              existingEpisode.podcastId,
              existingEpisode.episodeId,
              sanitizedEpisodeData,
              naturalKey,
            )
            savedEpisodes.push(updatedEpisode)
          } else {
            // Create new episode
            const newEpisode = await this.createEpisode(podcastId, sanitizedEpisodeData, naturalKey)
            savedEpisodes.push(newEpisode)
          }
        } catch (error) {
          console.error('Error processing episode:', error)
          // Continue processing other episodes even if one fails
        }
      }
    }

    return savedEpisodes
  }

  // Generate consistent natural key for episodes with enhanced date validation
  private generateNaturalKey(episode: EpisodeData): string {
    // Normalize title and handle empty/undefined titles
    const normalizedTitle = (episode?.title || 'untitled').toLowerCase().trim()

    // Enhanced date validation with multiple fallback strategies
    let releaseDate: string
    try {
      // Handle various date formats and edge cases
      if (!episode?.releaseDate || episode.releaseDate.trim() === '') {
        releaseDate = '1900-01-01'
      } else {
        const dateStr = episode.releaseDate.trim()
        const dateObj = new Date(dateStr)

        // Check for valid date
        if (isNaN(dateObj.getTime())) {
          // Try parsing as timestamp if it's a number
          const timestamp = parseInt(dateStr, 10)
          if (!isNaN(timestamp) && timestamp > 0) {
            const timestampDate = new Date(timestamp * 1000) // Assume seconds, convert to ms
            if (!isNaN(timestampDate.getTime())) {
              releaseDate = timestampDate.toISOString().split('T')[0]
            } else {
              releaseDate = '1900-01-01'
            }
          } else {
            // Try basic date parsing patterns
            const cleanDateStr = dateStr.replace(/[^\d-/]/g, '')
            const fallbackDate = new Date(cleanDateStr)
            if (!isNaN(fallbackDate.getTime())) {
              releaseDate = fallbackDate.toISOString().split('T')[0]
            } else {
              releaseDate = '1900-01-01'
            }
          }
        } else {
          // Valid date object
          releaseDate = dateObj.toISOString().split('T')[0]
        }
      }
    } catch (error) {
      console.warn('Error parsing release date:', episode?.releaseDate, error)
      releaseDate = '1900-01-01'
    }

    // Use title + releaseDate as the natural key components
    const keyData = `${normalizedTitle}:${releaseDate}`

    // Generate MD5 hash of the key data
    return crypto.createHash('md5').update(keyData).digest('hex')
  }

  // Find existing episode by natural key
  private async findExistingEpisode(podcastId: string, naturalKey: string): Promise<Episode | null> {
    const params = {
      TableName: EPISODES_TABLE,
      IndexName: 'NaturalKeyIndex',
      KeyConditionExpression: 'podcastId = :podcastId AND naturalKey = :naturalKey',
      ExpressionAttributeValues: marshall({
        ':podcastId': podcastId,
        ':naturalKey': naturalKey,
      }),
      Limit: 1,
    }

    try {
      const result = await this.dynamoClient.send(new QueryCommand(params))

      if (!result?.Items || result.Items.length === 0) {
        return null
      }

      return unmarshall(result.Items[0]) as Episode
    } catch (error) {
      console.error('Error finding existing episode:', error)
      return null
    }
  }

  // Update existing episode directly (no table scan needed)
  private async updateEpisodeDirectly(
    podcastId: string,
    episodeId: string,
    episodeData: EpisodeData,
    naturalKey: string,
  ): Promise<Episode> {
    const now = new Date().toISOString()

    // Build update expression dynamically based on available data
    const updateExpressions: string[] = []
    const expressionAttributeValues: any = {
      ':title': episodeData.title,
      ':description': episodeData.description,
      ':audioUrl': episodeData.audioUrl,
      ':duration': episodeData.duration,
      ':releaseDate': episodeData.releaseDate,
      ':naturalKey': naturalKey,
      ':updatedAt': now,
    }

    updateExpressions.push(
      'title = :title',
      'description = :description',
      'audioUrl = :audioUrl',
      'duration = :duration',
      'releaseDate = :releaseDate',
      'naturalKey = :naturalKey',
      'updatedAt = :updatedAt',
    )

    // Add optional fields only if they exist and are not undefined
    if (episodeData.imageUrl !== undefined && episodeData.imageUrl !== null) {
      updateExpressions.push('imageUrl = :imageUrl')
      expressionAttributeValues[':imageUrl'] = episodeData.imageUrl
    }

    if (episodeData.guests && episodeData.guests.length > 0) {
      updateExpressions.push('guests = :guests')
      expressionAttributeValues[':guests'] = episodeData.guests
    }

    if (episodeData.tags && episodeData.tags.length > 0) {
      updateExpressions.push('tags = :tags')
      expressionAttributeValues[':tags'] = episodeData.tags
    }

    const params = {
      TableName: EPISODES_TABLE,
      Key: marshall({
        podcastId: podcastId,
        episodeId: episodeId,
      }),
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: marshall(expressionAttributeValues, {
        removeUndefinedValues: true,
      }),
      ReturnValues: ReturnValue.ALL_NEW,
    }

    try {
      const result = await this.dynamoClient.send(new UpdateItemCommand(params))

      if (!result.Attributes) {
        throw new Error('No attributes returned from update')
      }

      return unmarshall(result.Attributes) as Episode
    } catch (error) {
      console.error('Error updating episode:', error)
      throw new Error('Failed to update episode')
    }
  }

  // Create new episode
  private async createEpisode(podcastId: string, episodeData: EpisodeData, naturalKey: string): Promise<Episode> {
    const now = new Date().toISOString()

    // Create clean episode object without undefined values
    const episode: Episode = {
      episodeId: uuidv4(),
      podcastId,
      title: episodeData.title,
      description: episodeData.description,
      audioUrl: episodeData.audioUrl,
      duration: episodeData.duration,
      releaseDate: episodeData.releaseDate,
      naturalKey,
      createdAt: now,
    }

    // Add optional fields only if they exist
    if (episodeData.imageUrl !== undefined && episodeData.imageUrl !== null) {
      episode.imageUrl = episodeData.imageUrl
    }

    if (episodeData.guests && episodeData.guests.length > 0) {
      episode.guests = episodeData.guests
    }

    if (episodeData.tags && episodeData.tags.length > 0) {
      episode.tags = episodeData.tags
    }

    const params = {
      TableName: EPISODES_TABLE,
      Item: marshall(episode, {
        removeUndefinedValues: true,
      }),
    }

    try {
      await this.dynamoClient.send(new PutItemCommand(params))
      return episode
    } catch (error) {
      console.error('Error creating episode:', error)
      throw new Error('Failed to create episode')
    }
  }

  async getEpisodesByPodcast(
    podcastId: string,
    limit?: number,
    lastEvaluatedKey?: string,
  ): Promise<{ episodes: Episode[]; lastEvaluatedKey?: string }> {
    const params: any = {
      TableName: EPISODES_TABLE,
      KeyConditionExpression: 'podcastId = :podcastId',
      ExpressionAttributeValues: marshall({
        ':podcastId': podcastId,
      }),
      ScanIndexForward: false, // Sort by release date descending
    }

    // Only use the ReleaseDateIndex if it exists, otherwise use the main table
    try {
      // First try with the index
      params.IndexName = 'ReleaseDateIndex'

      if (limit) {
        params.Limit = limit
      }

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = marshall(JSON.parse(lastEvaluatedKey))
      }

      const result = await this.dynamoClient.send(new QueryCommand(params))

      if (!result.Items || result.Items.length === 0) {
        return { episodes: [] }
      }

      const episodes = result.Items.map((item: any) => unmarshall(item) as Episode)

      const response: { episodes: Episode[]; lastEvaluatedKey?: string } = { episodes }

      if (result.LastEvaluatedKey) {
        response.lastEvaluatedKey = JSON.stringify(unmarshall(result.LastEvaluatedKey))
      }

      return response
    } catch (error) {
      console.warn('ReleaseDateIndex not available, falling back to main table:', error)

      // Fallback to main table without index
      delete params.IndexName
      delete params.ScanIndexForward

      try {
        const result = await this.dynamoClient.send(new QueryCommand(params))

        if (!result.Items || result.Items.length === 0) {
          return { episodes: [] }
        }

        const episodes = result.Items.map((item: any) => unmarshall(item) as Episode)

        // Sort by release date manually since we can't use the index
        episodes.sort((a: Episode, b: Episode) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())

        const response: { episodes: Episode[]; lastEvaluatedKey?: string } = { episodes }

        if (result.LastEvaluatedKey) {
          response.lastEvaluatedKey = JSON.stringify(unmarshall(result.LastEvaluatedKey))
        }

        return response
      } catch (fallbackError) {
        console.error('Error getting episodes from main table:', fallbackError)
        throw new Error('Failed to get episodes')
      }
    }
  }

  async getEpisodeById(podcastId: string, episodeId: string): Promise<Episode | null> {
    const params = {
      TableName: EPISODES_TABLE,
      Key: marshall({
        podcastId,
        episodeId,
      }),
    }

    try {
      const result = await this.dynamoClient.send(new GetItemCommand(params))

      if (!result.Item) {
        return null
      }

      return unmarshall(result.Item) as Episode
    } catch (error) {
      console.error('Error getting episode by ID:', error)
      throw new Error('Failed to get episode')
    }
  }

  async deleteEpisodesByPodcast(podcastId: string): Promise<void> {
    try {
      // First, get all episodes for the podcast
      const episodes = await this.getEpisodesByPodcast(podcastId)

      if (episodes.episodes.length === 0) {
        return
      }

      // Delete in batches
      const batchSize = 25
      for (let i = 0; i < episodes.episodes.length; i += batchSize) {
        const batch = episodes.episodes.slice(i, i + batchSize)
        const deleteRequests = batch.map(episode => ({
          DeleteRequest: {
            Key: marshall({
              podcastId: episode.podcastId,
              episodeId: episode.episodeId,
            }),
          },
        }))

        const params = {
          RequestItems: {
            [EPISODES_TABLE]: deleteRequests,
          },
        }

        await this.dynamoClient.send(new BatchWriteItemCommand(params))
      }
    } catch (error) {
      console.error('Error deleting episodes:', error)
      throw new Error('Failed to delete episodes')
    }
  }

  // Progress Tracking Operations
  async savePlaybackProgress(
    userId: string,
    episodeId: string,
    podcastId: string,
    position: number,
    duration: number,
  ): Promise<void> {
    const now = new Date().toISOString()
    const isCompleted = position >= duration * 0.95 // Consider 95% as completed

    const historyItem: ListeningHistoryItem = {
      userId,
      episodeId,
      podcastId,
      playbackPosition: position,
      duration,
      isCompleted,
      lastPlayed: now,
      firstPlayed: now, // Will be overwritten if record exists
      playCount: 1, // Will be incremented if record exists
      createdAt: now,
      updatedAt: now,
    }

    // Check if record already exists
    try {
      const existing = await this.getListeningHistoryItem(userId, episodeId)
      if (existing) {
        historyItem.firstPlayed = existing.firstPlayed
        historyItem.playCount = existing.playCount + (position < existing.playbackPosition ? 1 : 0)
        historyItem.createdAt = existing.createdAt
      }
    } catch {
      // If error getting existing, proceed with new record
    }

    const params = {
      TableName: LISTENING_HISTORY_TABLE,
      Item: marshall(historyItem),
    }

    try {
      await this.dynamoClient.send(new PutItemCommand(params))
    } catch (error) {
      console.error('Error saving playback progress:', error)
      throw new Error('Failed to save playback progress')
    }
  }

  private async getListeningHistoryItem(userId: string, episodeId: string): Promise<ListeningHistoryItem | null> {
    const params = {
      TableName: LISTENING_HISTORY_TABLE,
      Key: marshall({
        userId,
        episodeId,
      }),
    }

    try {
      const result = await this.dynamoClient.send(new GetItemCommand(params))

      if (!result.Item) {
        return null
      }

      return unmarshall(result.Item) as ListeningHistoryItem
    } catch (error) {
      console.error('Error getting listening history item:', error)
      return null
    }
  }

  async getPlaybackProgress(userId: string, episodeId: string): Promise<{ position: number; duration: number } | null> {
    try {
      const history = await this.getListeningHistoryItem(userId, episodeId)
      if (!history) {
        return null
      }

      return {
        position: history.playbackPosition,
        duration: history.duration,
      }
    } catch (error) {
      console.error('Error getting playback progress:', error)
      return null
    }
  }

  async getListeningHistory(userId: string, limit = 20): Promise<ListeningHistoryItem[]> {
    const params = {
      TableName: LISTENING_HISTORY_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: marshall({
        ':userId': userId,
      }),
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    }

    try {
      const result = await this.dynamoClient.send(new QueryCommand(params))

      if (!result.Items || result.Items.length === 0) {
        return []
      }

      return result.Items.map((item: any) => unmarshall(item) as ListeningHistoryItem)
    } catch (error) {
      console.error('Error getting listening history:', error)
      throw new Error('Failed to get listening history')
    }
  }

  async getLastPlayedEpisode(userId: string): Promise<LastPlayedEpisode | null> {
    const params = {
      TableName: LISTENING_HISTORY_TABLE,
      IndexName: 'LastPlayedIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: marshall({
        ':userId': userId,
      }),
      ScanIndexForward: false, // Most recent first
      Limit: 1,
    }

    try {
      const result = await this.dynamoClient.send(new QueryCommand(params))

      if (!result.Items || result.Items.length === 0) {
        return null
      }

      const history = unmarshall(result.Items[0]) as ListeningHistoryItem

      // Get episode details
      const episode = await this.getEpisodeById(history.podcastId, history.episodeId)
      if (!episode) {
        return null
      }

      // Get podcast details
      const userPodcasts = await this.getPodcastsByUser(userId)
      const podcast = userPodcasts.find(p => p.podcastId === history.podcastId)
      if (!podcast) {
        return null
      }

      // Only return episodes that have meaningful progress (at least 30 seconds)
      if (history.playbackPosition < 30) {
        return null
      }

      // Don't return completed episodes
      if (history.isCompleted) {
        return null
      }

      return {
        episodeId: history.episodeId,
        podcastId: history.podcastId,
        title: episode.title,
        podcastTitle: podcast.title,
        playbackPosition: history.playbackPosition,
        duration: history.duration,
        lastPlayed: history.lastPlayed,
        progressPercentage: Math.round((history.playbackPosition / history.duration) * 100),
        audioUrl: episode.audioUrl,
        imageUrl: episode.imageUrl,
        podcastImageUrl: podcast.imageUrl,
      }
    } catch (error) {
      console.error('Error getting last played episode:', error)
      return null
    }
  }

  // Fix existing episodes with complex imageUrl objects
  async fixEpisodeImageUrls(podcastId: string): Promise<void> {
    try {
      // Get all episodes for the podcast
      const episodes = await this.getEpisodesByPodcast(podcastId)

      if (episodes.episodes.length === 0) {
        return
      }

      // Process episodes in batches to fix imageUrl
      const batchSize = 25
      for (let i = 0; i < episodes.episodes.length; i += batchSize) {
        const batch = episodes.episodes.slice(i, i + batchSize)
        const fixedEpisodes = batch.map(episode => {
          let fixedImageUrl = episode.imageUrl

          // If imageUrl is a complex object, extract the actual URL
          if (typeof episode.imageUrl === 'object' && episode.imageUrl !== null) {
            const imageObj = episode.imageUrl as any
            if (imageObj.$?.M?.href?.S) {
              fixedImageUrl = imageObj.$.M.href.S
            } else if (imageObj.href) {
              fixedImageUrl = imageObj.href
            } else if (imageObj.url) {
              fixedImageUrl = imageObj.url
            }
          }

          return {
            ...episode,
            imageUrl: fixedImageUrl,
          }
        })

        // Update episodes with fixed imageUrl
        const writeRequests = fixedEpisodes.map(episode => ({
          PutRequest: {
            Item: marshall(episode),
          },
        }))

        const params = {
          RequestItems: {
            [EPISODES_TABLE]: writeRequests,
          },
        }

        await this.dynamoClient.send(new BatchWriteItemCommand(params))
      }
    } catch (error) {
      console.error('Error fixing episode image URLs:', error)
      throw new Error('Failed to fix episode image URLs')
    }
  }
}

export const dynamoService = new DynamoService()
export default dynamoService
