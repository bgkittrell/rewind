import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

interface ValidationResult {
  isValid: boolean
  normalized: string
  confidence: number
  issues: string[]
  suggestions?: string[]
}

interface GuestNameVariation {
  canonical: string
  variations: string[]
  verified: boolean
  profession?: string
  popularity: number
  lastUpdated: string
}

interface ProfanityCheckResult {
  isProfane: boolean
  filteredText: string
  flaggedWords: string[]
}

// Common name prefixes and suffixes to handle
const NAME_PREFIXES = ['dr', 'prof', 'mr', 'ms', 'mrs', 'miss', 'sir', 'lady', 'lord']
const NAME_SUFFIXES = ['jr', 'sr', 'ii', 'iii', 'iv', 'md', 'phd', 'esq']

// Common problematic patterns
const PROFANITY_PATTERNS = [
  // Basic profanity filter - in production, use a more comprehensive service
  /\b(damn|hell|crap)\b/gi,
  // Add more patterns as needed
]

// Celebrity/public figure indicators
const PUBLIC_FIGURE_INDICATORS = [
  'comedian', 'actor', 'actress', 'director', 'producer', 'author', 'writer',
  'singer', 'musician', 'artist', 'politician', 'ceo', 'founder', 'host',
  'journalist', 'reporter', 'doctor', 'professor', 'researcher'
]

export class GuestValidationService {
  private dynamoClient: DynamoDBClient
  private readonly GUEST_NAMES_TABLE = (process as any).env.GUEST_NAMES_TABLE || 'RewindGuestNames'
  private readonly VALIDATION_CACHE = new Map<string, ValidationResult>()
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

  constructor() {
    this.dynamoClient = new DynamoDBClient({ region: (process as any).env.AWS_REGION })
  }

  /**
   * Comprehensive guest name validation and normalization
   */
  async validateAndNormalizeGuest(
    rawName: string, 
    context?: string, 
    confidence?: number
  ): Promise<ValidationResult> {
    // Check cache first
    const cacheKey = `${rawName.toLowerCase()}_${context || ''}`
    if (this.VALIDATION_CACHE.has(cacheKey)) {
      const cached = this.VALIDATION_CACHE.get(cacheKey)!
      // Check if cache is still valid
      if (Date.now() - (cached as any).timestamp < this.CACHE_TTL) {
        return cached
      }
    }

    const result = await this.performValidation(rawName, context, confidence)
    
    // Cache the result
    this.VALIDATION_CACHE.set(cacheKey, { ...result, timestamp: Date.now() } as any)
    
    return result
  }

  /**
   * Batch validation for multiple guest names
   */
  async validateGuestBatch(
    guests: Array<{ name: string; context?: string; confidence?: number }>
  ): Promise<Array<ValidationResult & { originalIndex: number }>> {
    const results = await Promise.all(
      guests.map(async (guest, index) => {
        const validation = await this.validateAndNormalizeGuest(
          guest.name, 
          guest.context, 
          guest.confidence
        )
        return { ...validation, originalIndex: index }
      })
    )

    // Cross-reference for duplicates
    return this.removeDuplicates(results)
  }

  /**
   * Core validation logic
   */
  private async performValidation(
    rawName: string, 
    context?: string, 
    confidence?: number
  ): Promise<ValidationResult> {
    const issues: string[] = []
    const suggestions: string[] = []
    let normalizedName = rawName.trim()
    let validationConfidence = confidence || 0.5

    // Basic format validation
    if (!this.isValidNameFormat(rawName)) {
      return {
        isValid: false,
        normalized: rawName,
        confidence: 0,
        issues: ['Invalid name format'],
        suggestions: ['Name should contain at least first and last name']
      }
    }

    // Profanity check
    const profanityCheck = this.checkProfanity(rawName)
    if (profanityCheck.isProfane) {
      return {
        isValid: false,
        normalized: rawName,
        confidence: 0,
        issues: ['Contains inappropriate content'],
        suggestions: []
      }
    }

    // Normalize the name
    normalizedName = this.normalizeName(rawName)

    // Check against known guest database
    const knownGuest = await this.checkKnownGuest(normalizedName)
    if (knownGuest) {
      validationConfidence = Math.max(validationConfidence, 0.9)
      normalizedName = knownGuest.canonical
      
      if (!knownGuest.verified) {
        issues.push('Guest not verified in database')
        validationConfidence *= 0.8
      }
    }

    // Context validation
    const contextValidation = this.validateWithContext(normalizedName, context)
    validationConfidence *= contextValidation.confidenceMultiplier
    issues.push(...contextValidation.issues)
    suggestions.push(...contextValidation.suggestions)

    // Public figure likelihood
    const publicFigureCheck = this.assessPublicFigureLikelihood(normalizedName, context)
    validationConfidence *= publicFigureCheck.multiplier
    issues.push(...publicFigureCheck.issues)

    // Final validation
    const isValid = validationConfidence >= 0.6 && issues.length === 0

    return {
      isValid,
      normalized: normalizedName,
      confidence: Math.min(validationConfidence, 1.0),
      issues,
      suggestions
    }
  }

