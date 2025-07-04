import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  DeleteItemCommand,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { Podcast, Episode, EpisodeData, ListeningHistoryItem } from '../types'
import { v4 as uuidv4 } from 'uuid'

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION })
const PODCASTS_TABLE = process.env.PODCASTS_TABLE || 'RewindPodcasts'
const EPISODES_TABLE = process.env.EPISODES_TABLE || 'RewindEpisodes'
const LISTENING_HISTORY_TABLE = process.env.LISTENING_HISTORY_TABLE || 'RewindListeningHistory'

export class DynamoService {
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
      await dynamoClient.send(new PutItemCommand(params))
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
      const result = await dynamoClient.send(new QueryCommand(params))

      if (!result.Items || result.Items.length === 0) {
        return []
      }

      return result.Items.map(item => unmarshall(item) as Podcast)
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
      await dynamoClient.send(new DeleteItemCommand(params))
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
      const result = await dynamoClient.send(new QueryCommand(params))
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

    // Process episodes in batches
    for (let i = 0; i < episodes.length; i += batchSize) {
      const batch = episodes.slice(i, i + batchSize)
      const episodesToSave: Episode[] = batch.map(episodeData => ({
        episodeId: uuidv4(),
        podcastId,
        ...episodeData,
        createdAt: new Date().toISOString(),
      }))

      // Prepare batch write request
      const writeRequests = episodesToSave.map(episode => ({
        PutRequest: {
          Item: marshall(episode),
        },
      }))

      const params = {
        RequestItems: {
          [EPISODES_TABLE]: writeRequests,
        },
      }

      try {
        await dynamoClient.send(new BatchWriteItemCommand(params))
        savedEpisodes.push(...episodesToSave)
      } catch (error) {
        console.error('Error saving episodes batch:', error)
        throw new Error('Failed to save episodes')
      }
    }

    return savedEpisodes
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
      IndexName: 'ReleaseDateIndex',
    }

    if (limit) {
      params.Limit = limit
    }

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = marshall(JSON.parse(lastEvaluatedKey))
    }

    try {
      const result = await dynamoClient.send(new QueryCommand(params))

      if (!result.Items || result.Items.length === 0) {
        return { episodes: [] }
      }

      const episodes = result.Items.map(item => unmarshall(item) as Episode)

      const response: { episodes: Episode[]; lastEvaluatedKey?: string } = { episodes }

      if (result.LastEvaluatedKey) {
        response.lastEvaluatedKey = JSON.stringify(unmarshall(result.LastEvaluatedKey))
      }

      return response
    } catch (error) {
      console.error('Error getting episodes:', error)
      throw new Error('Failed to get episodes')
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
      const result = await dynamoClient.send(new QueryCommand(params))

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

        await dynamoClient.send(new BatchWriteItemCommand(params))
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
      await dynamoClient.send(new PutItemCommand(params))
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
      const result = await dynamoClient.send(new QueryCommand(params))

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
      const result = await dynamoClient.send(new QueryCommand(params))

      if (!result.Items || result.Items.length === 0) {
        return []
      }

      return result.Items.map(item => unmarshall(item) as ListeningHistoryItem)
    } catch (error) {
      console.error('Error getting listening history:', error)
      throw new Error('Failed to get listening history')
    }
  }
}

export const dynamoService = new DynamoService()
export default dynamoService
