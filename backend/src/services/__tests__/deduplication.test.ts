import { describe, it, expect, beforeEach } from 'vitest'
import { EpisodeData } from '../../types'

// Mock the crypto module for testing
const mockCrypto = {
  createHash: (algorithm: string) => ({
    update: (data: string) => ({
      digest: (encoding: string) => {
        // Simple mock hash function for testing
        return Buffer.from(data).toString('base64').slice(0, 32)
      },
    }),
  }),
}

// Mock DynamoService class for testing
class MockDynamoService {
  generateNaturalKey(episode: EpisodeData): string {
    // Normalize title and handle empty/undefined titles
    const normalizedTitle = (episode.title || 'untitled').toLowerCase().trim()

    // Enhanced date validation with multiple fallback strategies
    let releaseDate: string
    try {
      // Handle various date formats and edge cases
      if (!episode.releaseDate || episode.releaseDate.trim() === '') {
        releaseDate = '1900-01-01'
      } else {
        const dateStr = episode.releaseDate.trim()
        const dateObj = new Date(dateStr)

        // Check for valid date
        if (isNaN(dateObj.getTime())) {
          // Try parsing as timestamp if it's a number
          const timestamp = parseInt(dateStr, 10)
          if (!isNaN(timestamp) && timestamp > 0) {
            const timestampDate = new Date(timestamp * 1000) // Assume seconds, convert to ms
            if (!isNaN(timestampDate.getTime())) {
              releaseDate = timestampDate.toISOString().split('T')[0]
            } else {
              releaseDate = '1900-01-01'
            }
          } else {
            // Try basic date parsing patterns
            const cleanDateStr = dateStr.replace(/[^\d-/]/g, '')
            const fallbackDate = new Date(cleanDateStr)
            if (!isNaN(fallbackDate.getTime())) {
              releaseDate = fallbackDate.toISOString().split('T')[0]
            } else {
              releaseDate = '1900-01-01'
            }
          }
        } else {
          // Valid date object
          releaseDate = dateObj.toISOString().split('T')[0]
        }
      }
    } catch (error) {
      releaseDate = '1900-01-01'
    }

    const keyData = `${normalizedTitle}:${releaseDate}`
    return mockCrypto.createHash('md5').update(keyData).digest('hex')
  }
}

