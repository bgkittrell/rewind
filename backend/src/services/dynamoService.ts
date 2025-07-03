import { DynamoDBClient, PutItemCommand, QueryCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { Podcast } from '../types'
import { v4 as uuidv4 } from 'uuid'

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION })
const PODCASTS_TABLE = process.env.PODCASTS_TABLE || 'rewind-podcasts'

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
}

export const dynamoService = new DynamoService()
export default dynamoService
