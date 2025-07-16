/**
 * AWS Adapter Layer - Main Export
 *
 * Integration testing framework for AWS services without cloud dependencies
 */

// Core types
export * from './types'

// Adapter implementations
export * from './adapters/DynamoDBAdapter'
export * from './adapters/SQSAdapter'
export * from './adapters/LambdaAdapter'
export * from './adapters/BedrockAdapter'
export * from './adapters/CloudWatchAdapter'

// Configuration system
export * from './config/AdapterConfig'

// Test utilities
export * from './utils/TestDataManager'

// Factory and registry
export * from './AwsAdapterFactory'

// Example tests
export * from './examples/UpvoteIntegrationTest'

// Quick setup functions
export {
  setupTestEnvironment,
  setupIntegrationTestEnvironment,
  createTestingAdapters,
  createProductionAdapters,
  createAdapters,
} from './AwsAdapterFactory'

/**
 * Quick Start Guide
 * =================
 *
 * Basic Usage:
 * ```typescript
 * import { setupTestEnvironment } from './testing/aws-adapter';
 *
 * describe('My Integration Test', () => {
 *   let adapters;
 *
 *   beforeEach(async () => {
 *     adapters = setupTestEnvironment();
 *     await adapters.setupTestEnvironment();
 *   });
 *
 *   it('should test something', async () => {
 *     // Use adapters.dynamodb, adapters.sqs, etc.
 *   });
 * });
 * ```
 *
 * Advanced Configuration:
 * ```typescript
 * import { createAdapters, ConfigPresets } from './testing/aws-adapter';
 *
 * const adapters = createAdapters(ConfigPresets.integration());
 * ```
 *
 * Test Data Management:
 * ```typescript
 * const testDataManager = adapters.getTestDataManager();
 * const episode = await testDataManager.createTestEpisode();
 * await testDataManager.cleanupTestData('Episodes');
 * ```
 *
 * Lambda Handler Testing:
 * ```typescript
 * const eventGenerator = adapters.getEventGenerator();
 * const event = eventGenerator.generateAPIGatewayEvent('POST', '/api/test');
 *
 * await adapters.lambda.createFunction('testHandler', myHandler);
 * const response = await adapters.lambda.invoke('testHandler', event);
 * ```
 */