  /**
   * Basic name format validation
   */
  private isValidNameFormat(name: string): boolean {
    const trimmed = name.trim()
    
    // Must be at least 3 characters
    if (trimmed.length < 3) return false
    
    // Must contain at least 2 words
    const words = trimmed.split(/\s+/)
    if (words.length < 2) return false
    
    // Each word should start with capital letter
    const validWordPattern = /^[A-Z][a-z-']+$/
    return words.every(word => validWordPattern.test(word))
  }

  /**
   * Normalize name format
   */
  private normalizeName(rawName: string): string {
    let normalized = rawName.trim()
    
    // Handle common prefixes
    for (const prefix of NAME_PREFIXES) {
      const prefixPattern = new RegExp(`^${prefix}\\.?\\s+`, 'i')
      normalized = normalized.replace(prefixPattern, '')
    }
    
    // Handle common suffixes
    for (const suffix of NAME_SUFFIXES) {
      const suffixPattern = new RegExp(`\\s+${suffix}\\.?$`, 'i')
      normalized = normalized.replace(suffixPattern, '')
    }
    
    // Proper case
    normalized = normalized
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
    
    // Handle hyphenated names
    normalized = normalized.replace(/-([a-z])/g, (match, letter) => `-${letter.toUpperCase()}`)
    
    // Handle apostrophes (O'Connor, D'Angelo)
    normalized = normalized.replace(/'([a-z])/g, (match, letter) => `'${letter.toUpperCase()}`)
    
    return normalized
  }

  /**
   * Check for profanity and inappropriate content
   */
  private checkProfanity(text: string): ProfanityCheckResult {
    const flaggedWords: string[] = []
    let filteredText = text
    let isProfane = false
    
    for (const pattern of PROFANITY_PATTERNS) {
      const matches = text.match(pattern)
      if (matches) {
        isProfane = true
        flaggedWords.push(...matches)
        filteredText = filteredText.replace(pattern, '[FILTERED]')
      }
    }
    
    return { isProfane, filteredText, flaggedWords }
  }

  /**
   * Check against known guest database
   */
  private async checkKnownGuest(normalizedName: string): Promise<GuestNameVariation | null> {
    const params = {
      TableName: this.GUEST_NAMES_TABLE,
      Key: marshall({ normalizedName: normalizedName.toLowerCase() })
    }

    try {
      const result = await this.dynamoClient.send(new GetItemCommand(params))
      
      if (result.Item) {
        return unmarshall(result.Item) as GuestNameVariation
      }
      
      // Check variations
      return await this.checkNameVariations(normalizedName)
      
    } catch (error) {
      console.error('Error checking known guest:', error)
      return null
    }
  }

  /**
   * Check name variations and common aliases
   */
  private async checkNameVariations(name: string): Promise<GuestNameVariation | null> {
    // Generate common variations
    const variations = this.generateNameVariations(name)
    
    for (const variation of variations) {
      const params = {
        TableName: this.GUEST_NAMES_TABLE,
        FilterExpression: 'contains(variations, :variation)',
        ExpressionAttributeValues: marshall({ ':variation': variation })
      }

      try {
        const result = await this.dynamoClient.send(new QueryCommand(params))
        if (result.Items && result.Items.length > 0) {
          return unmarshall(result.Items[0]) as GuestNameVariation
        }
      } catch (error) {
        console.error('Error checking name variations:', error)
      }
    }
    
    return null
  }

  /**
   * Generate common name variations
   */
  private generateNameVariations(name: string): string[] {
    const variations: string[] = []
    const parts = name.split(' ')
    
    if (parts.length >= 2) {
      const [first, ...rest] = parts
      const last = rest.join(' ')
      
      // Common variations
      variations.push(
        `${first} ${last}`,
        `${first.charAt(0)}. ${last}`,
        `${first} ${last.charAt(0)}.`,
        `${last}, ${first}`,
        first, // Just first name for celebrities
        last   // Just last name for celebrities
      )
      
      // Handle middle names/initials
      if (parts.length > 2) {
        variations.push(`${first} ${parts[parts.length - 1]}`) // First + Last, skip middle
      }
    }
    
    return variations.filter(v => v.length >= 2)
  }

  /**
   * Validate name using context clues
   */
  private validateWithContext(
    name: string, 
    context?: string
  ): { confidenceMultiplier: number; issues: string[]; suggestions: string[] } {
    
    if (!context) {
      return { 
        confidenceMultiplier: 0.8, 
        issues: ['No context provided'], 
        suggestions: ['Context helps improve validation accuracy'] 
      }
    }
    
    const issues: string[] = []
    const suggestions: string[] = []
    let multiplier = 1.0
    
    // Check for profession indicators
    const professionIndicators = PUBLIC_FIGURE_INDICATORS.filter(indicator => 
      context.toLowerCase().includes(indicator)
    )
    
    if (professionIndicators.length > 0) {
      multiplier += 0.2 // Boost confidence for professional context
    }
    
    // Check for interview/guest indicators
    const guestIndicators = ['interview', 'guest', 'featuring', 'with', 'joins us']
    const hasGuestIndicator = guestIndicators.some(indicator => 
      context.toLowerCase().includes(indicator)
    )
    
    if (hasGuestIndicator) {
      multiplier += 0.1
    } else {
      issues.push('Context does not clearly indicate guest appearance')
      multiplier *= 0.9
    }
    
    // Check for character vs real person indicators
    const characterIndicators = ['plays', 'character', 'role', 'portrays', 'as']
    const hasCharacterIndicator = characterIndicators.some(indicator => 
      context.toLowerCase().includes(indicator)
    )
    
    if (hasCharacterIndicator) {
      issues.push('Context suggests this might be a character name, not a real person')
      multiplier *= 0.7
      suggestions.push('Verify this is a real person, not a fictional character')
    }
    
    return { confidenceMultiplier: multiplier, issues, suggestions }
  }

  /**
   * Assess likelihood of being a public figure
   */
  private assessPublicFigureLikelihood(
    name: string, 
    context?: string
  ): { multiplier: number; issues: string[] } {
    
    const issues: string[] = []
    let multiplier = 1.0
    
    // Check name against common patterns
    const parts = name.split(' ')
    
    // Very short or very long names are suspicious
    if (parts.length === 1) {
      issues.push('Single name might be incomplete')
      multiplier *= 0.7
    } else if (parts.length > 4) {
      issues.push('Very long name might contain titles or extra information')
      multiplier *= 0.8
    }
    
    // Check for common names (lower likelihood of being famous)
    const commonFirstNames = ['john', 'mary', 'james', 'jennifer', 'michael', 'jessica']
    const commonLastNames = ['smith', 'johnson', 'williams', 'brown', 'jones', 'garcia']
    
    if (parts.length >= 2) {
      const firstName = parts[0].toLowerCase()
      const lastName = parts[parts.length - 1].toLowerCase()
      
      if (commonFirstNames.includes(firstName) && commonLastNames.includes(lastName)) {
        multiplier *= 0.8
        issues.push('Very common name - verify identity')
      }
    }
    
    return { multiplier, issues }
  }

  /**
   * Remove duplicates from batch validation results
   */
  private removeDuplicates(
    results: Array<ValidationResult & { originalIndex: number }>
  ): Array<ValidationResult & { originalIndex: number }> {
    
    const seen = new Set<string>()
    const deduplicated: Array<ValidationResult & { originalIndex: number }> = []
    
    for (const result of results) {
      const key = result.normalized.toLowerCase()
      
      if (!seen.has(key)) {
        seen.add(key)
        deduplicated.push(result)
      } else {
        // Mark as duplicate
        const duplicate = { 
          ...result, 
          isValid: false, 
          issues: [...result.issues, 'Duplicate name in batch'] 
        }
        deduplicated.push(duplicate)
      }
    }
    
    return deduplicated
  }

  /**
   * Add a new verified guest to the database
   */
  async addVerifiedGuest(
    guestInfo: {
      name: string
      variations?: string[]
      profession?: string
      verified?: boolean
    }
  ): Promise<void> {
    const normalized = this.normalizeName(guestInfo.name)
    
    const guestRecord: GuestNameVariation = {
      canonical: normalized,
      variations: guestInfo.variations || [guestInfo.name, normalized],
      verified: guestInfo.verified ?? true,
      profession: guestInfo.profession,
      popularity: 1,
      lastUpdated: new Date().toISOString()
    }
    
    const params = {
      TableName: this.GUEST_NAMES_TABLE,
      Item: marshall({
        normalizedName: normalized.toLowerCase(),
        ...guestRecord
      })
    }
    
    await this.dynamoClient.send(new PutItemCommand(params))
    console.log(`Added verified guest: ${normalized}`)
  }

  /**
   * Get validation statistics for monitoring
   */
  getValidationStats(): {
    cacheSize: number
    recentValidations: number
    averageConfidence: number
  } {
    const recentValidations = Array.from(this.VALIDATION_CACHE.values())
    const totalConfidence = recentValidations.reduce((sum, result) => sum + result.confidence, 0)
    
    return {
      cacheSize: this.VALIDATION_CACHE.size,
      recentValidations: recentValidations.length,
      averageConfidence: recentValidations.length > 0 ? totalConfidence / recentValidations.length : 0
    }
  }
}

export const guestValidationService = new GuestValidationService()