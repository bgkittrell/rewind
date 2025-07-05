import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

export interface RateLimitRule {
  endpoint: string
  maxRequests: number
  windowMinutes: number
  burstLimit?: number // Allow short bursts
}

export interface RateLimitRecord {
  userId: string
  endpoint: string
  requests: number
  windowStart: number
  lastRequest: number
  burstCount: number
  ttl: number
}

export class RateLimitService {
  private client: DynamoDBDocumentClient
  private tableName = process.env.RATE_LIMIT_TABLE || 'RewindRateLimit'

  // Rate limiting rules for different endpoints
  private rules: Record<string, RateLimitRule> = {
    'extract-guests': {
      endpoint: 'extract-guests',
      maxRequests: 100, // 100 requests per hour
      windowMinutes: 60,
      burstLimit: 10, // Allow 10 requests in quick succession
    },
    'batch-extract-guests': {
      endpoint: 'batch-extract-guests',
      maxRequests: 20, // 20 batch requests per hour (up to 200 episodes)
      windowMinutes: 60,
      burstLimit: 3, // Allow 3 batch requests in quick succession
    },
    'recommendations': {
      endpoint: 'recommendations',
      maxRequests: 1000, // 1000 requests per hour
      windowMinutes: 60,
      burstLimit: 50, // Allow 50 requests in quick succession
    },
    'guest-analytics': {
      endpoint: 'guest-analytics',
      maxRequests: 500, // 500 updates per hour
      windowMinutes: 60,
      burstLimit: 25, // Allow 25 updates in quick succession
    },
  }

