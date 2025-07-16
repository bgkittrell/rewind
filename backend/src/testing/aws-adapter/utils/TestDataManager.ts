/**
 * Test Data Management Utilities
 *
 * Seeding and cleanup utilities for integration testing
 */

import { TestDataManager, MockEventGenerator, DynamoDBRecord, TestDataError } from '../types'
import { DynamoDBAdapter } from '../adapters/DynamoDBAdapter'
import { SQSAdapter } from '../adapters/SQSAdapter'
import { TableNameResolver, QueueUrlResolver } from '../config/AdapterConfig'

export class TestDataManagerImpl implements TestDataManager {
  private dynamoAdapter: DynamoDBAdapter
  private sqsAdapter: SQSAdapter
  private tableResolver: TableNameResolver
  private queueResolver: QueueUrlResolver
  private seededData: Map<string, DynamoDBRecord[]> = new Map()

  constructor(dynamoAdapter: DynamoDBAdapter, sqsAdapter: SQSAdapter) {
    this.dynamoAdapter = dynamoAdapter
    this.sqsAdapter = sqsAdapter
    this.tableResolver = TableNameResolver.getInstance()
    this.queueResolver = QueueUrlResolver.getInstance()
  }

  async seedTestData(tableName: string, data: DynamoDBRecord[]): Promise<void> {
    try {
      // Store seeded data for cleanup
      this.seededData.set(tableName, [...data])

      // Batch write data to table
      if (data.length > 0) {
        await this.dynamoAdapter.batchWrite(tableName, data)
      }
    } catch (error) {
      throw new TestDataError(`Failed to seed test data: ${error.message}`, tableName, 'seed')
    }
  }

  async cleanupTestData(tableName: string): Promise<void> {
    try {
      const seededData = this.seededData.get(tableName)
      if (seededData) {
        // Delete each seeded item
        for (const item of seededData) {
          const key = this.extractPrimaryKey(item)
          await this.dynamoAdapter.deleteItem(tableName, key)
        }
        this.seededData.delete(tableName)
      }
    } catch (error) {
      throw new TestDataError(`Failed to cleanup test data: ${error.message}`, tableName, 'cleanup')
    }
  }

  async createTestEpisode(overrides?: Partial<DynamoDBRecord>): Promise<DynamoDBRecord> {
    const defaultEpisode: DynamoDBRecord = {
      id: `test-episode-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      naturalKey: `test-episode-${Date.now()}`,
      podcastId: 'test-podcast-123',
      title: 'Test Episode for Integration Testing',
      description: 'This is a test episode created for integration testing purposes.',
      audioUrl: 'https://example.com/test-audio.mp3',
      duration: 3600,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'published',
      transcript: 'This is a test transcript for the episode.',
      guests: [],
      guestExtractionStatus: 'pending',
      playCount: 0,
      likeCount: 0,
      shareCount: 0,
      tags: ['test', 'integration'],
      season: 1,
      episodeNumber: 1,
      explicit: false,
      imageUrl: 'https://example.com/test-image.jpg',
    }

    const episode = { ...defaultEpisode, ...overrides }

    // Save to episodes table
    const episodesTable = this.tableResolver.getEpisodesTable()
    await this.dynamoAdapter.putItem(episodesTable, episode)

    // Track for cleanup
    const existingData = this.seededData.get(episodesTable) || []
    this.seededData.set(episodesTable, [...existingData, episode])

    return episode
  }

  async createTestPodcast(overrides?: Partial<DynamoDBRecord>): Promise<DynamoDBRecord> {
    const defaultPodcast: DynamoDBRecord = {
      id: `test-podcast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Test Podcast for Integration Testing',
      description: 'This is a test podcast created for integration testing purposes.',
      author: 'Test Author',
      website: 'https://example.com/test-podcast',
      rssUrl: 'https://example.com/test-podcast/feed.xml',
      imageUrl: 'https://example.com/test-podcast-image.jpg',
      language: 'en',
      category: 'Technology',
      explicit: false,
      episodeCount: 10,
      subscriberCount: 1000,
      averageRating: 4.5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastEpisodeDate: new Date().toISOString(),
      status: 'active',
      tags: ['test', 'integration'],
      metadata: {
        totalDuration: 36000,
        averageEpisodeDuration: 3600,
        publishingFrequency: 'weekly',
      },
    }

    const podcast = { ...defaultPodcast, ...overrides }

    // Save to podcasts table
    const podcastsTable = this.tableResolver.getPodcastsTable()
    await this.dynamoAdapter.putItem(podcastsTable, podcast)

    // Track for cleanup
    const existingData = this.seededData.get(podcastsTable) || []
    this.seededData.set(podcastsTable, [...existingData, podcast])

    return podcast
  }

