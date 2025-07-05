import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelCommandInput } from '@aws-sdk/client-bedrock-runtime'
import { GuestExtractionRequest, GuestExtractionResult } from '../types'

export class BedrockService {
  private client: BedrockRuntimeClient
  private modelId = 'anthropic.claude-3-haiku-20240307-v1:0' // Cost-effective model for guest extraction

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    })
  }

  /**
   * Extract guest names from podcast episode title and description using AWS Bedrock
   */
  async extractGuests(request: GuestExtractionRequest): Promise<GuestExtractionResult> {
    try {
      const prompt = this.buildGuestExtractionPrompt(request.title, request.description)

      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }

      const command: InvokeModelCommandInput = {
        modelId: this.modelId,
        body: JSON.stringify(payload),
        contentType: 'application/json',
        accept: 'application/json',
      }

      const response = await this.client.send(new InvokeModelCommand(command))

      if (!response.body) {
        throw new Error('No response body from Bedrock')
      }

      const responseBody = JSON.parse(new TextDecoder().decode(response.body))
      const rawResponse = responseBody.content[0].text

      return this.parseGuestExtractionResponse(rawResponse)
    } catch (error) {
      console.error('Error extracting guests with Bedrock:', error)
      return {
        guests: [],
        confidence: 0,
        reasoning: 'Error occurred during guest extraction',
        rawResponse: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Build a structured prompt for guest extraction
   */
  private buildGuestExtractionPrompt(title: string, description: string): string {
    return `You are an expert at analyzing podcast episode information to extract guest names. 

Your task is to identify any guest names mentioned in the episode title and description. Focus on:
- People who are being interviewed or featured as guests
- Authors, experts, or notable figures mentioned by name
- Exclude hosts, regular co-hosts, or the show's main personalities
- Be conservative - only extract names when you're confident they represent guests

Episode Title: "${title}"

Episode Description: "${description}"

Please respond in the following JSON format:
{
  "guests": ["Guest Name 1", "Guest Name 2"],
  "confidence": 0.95,
  "reasoning": "Brief explanation of why these names were identified as guests"
}

Rules:
1. Return full names when possible (e.g., "John Smith" not just "John")
2. Normalize name formatting (proper capitalization)
3. Confidence should be 0.0 to 1.0 based on how certain you are
4. If no clear guests are mentioned, return empty array
5. Maximum 5 guests per episode to avoid noise
6. Exclude obvious host names or show personalities

Respond only with the JSON object, no additional text.`
  }

  /**
   * Parse the AI response and extract structured data
   */
  private parseGuestExtractionResponse(rawResponse: string): GuestExtractionResult {
    try {
      // Clean up the response (remove any markdown formatting)
      const cleanResponse = rawResponse.replace(/```json\n?|\n?```/g, '').trim()

      const parsed = JSON.parse(cleanResponse)

      // Validate the response structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid response structure')
      }

      const guests = Array.isArray(parsed.guests) ? parsed.guests : []
      const confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5
      const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : 'No reasoning provided'

      // Normalize guest names
      const normalizedGuests = guests
        .filter((guest: any) => typeof guest === 'string' && guest.trim().length > 0)
        .map((guest: string) => this.normalizeGuestName(guest))
        .slice(0, 5) // Limit to 5 guests maximum

      return {
        guests: normalizedGuests,
        confidence,
        reasoning,
        rawResponse,
      }
    } catch (error) {
      console.error('Error parsing guest extraction response:', error)
      return {
        guests: [],
        confidence: 0,
        reasoning: 'Failed to parse AI response',
        rawResponse,
      }
    }
  }

  /**
   * Normalize guest name formatting
   */
  private normalizeGuestName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\b\w+/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Proper case formatting
  }

  /**
   * Batch extract guests from multiple episodes
   */
  async batchExtractGuests(requests: GuestExtractionRequest[]): Promise<GuestExtractionResult[]> {
    const results: GuestExtractionResult[] = []

    // Process in batches to avoid rate limiting
    const batchSize = 5
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize)
      const batchPromises = batch.map(request => this.extractGuests(request))

      try {
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)

        // Add a small delay between batches to be respectful to the API
        if (i + batchSize < requests.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (error) {
        console.error(`Error processing batch starting at index ${i}:`, error)
        // Add empty results for failed batch
        results.push(
          ...batch.map(() => ({
            guests: [],
            confidence: 0,
            reasoning: 'Batch processing failed',
            rawResponse: 'Error in batch processing',
          })),
        )
      }
    }

    return results
  }
}

export const bedrockService = new BedrockService()