  constructor() {
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    })
    this.client = DynamoDBDocumentClient.from(dynamoClient)
  }

  /**
   * Check if a request is allowed for the given user and endpoint
   */
  async isRequestAllowed(userId: string, endpoint: string): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    retryAfter?: number
  }> {
    const rule = this.rules[endpoint]
    if (!rule) {
      // If no rule exists, allow the request
      return {
        allowed: true,
        remaining: 999,
        resetTime: Date.now() + 60 * 60 * 1000, // 1 hour from now
      }
    }

    const now = Date.now()
    const windowStartTime = now - (rule.windowMinutes * 60 * 1000)
    
    try {
      // Get current rate limit record
      const record = await this.getRateLimitRecord(userId, endpoint)
      
      if (!record) {
        // First request - create new record
        await this.createRateLimitRecord(userId, endpoint, now, rule)
        return {
          allowed: true,
          remaining: rule.maxRequests - 1,
          resetTime: now + (rule.windowMinutes * 60 * 1000),
        }
      }

      // Check if we're in a new time window
      if (record.windowStart < windowStartTime) {
        // Reset the window
        await this.resetRateLimitWindow(userId, endpoint, now, rule)
        return {
          allowed: true,
          remaining: rule.maxRequests - 1,
          resetTime: now + (rule.windowMinutes * 60 * 1000),
        }
      }

      // Check burst limit (requests in last 5 minutes)
      const burstWindowStart = now - (5 * 60 * 1000) // 5 minutes
      if (rule.burstLimit && record.lastRequest > burstWindowStart) {
        if (record.burstCount >= rule.burstLimit) {
          const retryAfter = Math.ceil((burstWindowStart + (5 * 60 * 1000) - now) / 1000)
          return {
            allowed: false,
            remaining: 0,
            resetTime: record.windowStart + (rule.windowMinutes * 60 * 1000),
            retryAfter,
          }
        }
      }

      // Check main rate limit
      if (record.requests >= rule.maxRequests) {
        const retryAfter = Math.ceil((record.windowStart + (rule.windowMinutes * 60 * 1000) - now) / 1000)
        return {
          allowed: false,
          remaining: 0,
          resetTime: record.windowStart + (rule.windowMinutes * 60 * 1000),
          retryAfter,
        }
      }

      // Request is allowed - increment counters
      await this.incrementRateLimitCounters(userId, endpoint, now, record, rule)
      
      return {
        allowed: true,
        remaining: rule.maxRequests - record.requests - 1,
        resetTime: record.windowStart + (rule.windowMinutes * 60 * 1000),
      }

    } catch (error) {
      console.error('Error checking rate limit:', error)
      // On error, allow the request but log it
      return {
        allowed: true,
        remaining: rule.maxRequests,
        resetTime: now + (rule.windowMinutes * 60 * 1000),
      }
    }
  }

  /**
   * Get rate limit record for user and endpoint
   */
  private async getRateLimitRecord(userId: string, endpoint: string): Promise<RateLimitRecord | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        userId,
        endpoint,
      },
    })

    const result = await this.client.send(command)
    return result.Item as RateLimitRecord || null
  }

  /**
   * Create new rate limit record
   */
  private async createRateLimitRecord(
    userId: string, 
    endpoint: string, 
    now: number, 
    rule: RateLimitRule
  ): Promise<void> {
    const record: RateLimitRecord = {
      userId,
      endpoint,
      requests: 1,
      windowStart: now,
      lastRequest: now,
      burstCount: 1,
      ttl: Math.floor((now + (rule.windowMinutes * 60 * 1000)) / 1000), // TTL in seconds
    }

    const command = new PutCommand({
      TableName: this.tableName,
      Item: record,
    })

    await this.client.send(command)
  }

  /**
   * Reset rate limit window
   */
  private async resetRateLimitWindow(
    userId: string, 
    endpoint: string, 
    now: number, 
    rule: RateLimitRule
  ): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        userId,
        endpoint,
      },
      UpdateExpression: 'SET requests = :requests, windowStart = :windowStart, lastRequest = :lastRequest, burstCount = :burstCount, #ttl = :ttl',
      ExpressionAttributeNames: {
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':requests': 1,
        ':windowStart': now,
        ':lastRequest': now,
        ':burstCount': 1,
        ':ttl': Math.floor((now + (rule.windowMinutes * 60 * 1000)) / 1000),
      },
    })

    await this.client.send(command)
  }

  /**
   * Increment rate limit counters
   */
  private async incrementRateLimitCounters(
    userId: string, 
    endpoint: string, 
    now: number, 
    record: RateLimitRecord,
    rule: RateLimitRule
  ): Promise<void> {
    // Reset burst count if outside burst window
    const burstWindowStart = now - (5 * 60 * 1000) // 5 minutes
    const newBurstCount = record.lastRequest > burstWindowStart ? record.burstCount + 1 : 1

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        userId,
        endpoint,
      },
      UpdateExpression: 'SET requests = requests + :inc, lastRequest = :lastRequest, burstCount = :burstCount, #ttl = :ttl',
      ExpressionAttributeNames: {
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':inc': 1,
        ':lastRequest': now,
        ':burstCount': newBurstCount,
        ':ttl': Math.floor((record.windowStart + (rule.windowMinutes * 60 * 1000)) / 1000),
      },
    })

    await this.client.send(command)
  }

  /**
   * Get rate limit status for a user and endpoint (for monitoring)
   */
  async getRateLimitStatus(userId: string, endpoint: string): Promise<{
    requests: number
    maxRequests: number
    remaining: number
    resetTime: number
    windowMinutes: number
  } | null> {
    const rule = this.rules[endpoint]
    if (!rule) {
      return null
    }

    try {
      const record = await this.getRateLimitRecord(userId, endpoint)
      if (!record) {
        return {
          requests: 0,
          maxRequests: rule.maxRequests,
          remaining: rule.maxRequests,
          resetTime: Date.now() + (rule.windowMinutes * 60 * 1000),
          windowMinutes: rule.windowMinutes,
        }
      }

      return {
        requests: record.requests,
        maxRequests: rule.maxRequests,
        remaining: Math.max(0, rule.maxRequests - record.requests),
        resetTime: record.windowStart + (rule.windowMinutes * 60 * 1000),
        windowMinutes: rule.windowMinutes,
      }
    } catch (error) {
      console.error('Error getting rate limit status:', error)
      return null
    }
  }

  /**
   * Clear rate limit for a user (admin function)
   */
  async clearRateLimit(userId: string, endpoint: string): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        userId,
        endpoint,
      },
      UpdateExpression: 'SET requests = :zero, burstCount = :zero',
      ExpressionAttributeValues: {
        ':zero': 0,
      },
    })

    await this.client.send(command)
  }

  /**
   * Update rate limit rules (for dynamic configuration)
   */
  updateRule(endpoint: string, rule: RateLimitRule): void {
    this.rules[endpoint] = rule
  }

  /**
   * Get all rate limit rules
   */
  getRules(): Record<string, RateLimitRule> {
    return { ...this.rules }
  }
}

export const rateLimitService = new RateLimitService()