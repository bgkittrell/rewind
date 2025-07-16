/**
 * AWS Adapter Configuration System
 *
 * Centralized configuration management for test vs production environments
 */

import { AdapterConfig, AwsConfig, TestConfig } from '../types'

export class AdapterConfigManager {
  private static instance: AdapterConfigManager
  private config: AdapterConfig

  private constructor() {
    this.config = this.loadDefaultConfig()
  }

  static getInstance(): AdapterConfigManager {
    if (!AdapterConfigManager.instance) {
      AdapterConfigManager.instance = new AdapterConfigManager()
    }
    return AdapterConfigManager.instance
  }

  getConfig(): AdapterConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<AdapterConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      aws: { ...this.config.aws, ...updates.aws },
      test: { ...this.config.test, ...updates.test },
    }
  }

  setTestMode(enabled: boolean): void {
    this.config.aws.isTestMode = enabled
  }

  isTestMode(): boolean {
    return this.config.aws.isTestMode
  }

  private loadDefaultConfig(): AdapterConfig {
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development'

    return {
      aws: {
        region: process.env.AWS_REGION || 'us-east-1',
        isTestMode: isTestEnv,
        enableLogging: process.env.ADAPTER_LOGGING === 'true' || isTestEnv,
      },
      test: {
        resetDataBetweenTests: process.env.RESET_TEST_DATA !== 'false',
        enableMetrics: process.env.ENABLE_TEST_METRICS === 'true',
        timeoutMs: parseInt(process.env.TEST_TIMEOUT_MS || '30000'),
      },
    }
  }
}

/**
 * Configuration presets for different environments
 */
export const ConfigPresets = {
  development: (): AdapterConfig => ({
    aws: {
      region: 'us-east-1',
      isTestMode: true,
      enableLogging: true,
    },
    test: {
      resetDataBetweenTests: true,
      enableMetrics: false,
      timeoutMs: 10000,
    },
  }),

  testing: (): AdapterConfig => ({
    aws: {
      region: 'us-east-1',
      isTestMode: true,
      enableLogging: false,
    },
    test: {
      resetDataBetweenTests: true,
      enableMetrics: true,
      timeoutMs: 5000,
    },
  }),

  production: (): AdapterConfig => ({
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      isTestMode: false,
      enableLogging: false,
    },
    test: {
      resetDataBetweenTests: false,
      enableMetrics: false,
      timeoutMs: 60000,
    },
  }),

  integration: (): AdapterConfig => ({
    aws: {
      region: 'us-east-1',
      isTestMode: true,
      enableLogging: true,
    },
    test: {
      resetDataBetweenTests: true,
      enableMetrics: true,
      timeoutMs: 30000,
    },
  }),
}

/**
 * Environment detection utilities
 */
export class EnvironmentDetector {
  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production'
  }

  static isTest(): boolean {
    return process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined
  }

  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development'
  }

  static isCI(): boolean {
    return process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'
  }

  static getEnvironment(): 'production' | 'test' | 'development' | 'ci' {
    if (this.isProduction()) return 'production'
    if (this.isTest()) return 'test'
    if (this.isCI()) return 'ci'
    return 'development'
  }
}

/**
 * Configuration validation
 */
export class ConfigValidator {
  static validate(config: AdapterConfig): string[] {
    const errors: string[] = []

    // AWS config validation
    if (!config.aws.region) {
      errors.push('AWS region is required')
    }

    if (!config.aws.region.match(/^[a-z]{2}-[a-z]+-\d{1}$/)) {
      errors.push('AWS region format is invalid')
    }

    // Test config validation
    if (config.test.timeoutMs <= 0) {
      errors.push('Test timeout must be greater than 0')
    }

    if (config.test.timeoutMs > 300000) {
      errors.push('Test timeout cannot exceed 5 minutes')
    }

    return errors
  }