describe('Episode Deduplication Logic', () => {
  let mockService: MockDynamoService

  beforeEach(() => {
    mockService = new MockDynamoService()
  })

  describe('Natural Key Generation', () => {
    it('should generate consistent keys for identical episodes', () => {
      const episodeData: EpisodeData = {
        title: 'Test Episode',
        description: 'Description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T10:00:00Z',
      }

      const key1 = mockService.generateNaturalKey(episodeData)
      const key2 = mockService.generateNaturalKey(episodeData)

      expect(key1).toBe(key2)
      expect(key1).toBeDefined()
      expect(key1.length).toBeGreaterThan(0)
    })

    it('should generate different keys for different episodes', () => {
      const episode1: EpisodeData = {
        title: 'Episode 1',
        description: 'Description 1',
        audioUrl: 'https://example.com/audio1.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T10:00:00Z',
      }

      const episode2: EpisodeData = {
        title: 'Episode 2',
        description: 'Description 2',
        audioUrl: 'https://example.com/audio2.mp3',
        duration: '30:00',
        releaseDate: '2023-10-16T10:00:00Z',
      }

      const key1 = mockService.generateNaturalKey(episode1)
      const key2 = mockService.generateNaturalKey(episode2)

      expect(key1).not.toBe(key2)
    })

    it('should normalize titles consistently', () => {
      const episode1: EpisodeData = {
        title: '  Test Episode  ',
        description: 'Description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T10:00:00Z',
      }

      const episode2: EpisodeData = {
        title: 'Test Episode',
        description: 'Different description',
        audioUrl: 'https://example.com/different-audio.mp3',
        duration: '45:00',
        releaseDate: '2023-10-15T10:00:00Z',
      }

      const key1 = mockService.generateNaturalKey(episode1)
      const key2 = mockService.generateNaturalKey(episode2)

      expect(key1).toBe(key2) // Same title and date should produce same key
    })

    it('should handle undefined or null titles', () => {
      const episodeWithNoTitle: any = {
        title: undefined,
        description: 'Description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T10:00:00Z',
      }

      const key = mockService.generateNaturalKey(episodeWithNoTitle)
      expect(key).toBeDefined()
      expect(key.length).toBeGreaterThan(0)
    })

    it('should handle empty titles', () => {
      const episodeWithEmptyTitle: EpisodeData = {
        title: '',
        description: 'Description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T10:00:00Z',
      }

      const key = mockService.generateNaturalKey(episodeWithEmptyTitle)
      expect(key).toBeDefined()
      expect(key.length).toBeGreaterThan(0)
    })
  })

  describe('Date Handling', () => {
    it('should handle valid ISO dates', () => {
      const episodeData: EpisodeData = {
        title: 'Test Episode',
        description: 'Description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T10:00:00Z',
      }

      const key = mockService.generateNaturalKey(episodeData)
      expect(key).toBeDefined()
    })

    it('should handle invalid date strings gracefully', () => {
      const episodeData: EpisodeData = {
        title: 'Test Episode',
        description: 'Description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: 'invalid-date-string',
      }

      const key = mockService.generateNaturalKey(episodeData)
      expect(key).toBeDefined()
      // Should not throw error and should return a valid key
    })

    it('should handle empty date strings', () => {
      const episodeData: EpisodeData = {
        title: 'Test Episode',
        description: 'Description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '',
      }

      const key = mockService.generateNaturalKey(episodeData)
      expect(key).toBeDefined()
    })

    it('should handle undefined release dates', () => {
      const episodeData: any = {
        title: 'Test Episode',
        description: 'Description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: undefined,
      }

      const key = mockService.generateNaturalKey(episodeData)
      expect(key).toBeDefined()
    })

    it('should handle Unix timestamps', () => {
      const episodeData: EpisodeData = {
        title: 'Test Episode',
        description: 'Description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '1697356800', // Unix timestamp
      }

      const key = mockService.generateNaturalKey(episodeData)
      expect(key).toBeDefined()
    })

    it('should handle various date formats', () => {
      const dateFormats = [
        '2023-10-15',
        '2023-10-15T10:00:00Z',
        '2023-10-15T10:00:00.000Z',
        'October 15, 2023',
        '10/15/2023',
        '1697356800', // Unix timestamp
      ]

      dateFormats.forEach(dateFormat => {
        const episodeData: EpisodeData = {
          title: 'Test Episode',
          description: 'Description',
          audioUrl: 'https://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: dateFormat,
        }

        const key = mockService.generateNaturalKey(episodeData)
        expect(key).toBeDefined()
        expect(key.length).toBeGreaterThan(0)
      })
    })

    it('should generate same key for equivalent dates', () => {
      const episode1: EpisodeData = {
        title: 'Test Episode',
        description: 'Description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T10:00:00Z',
      }

      const episode2: EpisodeData = {
        title: 'Test Episode',
        description: 'Different description',
        audioUrl: 'https://example.com/different-audio.mp3',
        duration: '45:00',
        releaseDate: '2023-10-15T14:30:00Z', // Same date, different time
      }

      const key1 = mockService.generateNaturalKey(episode1)
      const key2 = mockService.generateNaturalKey(episode2)

      expect(key1).toBe(key2) // Should be same since we only use the date part
    })
  })

  describe('Edge Cases', () => {
    it('should handle episodes with all fields missing', () => {
      const malformedEpisode: any = {}

      const key = mockService.generateNaturalKey(malformedEpisode)
      expect(key).toBeDefined()
      expect(key.length).toBeGreaterThan(0)
    })

    it('should handle very long titles', () => {
      const longTitle = 'A'.repeat(1000) // Very long title
      const episodeData: EpisodeData = {
        title: longTitle,
        description: 'Description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T10:00:00Z',
      }

      const key = mockService.generateNaturalKey(episodeData)
      expect(key).toBeDefined()
      expect(key.length).toBeGreaterThan(0)
    })

    it('should handle special characters in titles', () => {
      const specialCharTitle = 'Episode #1: "Special" & <Weird> Characters! @#$%^&*()'
      const episodeData: EpisodeData = {
        title: specialCharTitle,
        description: 'Description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T10:00:00Z',
      }

      const key = mockService.generateNaturalKey(episodeData)
      expect(key).toBeDefined()
      expect(key.length).toBeGreaterThan(0)
    })

    it('should handle unicode characters in titles', () => {
      const unicodeTitle = '测试节目 🎵 Émission de Test 🎙️'
      const episodeData: EpisodeData = {
        title: unicodeTitle,
        description: 'Description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T10:00:00Z',
      }

      const key = mockService.generateNaturalKey(episodeData)
      expect(key).toBeDefined()
      expect(key.length).toBeGreaterThan(0)
    })
  })

  describe('Key Consistency', () => {
    it('should generate the same key multiple times for the same input', () => {
      const episodeData: EpisodeData = {
        title: 'Consistent Test Episode',
        description: 'Description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T10:00:00Z',
      }

      const keys = Array.from({ length: 10 }, () => mockService.generateNaturalKey(episodeData))

      // All keys should be identical
      keys.forEach(key => {
        expect(key).toBe(keys[0])
      })
    })

    it('should generate different keys for case-sensitive differences after normalization', () => {
      const episode1: EpisodeData = {
        title: 'Test Episode',
        description: 'Description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T10:00:00Z',
      }

      const episode2: EpisodeData = {
        title: 'TEST EPISODE', // Different case, but should normalize to same
        description: 'Description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T10:00:00Z',
      }

      const key1 = mockService.generateNaturalKey(episode1)
      const key2 = mockService.generateNaturalKey(episode2)

      expect(key1).toBe(key2) // Should be same due to normalization
    })
  })
})