  async createTestUser(overrides?: Partial<DynamoDBRecord>): Promise<DynamoDBRecord> {
    const defaultUser: DynamoDBRecord = {
      id: `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: `test-user-${Date.now()}@example.com`,
      username: `testuser${Date.now()}`,
      name: 'Test User',
      profileImage: 'https://example.com/test-profile.jpg',
      preferences: {
        theme: 'light',
        notifications: true,
        autoplay: false,
        playbackSpeed: 1.0,
      },
      subscription: {
        type: 'free',
        startDate: new Date().toISOString(),
        endDate: null,
      },
      stats: {
        totalListeningTime: 0,
        episodesCompleted: 0,
        favoriteCount: 0,
        shareCount: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      status: 'active',
    }

    const user = { ...defaultUser, ...overrides }

    // For testing, we'll store user data in a generic table
    // In production, this would be in Cognito or a users table
    const testUsersTable = this.tableResolver.resolve('TestUsers')

    try {
      await this.dynamoAdapter.createTable({
        tableName: testUsersTable,
        primaryKey: 'id',
        indexes: ['email', 'username'],
      })
    } catch (error) {
      // Table might already exist
    }

    await this.dynamoAdapter.putItem(testUsersTable, user)

    // Track for cleanup
    const existingData = this.seededData.get(testUsersTable) || []
    this.seededData.set(testUsersTable, [...existingData, user])

    return user
  }

  // Additional utility methods
  async createTestListeningHistory(
    userId: string,
    episodeId: string,
    overrides?: Partial<DynamoDBRecord>,
  ): Promise<DynamoDBRecord> {
    const defaultHistory: DynamoDBRecord = {
      id: `test-history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      episodeId,
      position: 0,
      duration: 3600,
      completed: false,
      startedAt: new Date().toISOString(),
      lastPositionUpdate: new Date().toISOString(),
      completedAt: null,
      playbackSpeed: 1.0,
      deviceType: 'web',
      sessionId: `session-${Date.now()}`,
    }

    const history = { ...defaultHistory, ...overrides }

    const historyTable = this.tableResolver.getListeningHistoryTable()
    await this.dynamoAdapter.putItem(historyTable, history)

    // Track for cleanup
    const existingData = this.seededData.get(historyTable) || []
    this.seededData.set(historyTable, [...existingData, history])

    return history
  }

  async createTestFavorite(
    userId: string,
    episodeId: string,
    overrides?: Partial<DynamoDBRecord>,
  ): Promise<DynamoDBRecord> {
    const defaultFavorite: DynamoDBRecord = {
      id: `test-favorite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      episodeId,
      createdAt: new Date().toISOString(),
      notes: 'Test favorite note',
      tags: ['test'],
      isPublic: false,
    }

    const favorite = { ...defaultFavorite, ...overrides }

    const favoritesTable = this.tableResolver.getUserFavoritesTable()
    await this.dynamoAdapter.putItem(favoritesTable, favorite)

    // Track for cleanup
    const existingData = this.seededData.get(favoritesTable) || []
    this.seededData.set(favoritesTable, [...existingData, favorite])

    return favorite
  }

  async cleanupAllTestData(): Promise<void> {
    const tablesToClean = Array.from(this.seededData.keys())

    for (const tableName of tablesToClean) {
      await this.cleanupTestData(tableName)
    }
  }

  getSeededTables(): string[] {
    return Array.from(this.seededData.keys())
  }

  private extractPrimaryKey(item: DynamoDBRecord): DynamoDBRecord {
    // Extract the primary key from the item
    // This is a simplified version - in production, we'd need to know the table schema
    if (item.id) {
      return { id: item.id }
    }
    if (item.naturalKey) {
      return { naturalKey: item.naturalKey }
    }
    // Fallback to assuming 'id' is the primary key
    return { id: item.id || 'unknown' }
  }
}

export class MockEventGeneratorImpl implements MockEventGenerator {
  private queueResolver: QueueUrlResolver

  constructor() {
    this.queueResolver = QueueUrlResolver.getInstance()
  }

  generateSQSEvent(messageBody: string, attributes?: { [key: string]: string }): any {
    const messageId = `test-message-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    return {
      Records: [
        {
          messageId,
          receiptHandle: `test-receipt-${messageId}`,
          body: messageBody,
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: Date.now().toString(),
            SenderId: 'AIDAIENQZJOLO23YVJ4VO',
            ApproximateFirstReceiveTimestamp: Date.now().toString(),
            ...(attributes || {}),
          },
          messageAttributes: {},
          md5OfBody: Buffer.from(messageBody).toString('base64').substr(0, 32),
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
          awsRegion: 'us-east-1',
        },
      ],
    }
  }