  static validateOrThrow(config: AdapterConfig): void {
    const errors = this.validate(config)
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`)
    }
  }
}

/**
 * Table name resolution based on environment
 */
export class TableNameResolver {
  private static instance: TableNameResolver
  private config: AdapterConfig

  private constructor() {
    this.config = AdapterConfigManager.getInstance().getConfig()
  }

  static getInstance(): TableNameResolver {
    if (!TableNameResolver.instance) {
      TableNameResolver.instance = new TableNameResolver()
    }
    return TableNameResolver.instance
  }

  resolve(baseTableName: string): string {
    if (this.config.aws.isTestMode) {
      return `test-${baseTableName}`
    }

    const env = EnvironmentDetector.getEnvironment()
    if (env === 'production') {
      return baseTableName
    }

    return `${env}-${baseTableName}`
  }

  // Common table names from the existing system
  getPodcastsTable(): string {
    return this.resolve(process.env.PODCASTS_TABLE || 'RewindPodcasts')
  }

  getEpisodesTable(): string {
    return this.resolve(process.env.EPISODES_TABLE || 'RewindEpisodes')
  }

  getListeningHistoryTable(): string {
    return this.resolve(process.env.LISTENING_HISTORY_TABLE || 'RewindListeningHistory')
  }

  getUserFavoritesTable(): string {
    return this.resolve(process.env.USER_FAVORITES_TABLE || 'RewindUserFavorites')
  }

  getGuestAnalyticsTable(): string {
    return this.resolve(process.env.GUEST_ANALYTICS_TABLE || 'RewindGuestAnalytics')
  }

  getRateLimitTable(): string {
    return this.resolve(process.env.RATE_LIMIT_TABLE || 'RewindRateLimit')
  }

  getSharesTable(): string {
    return this.resolve(process.env.SHARES_TABLE || 'RewindShares')
  }
}

/**
 * Queue URL resolution based on environment
 */
export class QueueUrlResolver {
  private static instance: QueueUrlResolver
  private config: AdapterConfig

  private constructor() {
    this.config = AdapterConfigManager.getInstance().getConfig()
  }

  static getInstance(): QueueUrlResolver {
    if (!QueueUrlResolver.instance) {
      QueueUrlResolver.instance = new QueueUrlResolver()
    }
    return QueueUrlResolver.instance
  }

  resolve(baseQueueName: string): string {
    if (this.config.aws.isTestMode) {
      return `https://sqs.${this.config.aws.region}.amazonaws.com/123456789012/test-${baseQueueName}`
    }

    const accountId = process.env.AWS_ACCOUNT_ID || '123456789012'
    const env = EnvironmentDetector.getEnvironment()

    if (env === 'production') {
      return `https://sqs.${this.config.aws.region}.amazonaws.com/${accountId}/${baseQueueName}`
    }

    return `https://sqs.${this.config.aws.region}.amazonaws.com/${accountId}/${env}-${baseQueueName}`
  }

  getGuestExtractionQueue(): string {
    return this.resolve('guest-extraction-queue')
  }

  getEpisodeSyncQueue(): string {
    return this.resolve('episode-sync-queue')
  }

  getGuestExtractionDLQ(): string {
    return this.resolve('guest-extraction-dlq')
  }

  getEpisodeSyncDLQ(): string {
    return this.resolve('episode-sync-dlq')
  }
}

/**
 * Easy configuration setup for common scenarios
 */
export class ConfigSetup {
  static forTesting(): AdapterConfig {
    return ConfigPresets.testing()
  }

  static forDevelopment(): AdapterConfig {
    return ConfigPresets.development()
  }

  static forProduction(): AdapterConfig {
    return ConfigPresets.production()
  }

  static forIntegrationTesting(): AdapterConfig {
    return ConfigPresets.integration()
  }

  static applyPreset(preset: 'development' | 'testing' | 'production' | 'integration'): void {
    const config = ConfigPresets[preset]()
    AdapterConfigManager.getInstance().updateConfig(config)
  }
}

// Global configuration instance
export const adapterConfig = AdapterConfigManager.getInstance()
