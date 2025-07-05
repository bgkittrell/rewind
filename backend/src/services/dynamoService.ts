import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  DeleteItemCommand,
  BatchWriteItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { Podcast, Episode, EpisodeData, ListeningHistoryItem } from '../types'
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
      
      // Process each episode in the batch for deduplication
      for (const episodeData of batch) {
        try {
          const naturalKey = this.generateNaturalKey(episodeData)
          const existingEpisode = await this.findExistingEpisode(podcastId, naturalKey)
          
          if (existingEpisode) {
            // Update existing episode
            const updatedEpisode = await this.updateEpisode(existingEpisode.episodeId, episodeData, naturalKey)
            savedEpisodes.push(updatedEpisode)
          } else {
            // Create new episode
            const newEpisode = await this.createEpisode(podcastId, episodeData, naturalKey)
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

  // Generate consistent natural key for episodes
  private generateNaturalKey(episode: EpisodeData): string {
    // Normalize title and use release date for key generation
    const normalizedTitle = episode.title.toLowerCase().trim()
    const releaseDate = new Date(episode.releaseDate).toISOString().split('T')[0]
    
    // Use title + releaseDate as the natural key components
    const keyData = `${normalizedTitle}:${releaseDate}`
    
    // Generate MD5 hash for consistent key length
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
      
      if (!result.Items || result.Items.length === 0) {
        return null
      }

      return unmarshall(result.Items[0]) as Episode
    } catch (error) {
      console.error('Error finding existing episode:', error)
      return null
    }
  }

  // Update existing episode
  private async updateEpisode(episodeId: string, episodeData: EpisodeData, naturalKey: string): Promise<Episode> {
    const now = new Date().toISOString()
    
    // Get the podcast ID from the existing episode
    const existingEpisode = await this.getExistingEpisodeById(episodeId)
    if (!existingEpisode) {
      throw new Error('Episode not found for update')
    }
    
    const params = {
      TableName: EPISODES_TABLE,
      Key: marshall({
        podcastId: existingEpisode.podcastId,
        episodeId: episodeId,
      }),
      UpdateExpression: 'SET title = :title, description = :description, audioUrl = :audioUrl, duration = :duration, releaseDate = :releaseDate, naturalKey = :naturalKey, updatedAt = :updatedAt',
      ExpressionAttributeValues: marshall({
        ':title': episodeData.title,
        ':description': episodeData.description,
        ':audioUrl': episodeData.audioUrl,
        ':duration': episodeData.duration,
        ':releaseDate': episodeData.releaseDate,
        ':naturalKey': naturalKey,
        ':updatedAt': now,
      }),
      ReturnValues: 'ALL_NEW',
    }

    // Add optional fields if they exist
    if (episodeData.imageUrl) {
      params.UpdateExpression += ', imageUrl = :imageUrl'
      params.ExpressionAttributeValues = marshall({
        ...unmarshall(params.ExpressionAttributeValues),
        ':imageUrl': episodeData.imageUrl,
      })
    }

    if (episodeData.guests && episodeData.guests.length > 0) {
      params.UpdateExpression += ', guests = :guests'
      params.ExpressionAttributeValues = marshall({
        ...unmarshall(params.ExpressionAttributeValues),
        ':guests': episodeData.guests,
      })
    }

    if (episodeData.tags && episodeData.tags.length > 0) {
      params.UpdateExpression += ', tags = :tags'
      params.ExpressionAttributeValues = marshall({
        ...unmarshall(params.ExpressionAttributeValues),
        ':tags': episodeData.tags,
      })
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

  // Helper method to get existing episode by ID
  private async getExistingEpisodeById(episodeId: string): Promise<Episode | null> {
    // We need to scan the table to find the episode by episodeId since we don't have podcastId
    const params = {
      TableName: EPISODES_TABLE,
      FilterExpression: 'episodeId = :episodeId',
      ExpressionAttributeValues: marshall({
        ':episodeId': episodeId,
      }),
      Limit: 1,
    }

    try {
      const result = await this.dynamoClient.send(new QueryCommand(params))
      
      if (!result.Items || result.Items.length === 0) {
        return null
      }

      return unmarshall(result.Items[0]) as Episode
    } catch (error) {
      console.error('Error getting existing episode by ID:', error)
      return null
    }
  }

  // Create new episode
  private async createEpisode(podcastId: string, episodeData: EpisodeData, naturalKey: string): Promise<Episode> {
    const now = new Date().toISOString()
    
    const episode: Episode = {
      episodeId: uuidv4(),
      podcastId,
      ...episodeData,
      naturalKey,
      createdAt: now,
    }

    const params = {
      TableName: EPISODES_TABLE,
      Item: marshall(episode),
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
      const result = await this.dynamoClient.send(new QueryCommand(params))

      if (!result.Items || result.Items.length === 0) {
        return null
      }

      return unmarshall(result.Items[0]) as Episode
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
      const result = await this.dynamoClient.send(new QueryCommand(params))

      if (!result.Items || result.Items.length === 0) {
        return null
      }

      return unmarshall(result.Items[0]) as ListeningHistoryItem
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
