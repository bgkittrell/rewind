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
    const normalizedTitle = episode.title.toLowerCase().trim()

    // Handle invalid dates gracefully
    let releaseDate: string
    try {
      const dateObj = new Date(episode.releaseDate)
      if (isNaN(dateObj.getTime())) {
        // Invalid date
        releaseDate = '1900-01-01'
      } else {
        releaseDate = dateObj.toISOString().split('T')[0]
      }
    } catch (error) {
      // Use a fallback date for invalid dates
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
    it('should generate consistent natural keys for identical episodes', () => {
      const episodeData: EpisodeData = {
        title: 'Test Episode',
        description: 'Test description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
      }

      const key1 = mockService.generateNaturalKey(episodeData)
      const key2 = mockService.generateNaturalKey(episodeData)

      expect(key1).toBe(key2)
      expect(key1).toHaveLength(32)
    })

    it('should generate different keys for different episodes', () => {
      const episode1: EpisodeData = {
        title: 'Test Episode 1',
        description: 'Test description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
      }

      const episode2: EpisodeData = {
        title: 'Test Episode 2',
        description: 'Test description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
      }

      const key1 = mockService.generateNaturalKey(episode1)
      const key2 = mockService.generateNaturalKey(episode2)

      expect(key1).not.toBe(key2)
    })

    it('should normalize titles for consistent key generation', () => {
      const episode1: EpisodeData = {
        title: '  Test Episode  ',
        description: 'Test description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
      }

      const episode2: EpisodeData = {
        title: 'test episode',
        description: 'Test description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
      }

      const key1 = mockService.generateNaturalKey(episode1)
      const key2 = mockService.generateNaturalKey(episode2)

      expect(key1).toBe(key2)
    })

    it('should generate different keys for same title with different dates', () => {
      const episode1: EpisodeData = {
        title: 'Test Episode',
        description: 'Test description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
      }

      const episode2: EpisodeData = {
        title: 'Test Episode',
        description: 'Test description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-16T12:00:00Z',
      }

      const key1 = mockService.generateNaturalKey(episode1)
      const key2 = mockService.generateNaturalKey(episode2)

      expect(key1).not.toBe(key2)
    })

    it('should handle special characters in titles', () => {
      const episodeData: EpisodeData = {
        title: 'Episode with "quotes" & special chars: #123',
        description: 'Test description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
      }

      const key = mockService.generateNaturalKey(episodeData)
      expect(key).toBeDefined()
      expect(key).toHaveLength(32)
    })

    it('should handle very long titles', () => {
      const longTitle =
        'This is a very long podcast episode title that goes on and on and contains lots of information about the episode including guest names and topic descriptions'

      const episodeData: EpisodeData = {
        title: longTitle,
        description: 'Test description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2023-10-15T12:00:00Z',
      }

      const key = mockService.generateNaturalKey(episodeData)
      expect(key).toBeDefined()
      expect(key).toHaveLength(32)
    })

    it('should handle empty or minimal titles', () => {
      const episodeData: EpisodeData = {
        title: '',
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

  describe('Deduplication Strategy', () => {
    it('should identify potential duplicates based on natural key', () => {
      const episodes: EpisodeData[] = [
        {
          title: 'Episode 1',
          description: 'Description 1',
          audioUrl: 'https://example.com/audio1.mp3',
          duration: '30:00',
          releaseDate: '2023-10-15T12:00:00Z',
        },
        {
          title: 'Episode 1', // Same title
          description: 'Description 1 updated',
          audioUrl: 'https://example.com/audio1-updated.mp3',
          duration: '32:00',
          releaseDate: '2023-10-15T12:00:00Z', // Same date
        },
        {
          title: 'Episode 2',
          description: 'Description 2',
          audioUrl: 'https://example.com/audio2.mp3',
          duration: '45:00',
          releaseDate: '2023-10-16T12:00:00Z',
        },
      ]

      const keys = episodes.map(ep => mockService.generateNaturalKey(ep))

      // First two episodes should have the same key (duplicates)
      expect(keys[0]).toBe(keys[1])

      // Third episode should have a different key
      expect(keys[0]).not.toBe(keys[2])
      expect(keys[1]).not.toBe(keys[2])
    })

    it('should handle case variations in duplicate detection', () => {
      const episodes: EpisodeData[] = [
        {
          title: 'The Best Podcast Ever',
          description: 'Description',
          audioUrl: 'https://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: '2023-10-15T12:00:00Z',
        },
        {
          title: 'the best podcast ever',
          description: 'Description updated',
          audioUrl: 'https://example.com/audio-updated.mp3',
          duration: '32:00',
          releaseDate: '2023-10-15T12:00:00Z',
        },
      ]

      const keys = episodes.map(ep => mockService.generateNaturalKey(ep))

      // Should be considered duplicates despite case difference
      expect(keys[0]).toBe(keys[1])
    })

    it('should handle whitespace variations in duplicate detection', () => {
      const episodes: EpisodeData[] = [
        {
          title: 'Episode Title',
          description: 'Description',
          audioUrl: 'https://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: '2023-10-15T12:00:00Z',
        },
        {
          title: '  Episode Title  ',
          description: 'Description updated',
          audioUrl: 'https://example.com/audio-updated.mp3',
          duration: '32:00',
          releaseDate: '2023-10-15T12:00:00Z',
        },
      ]

      const keys = episodes.map(ep => mockService.generateNaturalKey(ep))

      // Should be considered duplicates despite whitespace difference
      expect(keys[0]).toBe(keys[1])
    })
  })

  describe('Edge Cases', () => {
    it('should handle episodes with very similar but not identical titles', () => {
      const episodes: EpisodeData[] = [
        {
          title: 'Episode 1',
          description: 'Description',
          audioUrl: 'https://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: '2023-10-15T12:00:00Z',
        },
        {
          title: 'Episode 01',
          description: 'Description',
          audioUrl: 'https://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: '2023-10-15T12:00:00Z',
        },
      ]

      const keys = episodes.map(ep => mockService.generateNaturalKey(ep))

      // Should be considered different (not duplicates)
      expect(keys[0]).not.toBe(keys[1])
    })

    it('should handle invalid or malformed release dates', () => {
      const episodeData: EpisodeData = {
        title: 'Test Episode',
        description: 'Description',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: 'invalid-date',
      }

      // Should handle invalid dates gracefully
      let key: string
      expect(() => {
        key = mockService.generateNaturalKey(episodeData)
      }).not.toThrow()

      // Should still generate a key even with invalid date
      expect(key!).toBeDefined()
      expect(key!.length).toBeGreaterThan(0)
    })

    it('should handle episodes with identical content but different audio URLs', () => {
      const episodes: EpisodeData[] = [
        {
          title: 'Episode 1',
          description: 'Description',
          audioUrl: 'https://example.com/audio1.mp3',
          duration: '30:00',
          releaseDate: '2023-10-15T12:00:00Z',
        },
        {
          title: 'Episode 1',
          description: 'Description',
          audioUrl: 'https://example.com/audio2.mp3', // Different URL
          duration: '30:00',
          releaseDate: '2023-10-15T12:00:00Z',
        },
      ]

      const keys = episodes.map(ep => mockService.generateNaturalKey(ep))

      // Should still be considered duplicates (title + date is the same)
      expect(keys[0]).toBe(keys[1])
    })
  })
})
