import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { ComprehendClient, DetectEntitiesCommand, DetectKeyPhrasesCommand } from '@aws-sdk/client-comprehend'
import { costManagementService } from './costManagementService'

// Circuit breaker states
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

interface CircuitBreakerConfig {
  failureThreshold: number
  recoveryTimeout: number
  monitoringPeriod: number
}

interface ExtractionAttempt {
  method: 'bedrock' | 'comprehend' | 'regex'
  success: boolean
  error?: string
  timestamp: number
  cost?: number
}

interface GuestExtractionResult {
  guests: Array<{
    name: string
    confidence: number
    source: string
    context?: string
  }>
  method: string
  success: boolean
  fallbackUsed: boolean
  errors: string[]
  cost: number
  processingTime: number
}

// Simple regex patterns for fallback guest extraction
const GUEST_PATTERNS = [
  /(?:with|featuring|guest|interview with|joined by)\s+([A-Z][a-z]+ [A-Z][a-z]+)/gi,
  /(?:comedian|actor|author|host)\s+([A-Z][a-z]+ [A-Z][a-z]+)/gi,
  /([A-Z][a-z]+ [A-Z][a-z]+)\s+(?:joins us|stops by|is here)/gi,
  /(?:today|this week),?\s+([A-Z][a-z]+ [A-Z][a-z]+)/gi
]

export class RobustGuestExtractionService {
  private bedrockClient: BedrockRuntimeClient
  private comprehendClient: ComprehendClient
  
  // Circuit breaker state
  private circuitBreakers: Map<string, {
    state: CircuitState
    failureCount: number
    lastFailureTime: number
    config: CircuitBreakerConfig
  }> = new Map()
  
  // Recent attempts for monitoring
  private recentAttempts: ExtractionAttempt[] = []
  private readonly MAX_ATTEMPT_HISTORY = 100

  constructor() {
    this.bedrockClient = new BedrockRuntimeClient({ 
      region: (process as any).env.AWS_REGION || 'us-east-1'
    })
    this.comprehendClient = new ComprehendClient({ 
      region: (process as any).env.AWS_REGION || 'us-east-1'
    })
    
    // Initialize circuit breakers
    this.initializeCircuitBreaker('bedrock', {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 300000 // 5 minutes
    })
    
    this.initializeCircuitBreaker('comprehend', {
      failureThreshold: 3,
      recoveryTimeout: 30000, // 30 seconds
      monitoringPeriod: 180000 // 3 minutes
    })
  }

