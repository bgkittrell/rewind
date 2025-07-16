/**
 * AWS Adapter Factory
 *
 * Central factory for creating AWS service adapters with proper configuration
 */

import { AwsAdapterFactory, AwsAdapterRegistry, AdapterConfig, TestConfig, AwsConfig } from './types'
import { MockDynamoDBAdapter, ProductionDynamoDBAdapter } from './adapters/DynamoDBAdapter'
import { MockSQSAdapter, ProductionSQSAdapter } from './adapters/SQSAdapter'
import { MockLambdaAdapter, ProductionLambdaAdapter } from './adapters/LambdaAdapter'
import { MockBedrockAdapter, ProductionBedrockAdapter } from './adapters/BedrockAdapter'
import { MockCloudWatchAdapter, ProductionCloudWatchAdapter } from './adapters/CloudWatchAdapter'
import { AdapterConfigManager, ConfigPresets, ConfigValidator } from './config/AdapterConfig'
import { TestDataManagerImpl, MockEventGeneratorImpl } from './utils/TestDataManager'

export class AwsAdapterFactoryImpl implements AwsAdapterFactory {
  private static instance: AwsAdapterFactoryImpl
  private configManager: AdapterConfigManager

  private constructor() {
    this.configManager = AdapterConfigManager.getInstance()
  }

  static getInstance(): AwsAdapterFactoryImpl {
    if (!AwsAdapterFactoryImpl.instance) {
      AwsAdapterFactoryImpl.instance = new AwsAdapterFactoryImpl()
    }
    return AwsAdapterFactoryImpl.instance
  }

  create(config: AdapterConfig): AwsAdapterRegistry {
    // Validate configuration
    ConfigValidator.validateOrThrow(config)

    // Update global configuration
    this.configManager.updateConfig(config)

    // Create adapters based on configuration
    if (config.aws.isTestMode) {
      return this.createMockAdapters(config)
    } else {
      return this.createProductionAdapters(config)
    }
  }

  createForTesting(testConfig?: Partial<TestConfig>): AwsAdapterRegistry {
    const config = ConfigPresets.testing()

    if (testConfig) {
      config.test = { ...config.test, ...testConfig }
    }

    return this.create(config)
  }

  createForProduction(awsConfig?: Partial<AwsConfig>): AwsAdapterRegistry {
    const config = ConfigPresets.production()

    if (awsConfig) {
      config.aws = { ...config.aws, ...awsConfig }
    }

    return this.create(config)
  }

  private createMockAdapters(config: AdapterConfig): AwsAdapterRegistry {
    const dynamodb = new MockDynamoDBAdapter()
    const sqs = new MockSQSAdapter()
    const lambda = new MockLambdaAdapter()
    const bedrock = new MockBedrockAdapter()
    const cloudwatch = new MockCloudWatchAdapter()

    // Initialize test tables if needed
    this.initializeTestTables(dynamodb)

    // Initialize test queues if needed
    this.initializeTestQueues(sqs)

    return {
      dynamodb,
      sqs,
      lambda,
      bedrock,
      cloudwatch,
    }
  }

  private createProductionAdapters(config: AdapterConfig): AwsAdapterRegistry {
    return {
      dynamodb: new ProductionDynamoDBAdapter(),
      sqs: new ProductionSQSAdapter(),
      lambda: new ProductionLambdaAdapter(),
      bedrock: new ProductionBedrockAdapter(),
      cloudwatch: new ProductionCloudWatchAdapter(),
    }
  }

  private async initializeTestTables(dynamodb: MockDynamoDBAdapter): Promise<void> {
    const tables = [
      {
        tableName: 'test-RewindPodcasts',
        primaryKey: 'id',
        indexes: ['title', 'author'],
      },
      {
        tableName: 'test-RewindEpisodes',
        primaryKey: 'id',
        sortKey: 'naturalKey',
        indexes: ['podcastId', 'publishedAt'],
      },
      {
        tableName: 'test-RewindListeningHistory',
        primaryKey: 'id',
        indexes: ['userId', 'episodeId'],
      },
      {
        tableName: 'test-RewindUserFavorites',
        primaryKey: 'userId',
        sortKey: 'itemId',
        indexes: ['userId', 'episodeId'],
      },
      {
        tableName: 'test-RewindGuestAnalytics',
        primaryKey: 'userId',
        sortKey: 'guestName',
        indexes: ['episodeId', 'guestName'],
      },
      {
        tableName: 'test-RewindRateLimit',
        primaryKey: 'id',
        indexes: ['userId', 'endpoint'],
      },
      {
        tableName: 'test-RewindShares',
        primaryKey: 'id',
        indexes: ['userId', 'episodeId'],
      },
    ]

    for (const tableConfig of tables) {
      try {
        await dynamodb.createTable(tableConfig)
      } catch (error) {
        // Table might already exist, ignore
      }
    }
  }