  generateDynamoDBEvent(eventName: string, tableName: string, item: DynamoDBRecord): any {
    const timestamp = Date.now()

    return {
      Records: [
        {
          eventID: `test-event-${timestamp}`,
          eventName,
          eventVersion: '1.1',
          eventSource: 'aws:dynamodb',
          awsRegion: 'us-east-1',
          dynamodb: {
            ApproximateCreationDateTime: timestamp / 1000,
            Keys: {
              id: { S: item.id || 'test-id' },
            },
            NewImage: this.convertToAttributeValue(item),
            SequenceNumber: timestamp.toString(),
            SizeBytes: JSON.stringify(item).length,
            StreamViewType: 'NEW_AND_OLD_IMAGES',
          },
          eventSourceARN: `arn:aws:dynamodb:us-east-1:123456789012:table/${tableName}/stream/2024-01-01T00:00:00.000`,
        },
      ],
    }
  }

  generateAPIGatewayEvent(httpMethod: string, path: string, body?: string, headers?: { [key: string]: string }): any {
    const timestamp = Date.now()

    return {
      resource: path,
      path,
      httpMethod,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'test-user-agent',
        'X-Forwarded-For': '127.0.0.1',
        'X-Forwarded-Port': '443',
        'X-Forwarded-Proto': 'https',
        ...(headers || {}),
      },
      multiValueHeaders: {},
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      pathParameters: null,
      stageVariables: null,
      requestContext: {
        resourceId: 'test-resource',
        resourcePath: path,
        httpMethod,
        requestId: `test-request-${timestamp}`,
        protocol: 'HTTP/1.1',
        path: `/prod${path}`,
        stage: 'prod',
        requestTimeEpoch: timestamp,
        requestTime: new Date(timestamp).toISOString(),
        identity: {
          cognitoIdentityPoolId: null,
          accountId: null,
          cognitoIdentityId: null,
          caller: null,
          sourceIp: '127.0.0.1',
          principalOrgId: null,
          accessKey: null,
          cognitoAuthenticationType: null,
          cognitoAuthenticationProvider: null,
          userArn: null,
          userAgent: 'test-user-agent',
          user: null,
        },
        domainName: 'test-api.execute-api.us-east-1.amazonaws.com',
        apiId: 'test-api-id',
      },
      body,
      isBase64Encoded: false,
    }
  }

  private convertToAttributeValue(item: DynamoDBRecord): { [key: string]: any } {
    const result: { [key: string]: any } = {}

    for (const [key, value] of Object.entries(item)) {
      if (typeof value === 'string') {
        result[key] = { S: value }
      } else if (typeof value === 'number') {
        result[key] = { N: value.toString() }
      } else if (typeof value === 'boolean') {
        result[key] = { BOOL: value }
      } else if (Array.isArray(value)) {
        result[key] = { L: value.map(v => ({ S: v.toString() })) }
      } else if (value === null) {
        result[key] = { NULL: true }
      } else {
        result[key] = { S: JSON.stringify(value) }
      }
    }

    return result
  }
}
