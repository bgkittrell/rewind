/**
 * AWS Adapter Layer - Core Types
 *
 * TypeScript interfaces for AWS service adapters supporting both
 * production AWS services and in-memory mock implementations.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { SQSClient } from '@aws-sdk/client-sqs'
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch'

// Configuration types
export interface AwsConfig {
  region: string
  isTestMode: boolean
  enableLogging: boolean
}

export interface TestConfig {
  resetDataBetweenTests: boolean
  enableMetrics: boolean
  timeoutMs: number
}

export interface AdapterConfig {
  aws: AwsConfig
  test: TestConfig
}

// DynamoDB Adapter Interface
export interface DynamoDBRecord {
  [key: string]: any
}

export interface DynamoDBTableConfig {
  tableName: string
  primaryKey: string
  sortKey?: string
  indexes?: string[]
}

export interface DynamoDBAdapter {
  putItem(tableName: string, item: DynamoDBRecord): Promise<void>
  getItem(tableName: string, key: DynamoDBRecord): Promise<DynamoDBRecord | null>
  updateItem(tableName: string, key: DynamoDBRecord, updateExpression: string, values: DynamoDBRecord): Promise<void>
  deleteItem(tableName: string, key: DynamoDBRecord): Promise<void>
  scan(tableName: string, filterExpression?: string, values?: DynamoDBRecord): Promise<DynamoDBRecord[]>
  query(tableName: string, keyCondition: string, values: DynamoDBRecord): Promise<DynamoDBRecord[]>
  batchWrite(tableName: string, items: DynamoDBRecord[]): Promise<void>
  createTable(config: DynamoDBTableConfig): Promise<void>
  deleteTable(tableName: string): Promise<void>
  clearTable(tableName: string): Promise<void>
}

// SQS Adapter Interface
export interface SQSMessage {
  id: string
  body: string
  attributes?: { [key: string]: string }
  messageAttributes?: { [key: string]: any }
}

export interface SQSAdapter {
  sendMessage(queueUrl: string, messageBody: string, attributes?: { [key: string]: string }): Promise<string>
  receiveMessages(queueUrl: string, maxMessages?: number): Promise<SQSMessage[]>
  deleteMessage(queueUrl: string, messageId: string): Promise<void>
  createQueue(queueName: string, attributes?: { [key: string]: string }): Promise<string>
  deleteQueue(queueUrl: string): Promise<void>
  purgeQueue(queueUrl: string): Promise<void>
  getQueueAttributes(queueUrl: string): Promise<{ [key: string]: string }>
}

// Bedrock Adapter Interface
export interface BedrockRequest {
  modelId: string
  contentType: string
  accept: string
  body: string
}

export interface BedrockResponse {
  contentType: string
  body: string
  metrics?: {
    inputTokens: number
    outputTokens: number
    latencyMs: number
  }
}

export interface BedrockAdapter {
  invokeModel(request: BedrockRequest): Promise<BedrockResponse>
  invokeModelWithResponseStream(request: BedrockRequest): Promise<AsyncIterable<BedrockResponse>>
  listFoundationModels(): Promise<string[]>
}

// CloudWatch Adapter Interface
export interface CloudWatchMetric {
  metricName: string
  namespace: string
  value: number
  unit: string
  dimensions?: { [key: string]: string }
  timestamp?: Date
}

export interface CloudWatchAdapter {
  putMetricData(metrics: CloudWatchMetric[]): Promise<void>
  getMetricStatistics(namespace: string, metricName: string, startTime: Date, endTime: Date): Promise<number[]>
  createAlarm(alarmName: string, config: any): Promise<void>
  deleteAlarm(alarmName: string): Promise<void>
}

// Lambda Adapter Interface
export interface LambdaEvent {
  [key: string]: any
}

export interface LambdaContext {
  functionName: string
  functionVersion: string
  invokedFunctionArn: string
  memoryLimitInMB: string
  awsRequestId: string
  logGroupName: string
  logStreamName: string
  remainingTimeInMillis: () => number
}

export interface LambdaResponse {
  statusCode: number
  headers?: { [key: string]: string }
  body?: string
  isBase64Encoded?: boolean
}

export interface LambdaAdapter {
  invoke(functionName: string, event: LambdaEvent): Promise<LambdaResponse>
  createFunction(
    functionName: string,
    handler: (event: LambdaEvent, context: LambdaContext) => Promise<LambdaResponse>,
  ): Promise<void>
  deleteFunction(functionName: string): Promise<void>
  updateFunctionCode(
    functionName: string,
    handler: (event: LambdaEvent, context: LambdaContext) => Promise<LambdaResponse>,
  ): Promise<void>
}

// Main Adapter Registry
export interface AwsAdapterRegistry {
  dynamodb: DynamoDBAdapter
  sqs: SQSAdapter
  bedrock: BedrockAdapter
  cloudwatch: CloudWatchAdapter
  lambda: LambdaAdapter
}

// Factory interfaces
export interface AwsAdapterFactory {
  create(config: AdapterConfig): AwsAdapterRegistry
  createForTesting(testConfig?: Partial<TestConfig>): AwsAdapterRegistry
  createForProduction(awsConfig?: Partial<AwsConfig>): AwsAdapterRegistry
}

// Test utilities
export interface TestDataManager {
  seedTestData(tableName: string, data: DynamoDBRecord[]): Promise<void>
  cleanupTestData(tableName: string): Promise<void>
  createTestEpisode(overrides?: Partial<DynamoDBRecord>): Promise<DynamoDBRecord>
  createTestPodcast(overrides?: Partial<DynamoDBRecord>): Promise<DynamoDBRecord>
  createTestUser(overrides?: Partial<DynamoDBRecord>): Promise<DynamoDBRecord>
}

export interface MockEventGenerator {
  generateSQSEvent(messageBody: string, attributes?: { [key: string]: string }): LambdaEvent
  generateDynamoDBEvent(eventName: string, tableName: string, item: DynamoDBRecord): LambdaEvent
  generateAPIGatewayEvent(
    httpMethod: string,
    path: string,
    body?: string,
    headers?: { [key: string]: string },
  ): LambdaEvent
}

// Error types
export class AdapterError extends Error {
  constructor(
    message: string,
    public service: string,
    public operation: string,
    public originalError?: Error,
  ) {
    super(message)
    this.name = 'AdapterError'
  }
}

export class TestDataError extends Error {
  constructor(
    message: string,
    public tableName: string,
    public operation: string,
  ) {
    super(message)
    this.name = 'TestDataError'
  }
}