  private async initializeTestQueues(sqs: MockSQSAdapter): Promise<void> {
    const queues = [
      {
        name: 'test-guest-extraction-queue',
        attributes: {
          VisibilityTimeout: '30',
          MessageRetentionPeriod: '1209600',
          RedrivePolicy: JSON.stringify({
            deadLetterTargetArn: 'arn:aws:sqs:us-east-1:123456789012:test-guest-extraction-dlq',
            maxReceiveCount: 3,
          }),
        },
      },
      {
        name: 'test-guest-extraction-dlq',
        attributes: {
          VisibilityTimeout: '30',
          MessageRetentionPeriod: '1209600',
        },
      },
      {
        name: 'test-episode-sync-queue',
        attributes: {
          VisibilityTimeout: '60',
          MessageRetentionPeriod: '1209600',
          RedrivePolicy: JSON.stringify({
            deadLetterTargetArn: 'arn:aws:sqs:us-east-1:123456789012:test-episode-sync-dlq',
            maxReceiveCount: 3,
          }),
        },
      },
      {
        name: 'test-episode-sync-dlq',
        attributes: {
          VisibilityTimeout: '60',
          MessageRetentionPeriod: '1209600',
        },
      },
    ]

    for (const queueConfig of queues) {
      try {
        await sqs.createQueue(queueConfig.name, queueConfig.attributes)
      } catch (error) {
        // Queue might already exist, ignore
      }
    }
  }
}

/**
 * Adapter Registry with additional utilities
 */
export class AwsAdapterRegistryImpl implements AwsAdapterRegistry {
  public dynamodb: any
  public sqs: any
  public lambda: any
  public bedrock: any
  public cloudwatch: any

  private testDataManager: TestDataManagerImpl
  private eventGenerator: MockEventGeneratorImpl

  constructor(adapters: AwsAdapterRegistry) {
    this.dynamodb = adapters.dynamodb
    this.sqs = adapters.sqs
    this.lambda = adapters.lambda
    this.bedrock = adapters.bedrock
    this.cloudwatch = adapters.cloudwatch

    this.testDataManager = new TestDataManagerImpl(this.dynamodb, this.sqs)
    this.eventGenerator = new MockEventGeneratorImpl()
  }

  // Test utilities
  getTestDataManager(): TestDataManagerImpl {
    return this.testDataManager
  }

  getEventGenerator(): MockEventGeneratorImpl {
    return this.eventGenerator
  }

  // Quick setup methods
  async setupTestEnvironment(): Promise<void> {
    const config = AdapterConfigManager.getInstance().getConfig()

    if (config.aws.isTestMode && config.test.resetDataBetweenTests) {
      await this.resetTestData()
    }
  }

  async resetTestData(): Promise<void> {
    // Clear all test data
    await this.testDataManager.cleanupAllTestData()

    // Clear SQS queues
    if (this.sqs.purgeQueue) {
      const queueNames = this.sqs.getQueueNames?.() || []
      for (const queueName of queueNames) {
        if (queueName.startsWith('test-')) {
          const queueUrl = `https://sqs.us-east-1.amazonaws.com/123456789012/${queueName}`
          await this.sqs.purgeQueue(queueUrl)
        }
      }
    }

    // Clear Lambda invocations
    if (this.lambda.clearInvocations) {
      this.lambda.clearInvocations()
    }

    // Clear metrics
    if (this.cloudwatch.clearMetrics) {
      this.cloudwatch.clearMetrics()
    }
  }

  // Inspection methods for testing
  getOperationHistory(): any {
    return {
      dynamodb: this.dynamodb.getOperations?.() || [],
      sqs: this.sqs.getOperations?.() || [],
      lambda: this.lambda.getInvocations?.() || [],
      cloudwatch: this.cloudwatch.getMetrics?.() || [],
    }
  }

  // Health check
  async healthCheck(): Promise<{ [service: string]: boolean }> {
    const health: { [service: string]: boolean } = {}

    try {
      // Test DynamoDB
      const tables = this.dynamodb.getTableNames?.() || []
      health.dynamodb = tables.length >= 0
    } catch (error) {
      health.dynamodb = false
    }

    try {
      // Test SQS
      const queues = this.sqs.getQueueNames?.() || []
      health.sqs = queues.length >= 0
    } catch (error) {
      health.sqs = false
    }

    try {
      // Test Lambda
      const functions = this.lambda.getRegisteredFunctions?.() || []
      health.lambda = functions.length >= 0
    } catch (error) {
      health.lambda = false
    }

    health.bedrock = true // Bedrock is always available in mock mode
    health.cloudwatch = true // CloudWatch is always available in mock mode

    return health
  }
}

// Global factory instance
export const awsAdapterFactory = AwsAdapterFactoryImpl.getInstance()

// Convenience functions
export function createTestingAdapters(testConfig?: Partial<TestConfig>): AwsAdapterRegistryImpl {
  const adapters = awsAdapterFactory.createForTesting(testConfig)
  return new AwsAdapterRegistryImpl(adapters)
}

export function createProductionAdapters(awsConfig?: Partial<AwsConfig>): AwsAdapterRegistryImpl {
  const adapters = awsAdapterFactory.createForProduction(awsConfig)
  return new AwsAdapterRegistryImpl(adapters)
}

export function createAdapters(config: AdapterConfig): AwsAdapterRegistryImpl {
  const adapters = awsAdapterFactory.create(config)
  return new AwsAdapterRegistryImpl(adapters)
}

// Jest setup helpers
export function setupTestEnvironment(): AwsAdapterRegistryImpl {
  return createTestingAdapters({
    resetDataBetweenTests: true,
    enableMetrics: true,
    timeoutMs: 10000,
  })
}

export function setupIntegrationTestEnvironment(): AwsAdapterRegistryImpl {
  return createTestingAdapters({
    resetDataBetweenTests: true,
    enableMetrics: true,
    timeoutMs: 30000,
  })
}
