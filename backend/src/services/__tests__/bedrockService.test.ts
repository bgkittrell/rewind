import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { BedrockService } from '../bedrockService'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

// Mock AWS Bedrock Runtime Client
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: vi.fn(() => ({
    send: vi.fn(),
  })),
  InvokeModelCommand: vi.fn(),
}))

describe('BedrockService', () => {
  let service: BedrockService
  let mockSend: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    service = new BedrockService()
    // Get the mocked send method
    mockSend = (service as any).client.send as Mock
  })

  describe('extractGuests', () => {
    it('should extract guests successfully from valid response', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              guests: ['John Doe', 'Jane Smith'],
              confidence: 0.95,
              reasoning: 'Both names are clearly mentioned as interview guests'
            })
          }]
        }))
      }

      mockSend.mockResolvedValueOnce(mockResponse)

      const result = await service.extractGuests({
        episodeId: 'ep1',
        title: 'Interview with John Doe and Jane Smith',
        description: 'In this episode, we interview John Doe and Jane Smith about their new book.'
      })

      expect(result.guests).toEqual(['John Doe', 'Jane Smith'])
      expect(result.confidence).toBe(0.95)
      expect(result.reasoning).toBe('Both names are clearly mentioned as interview guests')
      expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('should handle empty guest list', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              guests: [],
              confidence: 0.8,
              reasoning: 'No clear guest names identified in the content'
            })
          }]
        }))
      }

      mockSend.mockResolvedValueOnce(mockResponse)

      const result = await service.extractGuests({
        episodeId: 'ep1',
        title: 'Solo Episode About Productivity',
        description: 'In this solo episode, the host discusses productivity tips.'
      })

      expect(result.guests).toEqual([])
      expect(result.confidence).toBe(0.8)
      expect(result.reasoning).toBe('No clear guest names identified in the content')
    })

    it('should normalize guest names properly', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              guests: ['john doe', 'JANE SMITH', 'bob  johnson'],
              confidence: 0.9,
              reasoning: 'Guest names found but need normalization'
            })
          }]
        }))
      }

      mockSend.mockResolvedValueOnce(mockResponse)

      const result = await service.extractGuests({
        episodeId: 'ep1',
        title: 'Interview Episode',
        description: 'Interview with guests'
      })

      expect(result.guests).toEqual(['John Doe', 'Jane Smith', 'Bob Johnson'])
    })

    it('should limit guests to maximum of 5', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              guests: ['Guest 1', 'Guest 2', 'Guest 3', 'Guest 4', 'Guest 5', 'Guest 6', 'Guest 7'],
              confidence: 0.7,
              reasoning: 'Many guests mentioned'
            })
          }]
        }))
      }

      mockSend.mockResolvedValueOnce(mockResponse)

      const result = await service.extractGuests({
        episodeId: 'ep1',
        title: 'Panel Discussion',
        description: 'Large panel discussion with many participants'
      })

      expect(result.guests).toHaveLength(5)
      expect(result.guests).toEqual(['Guest 1', 'Guest 2', 'Guest 3', 'Guest 4', 'Guest 5'])
    })

    it('should handle malformed AI response gracefully', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: 'This is not valid JSON'
          }]
        }))
      }

      mockSend.mockResolvedValueOnce(mockResponse)

      const result = await service.extractGuests({
        episodeId: 'ep1',
        title: 'Test Episode',
        description: 'Test description'
      })

      expect(result.guests).toEqual([])
      expect(result.confidence).toBe(0)
      expect(result.reasoning).toBe('Failed to parse AI response')
    })

    it('should handle AI response with markdown formatting', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: '```json\n' + JSON.stringify({
              guests: ['John Doe'],
              confidence: 0.9,
              reasoning: 'Clear guest identification'
            }) + '\n```'
          }]
        }))
      }

      mockSend.mockResolvedValueOnce(mockResponse)

      const result = await service.extractGuests({
        episodeId: 'ep1',
        title: 'Interview with John Doe',
        description: 'Interview episode'
      })

      expect(result.guests).toEqual(['John Doe'])
      expect(result.confidence).toBe(0.9)
    })

    it('should handle network errors gracefully', async () => {
      mockSend.mockRejectedValueOnce(new Error('Network error'))

      const result = await service.extractGuests({
        episodeId: 'ep1',
        title: 'Test Episode',
        description: 'Test description'
      })

      expect(result.guests).toEqual([])
      expect(result.confidence).toBe(0)
      expect(result.reasoning).toBe('Error occurred during guest extraction')
      expect(result.rawResponse).toBe('Network error')
    })

    it('should handle missing response body', async () => {
      const mockResponse = {}

      mockSend.mockResolvedValueOnce(mockResponse)

      const result = await service.extractGuests({
        episodeId: 'ep1',
        title: 'Test Episode',
        description: 'Test description'
      })

      expect(result.guests).toEqual([])
      expect(result.confidence).toBe(0)
      expect(result.reasoning).toBe('Error occurred during guest extraction')
    })

    it('should validate confidence scores within bounds', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              guests: ['John Doe'],
              confidence: 1.5, // Invalid confidence > 1
              reasoning: 'Test reasoning'
            })
          }]
        }))
      }

      mockSend.mockResolvedValueOnce(mockResponse)

      const result = await service.extractGuests({
        episodeId: 'ep1',
        title: 'Test Episode',
        description: 'Test description'
      })

      expect(result.confidence).toBe(1.0) // Should be clamped to 1.0
    })

    it('should filter out empty guest names', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              guests: ['John Doe', '', '   ', 'Jane Smith', null],
              confidence: 0.8,
              reasoning: 'Some invalid guest entries'
            })
          }]
        }))
      }

      mockSend.mockResolvedValueOnce(mockResponse)

      const result = await service.extractGuests({
        episodeId: 'ep1',
        title: 'Test Episode',
        description: 'Test description'
      })

      expect(result.guests).toEqual(['John Doe', 'Jane Smith'])
    })
  })

  describe('batchExtractGuests', () => {
    it('should process multiple requests successfully', async () => {
      const mockResponse1 = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              guests: ['John Doe'],
              confidence: 0.9,
              reasoning: 'Clear guest identification'
            })
          }]
        }))
      }

      const mockResponse2 = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              guests: ['Jane Smith'],
              confidence: 0.8,
              reasoning: 'Guest identified'
            })
          }]
        }))
      }

      mockSend
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)

      const requests = [
        {
          episodeId: 'ep1',
          title: 'Interview with John Doe',
          description: 'Interview episode'
        },
        {
          episodeId: 'ep2',
          title: 'Interview with Jane Smith',
          description: 'Another interview episode'
        }
      ]

      const results = await service.batchExtractGuests(requests)

      expect(results).toHaveLength(2)
      expect(results[0].guests).toEqual(['John Doe'])
      expect(results[1].guests).toEqual(['Jane Smith'])
      expect(mockSend).toHaveBeenCalledTimes(2)
    })

    it('should handle batch processing with some failures', async () => {
      const mockResponse1 = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              guests: ['John Doe'],
              confidence: 0.9,
              reasoning: 'Success'
            })
          }]
        }))
      }

      mockSend
        .mockResolvedValueOnce(mockResponse1)
        .mockRejectedValueOnce(new Error('Network error'))

      const requests = [
        {
          episodeId: 'ep1',
          title: 'Interview with John Doe',
          description: 'Interview episode'
        },
        {
          episodeId: 'ep2',
          title: 'Interview with Jane Smith',
          description: 'Another interview episode'
        }
      ]

      const results = await service.batchExtractGuests(requests)

      expect(results).toHaveLength(2)
      expect(results[0].guests).toEqual(['John Doe'])
      expect(results[1].guests).toEqual([])
      expect(results[1].reasoning).toBe('Error occurred during guest extraction')
    })

    it('should process batches with rate limiting delay', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              guests: ['Guest'],
              confidence: 0.8,
              reasoning: 'Test'
            })
          }]
        }))
      }

      // Mock multiple responses for batch processing
      mockSend.mockResolvedValue(mockResponse)

      const requests = Array.from({ length: 7 }, (_, i) => ({
        episodeId: `ep${i + 1}`,
        title: `Episode ${i + 1}`,
        description: `Description ${i + 1}`
      }))

      const startTime = Date.now()
      const results = await service.batchExtractGuests(requests)
      const endTime = Date.now()

      expect(results).toHaveLength(7)
      // Should have some delay between batches (batch size is 5)
      expect(endTime - startTime).toBeGreaterThan(900) // At least 900ms delay
      expect(mockSend).toHaveBeenCalledTimes(7)
    })

    it('should handle empty batch request', async () => {
      const results = await service.batchExtractGuests([])

      expect(results).toEqual([])
      expect(mockSend).not.toHaveBeenCalled()
    })
  })

  describe('prompt generation', () => {
    it('should build proper prompt structure', () => {
      const service: any = new BedrockService()
      
      const prompt = service.buildGuestExtractionPrompt(
        'Interview with John Doe',
        'In this episode, we talk with John Doe about his new book.'
      )

      expect(prompt).toContain('Interview with John Doe')
      expect(prompt).toContain('In this episode, we talk with John Doe about his new book.')
      expect(prompt).toContain('JSON format')
      expect(prompt).toContain('guests')
      expect(prompt).toContain('confidence')
      expect(prompt).toContain('reasoning')
    })
  })

  describe('name normalization', () => {
    it('should normalize guest names correctly', () => {
      const service: any = new BedrockService()
      
      expect(service.normalizeGuestName('john doe')).toBe('John Doe')
      expect(service.normalizeGuestName('JANE SMITH')).toBe('Jane Smith')
      expect(service.normalizeGuestName('bob  johnson')).toBe('Bob Johnson')
      expect(service.normalizeGuestName(' alice brown ')).toBe('Alice Brown')
      expect(service.normalizeGuestName('dr. mike wilson')).toBe('Dr. Mike Wilson')
    })
  })
})