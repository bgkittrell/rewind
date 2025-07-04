import { DynamoDBClient, PutItemCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

// Bedrock pricing as of 2024 (Claude 3 Haiku)
const BEDROCK_PRICING = {
  'claude-3-haiku': {
    inputTokens: 0.00025,  // per 1K input tokens
    outputTokens: 0.00125  // per 1K output tokens
  }
} as const

const COMPREHEND_PRICING = {
  detectEntities: 0.0001,     // per request
  detectKeyPhrases: 0.0001    // per request
} as const

interface UsageMetrics {
  date: string
  bedrockInputTokens: number
  bedrockOutputTokens: number
  comprehendRequests: number
  totalCost: number
  episodesProcessed: number
}

interface CostBudget {
  monthlyLimit: number
  currentSpend: number
  warningThreshold: number
  lastResetDate: string
}

interface TokenEstimate {
  inputTokens: number
  outputTokens: number
  estimatedCost: number
}

export class CostManagementService {
  private dynamoClient: DynamoDBClient
  private readonly USAGE_TABLE = (process as any).env.AI_USAGE_TABLE || 'RewindAIUsage'
  private readonly BUDGET_TABLE = (process as any).env.AI_BUDGET_TABLE || 'RewindAIBudget'
  
  // Monthly budget limits (can be configured via environment)
  private readonly DEFAULT_MONTHLY_BUDGET = parseFloat((process as any).env.AI_MONTHLY_BUDGET || '100') // $100/month
  private readonly WARNING_THRESHOLD = 0.8 // 80% of budget

  constructor() {
    this.dynamoClient = new DynamoDBClient({ region: (process as any).env.AWS_REGION })
  }

  /**
   * Estimate cost before making Bedrock request
   */
  estimateBedrockCost(inputText: string): TokenEstimate {
    // Rough token estimation (Claude 3 Haiku: ~4 chars per token)
    const inputTokens = Math.ceil(inputText.length / 4)
    
    // Output is typically 20-40% of input for guest extraction
    const outputTokens = Math.ceil(inputTokens * 0.3)
    
    const inputCost = (inputTokens / 1000) * BEDROCK_PRICING['claude-3-haiku'].inputTokens
    const outputCost = (outputTokens / 1000) * BEDROCK_PRICING['claude-3-haiku'].outputTokens
    
    return {
      inputTokens,
      outputTokens,
      estimatedCost: inputCost + outputCost
    }
  }

  /**
   * Check if request is within budget before processing
   */
  async canProcessRequest(estimatedCost: number): Promise<{
    allowed: boolean
    reason?: string
    currentSpend: number
    remainingBudget: number
  }> {
    const budget = await this.getCurrentBudget()
    const remainingBudget = budget.monthlyLimit - budget.currentSpend
    
    if (estimatedCost > remainingBudget) {
      return {
        allowed: false,
        reason: 'Would exceed monthly budget',
        currentSpend: budget.currentSpend,
        remainingBudget
      }
    }

    // Warn if approaching limit
    if (budget.currentSpend + estimatedCost > budget.monthlyLimit * this.WARNING_THRESHOLD) {
      console.warn(`Approaching budget limit: $${budget.currentSpend + estimatedCost} of $${budget.monthlyLimit}`)
    }

    return {
      allowed: true,
      currentSpend: budget.currentSpend,
      remainingBudget
    }
  }

  /**
   * Track actual usage after Bedrock request
   */
  async trackBedrockUsage(
    inputTokens: number,
    outputTokens: number,
    episodeId: string
  ): Promise<void> {
    const inputCost = (inputTokens / 1000) * BEDROCK_PRICING['claude-3-haiku'].inputTokens
    const outputCost = (outputTokens / 1000) * BEDROCK_PRICING['claude-3-haiku'].outputTokens
    const totalCost = inputCost + outputCost

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // Update daily usage
    await this.updateDailyUsage(today, {
      bedrockInputTokens: inputTokens,
      bedrockOutputTokens: outputTokens,
      comprehendRequests: 0,
      totalCost,
      episodesProcessed: 1
    })

    // Update monthly budget
    await this.updateCurrentSpend(totalCost)

    console.log(`Bedrock usage tracked: ${inputTokens} input + ${outputTokens} output tokens = $${totalCost.toFixed(4)}`)
  }

  /**
   * Track Comprehend usage
   */
  async trackComprehendUsage(requests: number, episodeId: string): Promise<void> {
    const totalCost = requests * COMPREHEND_PRICING.detectEntities

    const today = new Date().toISOString().split('T')[0]

    await this.updateDailyUsage(today, {
      bedrockInputTokens: 0,
      bedrockOutputTokens: 0,
      comprehendRequests: requests,
      totalCost,
      episodesProcessed: 1
    })

    await this.updateCurrentSpend(totalCost)

    console.log(`Comprehend usage tracked: ${requests} requests = $${totalCost.toFixed(4)}`)
  }

  /**
   * Get current monthly budget status
   */
  async getCurrentBudget(): Promise<CostBudget> {
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    
    const params = {
      TableName: this.BUDGET_TABLE,
      Key: marshall({ month: currentMonth })
    }

    try {
      const result = await this.dynamoClient.send(new QueryCommand(params))
      
      if (result.Items && result.Items.length > 0) {
        return unmarshall(result.Items[0]) as CostBudget
      }
    } catch (error) {
      console.error('Error getting budget:', error)
    }

    // Initialize new month budget
    const newBudget: CostBudget = {
      monthlyLimit: this.DEFAULT_MONTHLY_BUDGET,
      currentSpend: 0,
      warningThreshold: this.WARNING_THRESHOLD,
      lastResetDate: new Date().toISOString()
    }

    await this.initializeMonthlyBudget(currentMonth, newBudget)
    return newBudget
  }

  /**
   * Get usage analytics for monitoring
   */
  async getUsageAnalytics(days: number = 30): Promise<{
    totalCost: number
    episodesProcessed: number
    averageCostPerEpisode: number
    bedrockVsComprehendCost: { bedrock: number; comprehend: number }
    dailyUsage: UsageMetrics[]
  }> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    const params = {
      TableName: this.USAGE_TABLE,
      KeyConditionExpression: '#date BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#date': 'date' },
      ExpressionAttributeValues: marshall({
        ':start': startDate.toISOString().split('T')[0],
        ':end': endDate.toISOString().split('T')[0]
      })
    }

    try {
      const result = await this.dynamoClient.send(new QueryCommand(params))
      const dailyUsage = result.Items?.map((item: any) => unmarshall(item) as UsageMetrics) || []

      const totalCost = dailyUsage.reduce((sum: number, day: UsageMetrics) => sum + day.totalCost, 0)
      const episodesProcessed = dailyUsage.reduce((sum: number, day: UsageMetrics) => sum + day.episodesProcessed, 0)

      // Calculate Bedrock vs Comprehend costs
      const bedrockCost = dailyUsage.reduce((sum: number, day: UsageMetrics) => {
        const dayBedrockCost = 
          (day.bedrockInputTokens / 1000) * BEDROCK_PRICING['claude-3-haiku'].inputTokens +
          (day.bedrockOutputTokens / 1000) * BEDROCK_PRICING['claude-3-haiku'].outputTokens
        return sum + dayBedrockCost
      }, 0)

      const comprehendCost = dailyUsage.reduce((sum: number, day: UsageMetrics) => 
        sum + (day.comprehendRequests * COMPREHEND_PRICING.detectEntities), 0
      )

      return {
        totalCost,
        episodesProcessed,
        averageCostPerEpisode: episodesProcessed > 0 ? totalCost / episodesProcessed : 0,
        bedrockVsComprehendCost: { bedrock: bedrockCost, comprehend: comprehendCost },
        dailyUsage
      }
    } catch (error) {
      console.error('Error getting usage analytics:', error)
      throw new Error('Failed to get usage analytics')
    }
  }

  /**
   * Check if we should use Bedrock vs Comprehend based on budget
   */
  async recommendExtractionMethod(inputText: string): Promise<{
    method: 'bedrock' | 'comprehend' | 'regex'
    reason: string
    estimatedCost: number
  }> {
    const bedrockEstimate = this.estimateBedrockCost(inputText)
    const comprehendCost = COMPREHEND_PRICING.detectEntities
    
    const budgetCheck = await this.canProcessRequest(bedrockEstimate.estimatedCost)
    
    // If Bedrock would exceed budget, use Comprehend
    if (!budgetCheck.allowed) {
      return {
        method: 'comprehend',
        reason: 'Bedrock would exceed monthly budget',
        estimatedCost: comprehendCost
      }
    }

    // If we're close to budget limit, be more conservative
    if (budgetCheck.remainingBudget < this.DEFAULT_MONTHLY_BUDGET * 0.1) { // 10% remaining
      return {
        method: 'comprehend',
        reason: 'Conserving budget - less than 10% remaining',
        estimatedCost: comprehendCost
      }
    }

    // For simple/short content, Comprehend might be sufficient
    if (inputText.length < 500) {
      return {
        method: 'comprehend',
        reason: 'Short content - Comprehend sufficient',
        estimatedCost: comprehendCost
      }
    }

    // Use Bedrock for complex content when budget allows
    return {
      method: 'bedrock',
      reason: 'Complex content benefits from advanced LLM',
      estimatedCost: bedrockEstimate.estimatedCost
    }
  }

  // Private helper methods
  private async updateDailyUsage(date: string, usage: Partial<UsageMetrics>): Promise<void> {
    const params = {
      TableName: this.USAGE_TABLE,
      Key: marshall({ date }),
      UpdateExpression: 'ADD bedrockInputTokens :bit, bedrockOutputTokens :bot, comprehendRequests :cr, totalCost :tc, episodesProcessed :ep',
      ExpressionAttributeValues: marshall({
        ':bit': usage.bedrockInputTokens || 0,
        ':bot': usage.bedrockOutputTokens || 0,
        ':cr': usage.comprehendRequests || 0,
        ':tc': usage.totalCost || 0,
        ':ep': usage.episodesProcessed || 0
      })
    }

    await this.dynamoClient.send(new UpdateItemCommand(params))
  }

  private async updateCurrentSpend(cost: number): Promise<void> {
    const currentMonth = new Date().toISOString().slice(0, 7)
    
    const params = {
      TableName: this.BUDGET_TABLE,
      Key: marshall({ month: currentMonth }),
      UpdateExpression: 'ADD currentSpend :cost',
      ExpressionAttributeValues: marshall({ ':cost': cost })
    }

    await this.dynamoClient.send(new UpdateItemCommand(params))
  }

  private async initializeMonthlyBudget(month: string, budget: CostBudget): Promise<void> {
    const params = {
      TableName: this.BUDGET_TABLE,
      Item: marshall({ month, ...budget })
    }

    await this.dynamoClient.send(new PutItemCommand(params))
  }
}

export const costManagementService = new CostManagementService()