  /**
   * Main extraction method with comprehensive error handling
   */
  async extractGuestsWithFallbacks(
    episodeDescription: string,
    episodeTitle: string,
    episodeId: string
  ): Promise<GuestExtractionResult> {
    const startTime = Date.now()
    const errors: string[] = []
    let result: GuestExtractionResult | null = null

    // Determine extraction strategy based on cost and circuit breaker state
    const strategy = await this.determineExtractionStrategy(episodeDescription)
    
    console.log(`Episode ${episodeId}: Using ${strategy.method} for guest extraction (${strategy.reason})`)

    // Attempt primary method
    try {
      switch (strategy.method) {
        case 'bedrock':
          result = await this.attemptBedrockExtraction(episodeDescription, episodeTitle, episodeId)
          break
        case 'comprehend':
          result = await this.attemptComprehendExtraction(episodeDescription, episodeTitle, episodeId)
          break
        case 'regex':
          result = await this.attemptRegexExtraction(episodeDescription, episodeTitle, episodeId)
          break
      }
    } catch (error) {
      const errorMessage = `${strategy.method} extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMessage)
      console.error(errorMessage, error)
      
      this.recordAttempt({
        method: strategy.method,
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      })
    }

    // If primary method failed, try fallbacks
    if (!result || !result.success) {
      console.log(`Primary method failed, attempting fallbacks...`)
      
      // Try fallback methods in order of preference
      const fallbackMethods: Array<'comprehend' | 'regex'> = strategy.method === 'bedrock' 
        ? ['comprehend', 'regex'] 
        : ['regex']

      for (const fallbackMethod of fallbackMethods) {
        if (this.isMethodAvailable(fallbackMethod)) {
          try {
            console.log(`Attempting ${fallbackMethod} fallback...`)
            
            let fallbackResult: GuestExtractionResult
            switch (fallbackMethod) {
              case 'comprehend':
                fallbackResult = await this.attemptComprehendExtraction(episodeDescription, episodeTitle, episodeId)
                break
              case 'regex':
                fallbackResult = await this.attemptRegexExtraction(episodeDescription, episodeTitle, episodeId)
                break
              default:
                continue
            }

            if (fallbackResult.success) {
              result = {
                ...fallbackResult,
                fallbackUsed: true,
                errors: [...errors, ...fallbackResult.errors]
              }
              console.log(`${fallbackMethod} fallback succeeded`)
              break
            }
          } catch (fallbackError) {
            const errorMessage = `${fallbackMethod} fallback failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`
            errors.push(errorMessage)
            console.error(errorMessage)
          }
        }
      }
    }

    // If all methods failed, return empty result
    if (!result || !result.success) {
      result = {
        guests: [],
        method: 'none',
        success: false,
        fallbackUsed: true,
        errors: [...errors, 'All extraction methods failed'],
        cost: 0,
        processingTime: Date.now() - startTime
      }
    }

    // Update processing time
    result.processingTime = Date.now() - startTime
    
    console.log(`Guest extraction completed for episode ${episodeId}: ${result.guests.length} guests found using ${result.method} (${result.processingTime}ms)`)
    
    return result
  }

  /**
   * Bedrock extraction with error handling and retry logic
   */
  private async attemptBedrockExtraction(
    description: string, 
    title: string, 
    episodeId: string
  ): Promise<GuestExtractionResult> {
    
    if (!this.isMethodAvailable('bedrock')) {
      throw new Error('Bedrock circuit breaker is open')
    }

    const estimate = costManagementService.estimateBedrockCost(`${title}. ${description}`)
    const budgetCheck = await costManagementService.canProcessRequest(estimate.estimatedCost)
    
    if (!budgetCheck.allowed) {
      throw new Error(`Budget constraint: ${budgetCheck.reason}`)
    }

    const prompt = this.buildGuestExtractionPrompt(description, title)
    
    // Retry logic with exponential backoff
    let lastError: Error | null = null
    const maxRetries = 3
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.callBedrockWithTimeout(prompt, 15000) // 15 second timeout
        
        const parsed = this.parseBedrockResponse(response)
        
        // Track successful usage
        await costManagementService.trackBedrockUsage(
          estimate.inputTokens,
          estimate.outputTokens,
          episodeId
        )
        
        this.recordAttempt({
          method: 'bedrock',
          success: true,
          timestamp: Date.now(),
          cost: estimate.estimatedCost
        })

                 return {
           guests: parsed.guests.map(guest => ({
             ...guest,
             source: 'bedrock'
           })),
           method: 'bedrock',
           success: true,
           fallbackUsed: false,
           errors: [],
           cost: estimate.estimatedCost,
           processingTime: 0 // Will be set by caller
         }
        
      } catch (error) {
        lastError = error as Error
        console.warn(`Bedrock attempt ${attempt}/${maxRetries} failed:`, error)
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000
          await this.sleep(delay)
        }
      }
    }

    // All retries failed
    this.updateCircuitBreaker('bedrock', false)
    throw lastError || new Error('Bedrock extraction failed after retries')
  }

  /**
   * Comprehend extraction with error handling
   */
  private async attemptComprehendExtraction(
    description: string, 
    title: string, 
    episodeId: string
  ): Promise<GuestExtractionResult> {
    
    if (!this.isMethodAvailable('comprehend')) {
      throw new Error('Comprehend circuit breaker is open')
    }

    try {
      const fullText = `${title}. ${description}`
      
      const entitiesResult = await this.comprehendClient.send(
        new DetectEntitiesCommand({
          Text: fullText.substring(0, 5000), // Comprehend limit
          LanguageCode: 'en'
        })
      )

             const persons = entitiesResult.Entities?.filter(
         (entity: any) => entity.Type === 'PERSON' && entity.Score && entity.Score > 0.8
       ) || []

      // Apply context filtering
      const guests = this.filterAndContextualizeGuests(persons, description)

      await costManagementService.trackComprehendUsage(1, episodeId)

      this.recordAttempt({
        method: 'comprehend',
        success: true,
        timestamp: Date.now(),
        cost: 0.0001
      })

      return {
        guests: guests.map(guest => ({
          name: guest.name,
          confidence: guest.confidence,
          source: 'comprehend',
          context: guest.context
        })),
        method: 'comprehend',
        success: true,
        fallbackUsed: false,
        errors: [],
        cost: 0.0001,
        processingTime: 0
      }

    } catch (error) {
      this.updateCircuitBreaker('comprehend', false)
      throw error
    }
  }

  /**
   * Regex-based fallback extraction
   */
  private async attemptRegexExtraction(
    description: string, 
    title: string, 
    episodeId: string
  ): Promise<GuestExtractionResult> {
    
    const fullText = `${title}. ${description}`
    const guests: Array<{ name: string; confidence: number; source: string; context: string }> = []
    
    for (const pattern of GUEST_PATTERNS) {
      const matches = [...fullText.matchAll(pattern)]
      
      for (const match of matches) {
        if (match[1] && this.isValidPersonName(match[1])) {
          const existingGuest = guests.find(g => g.name.toLowerCase() === match[1].toLowerCase())
          if (!existingGuest) {
            guests.push({
              name: match[1],
              confidence: 0.6, // Lower confidence for regex
              source: 'regex',
              context: this.extractContext(match[0], fullText)
            })
          }
        }
      }
    }

    this.recordAttempt({
      method: 'regex',
      success: true,
      timestamp: Date.now(),
      cost: 0
    })

    return {
      guests,
      method: 'regex',
      success: true,
      fallbackUsed: false,
      errors: [],
      cost: 0,
      processingTime: 0
    }
  }

  /**
   * Circuit breaker pattern implementation
   */
  private initializeCircuitBreaker(service: string, config: CircuitBreakerConfig): void {
    this.circuitBreakers.set(service, {
      state: CircuitState.CLOSED,
      failureCount: 0,
      lastFailureTime: 0,
      config
    })
  }

  private isMethodAvailable(method: string): boolean {
    const breaker = this.circuitBreakers.get(method)
    if (!breaker) return true

    const now = Date.now()

    switch (breaker.state) {
      case CircuitState.CLOSED:
        return true
        
      case CircuitState.OPEN:
        if (now - breaker.lastFailureTime >= breaker.config.recoveryTimeout) {
          breaker.state = CircuitState.HALF_OPEN
          console.log(`Circuit breaker for ${method} moved to HALF_OPEN`)
          return true
        }
        return false
        
      case CircuitState.HALF_OPEN:
        return true
        
      default:
        return true
    }
  }

  private updateCircuitBreaker(service: string, success: boolean): void {
    const breaker = this.circuitBreakers.get(service)
    if (!breaker) return

    if (success) {
      if (breaker.state === CircuitState.HALF_OPEN) {
        breaker.state = CircuitState.CLOSED
        breaker.failureCount = 0
        console.log(`Circuit breaker for ${service} CLOSED after successful recovery`)
      }
    } else {
      breaker.failureCount++
      breaker.lastFailureTime = Date.now()

      if (breaker.failureCount >= breaker.config.failureThreshold) {
        breaker.state = CircuitState.OPEN
        console.log(`Circuit breaker for ${service} OPENED after ${breaker.failureCount} failures`)
      }
    }
  }

  /**
   * Determine extraction strategy based on cost, circuit breaker state, and content
   */
  private async determineExtractionStrategy(description: string): Promise<{
    method: 'bedrock' | 'comprehend' | 'regex'
    reason: string
  }> {
    
    // Check circuit breaker states
    if (!this.isMethodAvailable('bedrock')) {
      if (this.isMethodAvailable('comprehend')) {
        return { method: 'comprehend', reason: 'Bedrock circuit breaker open' }
      } else {
        return { method: 'regex', reason: 'Both AI services unavailable' }
      }
    }

    // Use cost management service to recommend method
    const recommendation = await costManagementService.recommendExtractionMethod(description)
    return {
      method: recommendation.method as 'bedrock' | 'comprehend' | 'regex',
      reason: recommendation.reason
    }
  }

  // Helper methods
  private async callBedrockWithTimeout(prompt: string, timeoutMs: number): Promise<any> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Bedrock request timeout')), timeoutMs)
    })

    const bedrockPromise = this.bedrockClient.send(new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    }))

    return Promise.race([bedrockPromise, timeoutPromise])
  }

  private buildGuestExtractionPrompt(description: string, title: string): string {
    return `Extract real people who are guests on this podcast episode.

TITLE: "${title}"
DESCRIPTION: "${description}"

Return only a JSON object:
{
  "guests": [
    {
      "name": "Full Name",
      "confidence": 0.95,
      "context": "brief context"
    }
  ]
}

Only extract confirmed real people as guests. Ignore fictional characters.`
  }

  private parseBedrockResponse(response: any): { guests: Array<{ name: string; confidence: number; context: string }> } {
    try {
      const decoded = JSON.parse(new TextDecoder().decode(response.body))
      const content = decoded.content?.[0]?.text || decoded.completion || ''
      const parsed = JSON.parse(content)
      return parsed
    } catch (error) {
      console.error('Failed to parse Bedrock response:', error)
      return { guests: [] }
    }
  }

  private filterAndContextualizeGuests(
    persons: any[], 
    description: string
  ): Array<{ name: string; confidence: number; context: string }> {
    return persons.map(person => ({
      name: person.Text || '',
      confidence: person.Score || 0,
      context: this.extractContext(person.Text || '', description)
    })).filter(guest => guest.name.length > 0)
  }

  private isValidPersonName(name: string): boolean {
    // Basic validation for person names
    const trimmed = name.trim()
    return trimmed.length >= 3 && 
           trimmed.split(' ').length >= 2 && 
           /^[A-Z][a-z]+ [A-Z]/.test(trimmed)
  }

  private extractContext(guestName: string, fullText: string): string {
    const index = fullText.toLowerCase().indexOf(guestName.toLowerCase())
    if (index === -1) return ''
    
    const start = Math.max(0, index - 50)
    const end = Math.min(fullText.length, index + guestName.length + 50)
    return fullText.substring(start, end).trim()
  }

  private recordAttempt(attempt: ExtractionAttempt): void {
    this.recentAttempts.push(attempt)
    
    // Keep only recent attempts
    if (this.recentAttempts.length > this.MAX_ATTEMPT_HISTORY) {
      this.recentAttempts.shift()
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get health metrics for monitoring
   */
  public getHealthMetrics(): {
    circuitBreakers: Record<string, any>
    recentSuccessRate: number
    averageProcessingTime: number
  } {
    const recent = this.recentAttempts.slice(-20) // Last 20 attempts
    const successRate = recent.length > 0 
      ? recent.filter(a => a.success).length / recent.length 
      : 1

    return {
      circuitBreakers: Object.fromEntries(this.circuitBreakers),
      recentSuccessRate: successRate,
      averageProcessingTime: 0 // Would calculate from recent attempts
    }
  }
}

export const robustGuestExtractionService = new RobustGuestExtractionService()