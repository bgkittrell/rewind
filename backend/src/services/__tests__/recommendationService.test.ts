import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { RecommendationService } from '../recommendationService'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { Episode, ListeningHistory, UserFavorites, GuestAnalytics } from '../../types'

// Mock DynamoDB client
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: vi.fn(),
    })),
  },
  QueryCommand: vi.fn(),
  GetCommand: vi.fn(),
  PutCommand: vi.fn(),
  UpdateCommand: vi.fn(),
}))

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({})),
}))

describe('RecommendationService', () => {
  let service: RecommendationService
  let mockSend: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    service = new RecommendationService()
    // Get the mocked send method
    mockSend = (service as any).client.send as Mock
  })

  describe('getRecommendations', () => {
    it('should return empty array when user has no podcasts', async () => {
      // Mock empty user podcasts
      mockSend.mockResolvedValueOnce({ Items: [] })

      const result = await service.getRecommendations('user1', 10)

      expect(result).toEqual([])
      expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('should return recommendations with correct scoring', async () => {
      const mockEpisodes: Episode[] = [
        {
          episodeId: 'ep1',
          podcastId: 'pod1',
          title: 'Episode 1',
          description: 'Description 1',
          audioUrl: 'http://example.com/audio1.mp3',
          duration: '30:00',
          releaseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          extractedGuests: ['John Doe'],
        },
        {
          episodeId: 'ep2',
          podcastId: 'pod1',
          title: 'Episode 2',
          description: 'Description 2',
          audioUrl: 'http://example.com/audio2.mp3',
          duration: '45:00',
          releaseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
          createdAt: new Date().toISOString(),
          extractedGuests: ['Jane Smith'],
        },
      ]

      const mockListeningHistory: ListeningHistory[] = [
        {
          userId: 'user1',
          episodeId: 'ep1',
          podcastId: 'pod1',
          playbackPosition: 1800,
          duration: 1800,
          isCompleted: true,
          lastPlayed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          firstPlayed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          playCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      const mockFavorites: UserFavorites[] = [
        {
          userId: 'user1',
          itemId: 'pod1',
          itemType: 'podcast',
          isFavorite: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          favoritedAt: new Date().toISOString(),
        },
      ]

      const mockGuestAnalytics: GuestAnalytics[] = [
        {
          userId: 'user1',
          guestName: 'John Doe',
          episodeIds: ['ep1'],
          listenCount: 1,
          favoriteCount: 0,
          lastListenDate: new Date().toISOString(),
          averageRating: 4.0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      // Mock database calls
      mockSend
        .mockResolvedValueOnce({ Items: [{ podcastId: 'pod1', title: 'Podcast 1' }] }) // getUserPodcasts
        .mockResolvedValueOnce({ Items: mockEpisodes }) // getEpisodesForPodcast
        .mockResolvedValueOnce({ Items: mockListeningHistory }) // getUserListeningHistory
        .mockResolvedValueOnce({ Items: mockFavorites }) // getUserFavorites
        .mockResolvedValueOnce({ Items: mockGuestAnalytics }) // getUserGuestAnalytics

      const result = await service.getRecommendations('user1', 10)

      expect(result).toHaveLength(2)
      expect(result[0].episode.episodeId).toBeDefined()
      expect(result[0].score).toBeGreaterThan(0)
      expect(result[0].reasons).toBeInstanceOf(Array)
      expect(result[0].factors).toHaveProperty('recentShowListening')
      expect(result[0].factors).toHaveProperty('newEpisodeBonus')
      expect(result[0].factors).toHaveProperty('rediscoveryBonus')
      expect(result[0].factors).toHaveProperty('guestMatchBonus')
      expect(result[0].factors).toHaveProperty('favoriteBonus')
    })
  })

  describe('scoring algorithms', () => {
    let service: any // Use any to access private methods for testing

    beforeEach(() => {
      service = new RecommendationService()
    })

    describe('calculateRecentShowListeningScore', () => {
      it('should return 1.0 for shows listened to within 7 days', () => {
        const episode: Episode = {
          episodeId: 'ep1',
          podcastId: 'pod1',
          title: 'Test Episode',
          description: 'Test Description',
          audioUrl: 'http://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        const listeningHistory: ListeningHistory[] = [
          {
            userId: 'user1',
            episodeId: 'ep2',
            podcastId: 'pod1',
            playbackPosition: 1800,
            duration: 1800,
            isCompleted: true,
            lastPlayed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
            firstPlayed: new Date().toISOString(),
            playCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]

        const score = service.calculateRecentShowListeningScore(episode, listeningHistory)
        expect(score).toBe(1.0)
      })

      it('should return 0 for shows never listened to', () => {
        const episode: Episode = {
          episodeId: 'ep1',
          podcastId: 'pod1',
          title: 'Test Episode',
          description: 'Test Description',
          audioUrl: 'http://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        const listeningHistory: ListeningHistory[] = []

        const score = service.calculateRecentShowListeningScore(episode, listeningHistory)
        expect(score).toBe(0)
      })

      it('should return decreasing scores for older listens', () => {
        const episode: Episode = {
          episodeId: 'ep1',
          podcastId: 'pod1',
          title: 'Test Episode',
          description: 'Test Description',
          audioUrl: 'http://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        const recentHistory: ListeningHistory[] = [
          {
            userId: 'user1',
            episodeId: 'ep2',
            podcastId: 'pod1',
            playbackPosition: 1800,
            duration: 1800,
            isCompleted: true,
            lastPlayed: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
            firstPlayed: new Date().toISOString(),
            playCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]

        const oldHistory: ListeningHistory[] = [
          {
            userId: 'user1',
            episodeId: 'ep2',
            podcastId: 'pod1',
            playbackPosition: 1800,
            duration: 1800,
            isCompleted: true,
            lastPlayed: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
            firstPlayed: new Date().toISOString(),
            playCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]

        const recentScore = service.calculateRecentShowListeningScore(episode, recentHistory)
        const oldScore = service.calculateRecentShowListeningScore(episode, oldHistory)

        expect(recentScore).toBeGreaterThan(oldScore)
      })
    })

    describe('calculateNewEpisodeScore', () => {
      it('should return 0 for episodes already listened to', () => {
        const episode: Episode = {
          episodeId: 'ep1',
          podcastId: 'pod1',
          title: 'Test Episode',
          description: 'Test Description',
          audioUrl: 'http://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        const listeningHistory: ListeningHistory[] = [
          {
            userId: 'user1',
            episodeId: 'ep1',
            podcastId: 'pod1',
            playbackPosition: 1800,
            duration: 1800,
            isCompleted: true,
            lastPlayed: new Date().toISOString(),
            firstPlayed: new Date().toISOString(),
            playCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]

        const score = service.calculateNewEpisodeScore(episode, listeningHistory)
        expect(score).toBe(0)
      })

      it('should return 1.0 for brand new episodes (released today)', () => {
        const episode: Episode = {
          episodeId: 'ep1',
          podcastId: 'pod1',
          title: 'Test Episode',
          description: 'Test Description',
          audioUrl: 'http://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        const listeningHistory: ListeningHistory[] = []

        const score = service.calculateNewEpisodeScore(episode, listeningHistory)
        expect(score).toBe(1.0)
      })

      it('should return decreasing scores for older episodes', () => {
        const newEpisode: Episode = {
          episodeId: 'ep1',
          podcastId: 'pod1',
          title: 'New Episode',
          description: 'Test Description',
          audioUrl: 'http://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        const oldEpisode: Episode = {
          episodeId: 'ep2',
          podcastId: 'pod1',
          title: 'Old Episode',
          description: 'Test Description',
          audioUrl: 'http://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 days ago
          createdAt: new Date().toISOString(),
        }

        const listeningHistory: ListeningHistory[] = []

        const newScore = service.calculateNewEpisodeScore(newEpisode, listeningHistory)
        const oldScore = service.calculateNewEpisodeScore(oldEpisode, listeningHistory)

        expect(newScore).toBeGreaterThan(oldScore)
      })
    })

    describe('calculateRediscoveryScore', () => {
      it('should return 0 for episodes never listened to', () => {
        const episode: Episode = {
          episodeId: 'ep1',
          podcastId: 'pod1',
          title: 'Test Episode',
          description: 'Test Description',
          audioUrl: 'http://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        const listeningHistory: ListeningHistory[] = []

        const score = service.calculateRediscoveryScore(episode, listeningHistory)
        expect(score).toBe(0)
      })

      it('should return 0 for recently listened episodes', () => {
        const episode: Episode = {
          episodeId: 'ep1',
          podcastId: 'pod1',
          title: 'Test Episode',
          description: 'Test Description',
          audioUrl: 'http://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        const listeningHistory: ListeningHistory[] = [
          {
            userId: 'user1',
            episodeId: 'ep1',
            podcastId: 'pod1',
            playbackPosition: 1800,
            duration: 1800,
            isCompleted: true,
            lastPlayed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
            firstPlayed: new Date().toISOString(),
            playCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]

        const score = service.calculateRediscoveryScore(episode, listeningHistory)
        expect(score).toBe(0)
      })

      it('should return 1.0 for episodes listened to over a year ago', () => {
        const episode: Episode = {
          episodeId: 'ep1',
          podcastId: 'pod1',
          title: 'Test Episode',
          description: 'Test Description',
          audioUrl: 'http://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        const listeningHistory: ListeningHistory[] = [
          {
            userId: 'user1',
            episodeId: 'ep1',
            podcastId: 'pod1',
            playbackPosition: 1800,
            duration: 1800,
            isCompleted: true,
            lastPlayed: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(), // 400 days ago
            firstPlayed: new Date().toISOString(),
            playCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]

        const score = service.calculateRediscoveryScore(episode, listeningHistory)
        expect(score).toBe(1.0)
      })
    })

    describe('calculateGuestMatchScore', () => {
      it('should return 0 for episodes with no guests', () => {
        const episode: Episode = {
          episodeId: 'ep1',
          podcastId: 'pod1',
          title: 'Test Episode',
          description: 'Test Description',
          audioUrl: 'http://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        const guestAnalytics: GuestAnalytics[] = []

        const score = service.calculateGuestMatchScore(episode, guestAnalytics)
        expect(score).toBe(0)
      })

      it('should return 0 for episodes with unknown guests', () => {
        const episode: Episode = {
          episodeId: 'ep1',
          podcastId: 'pod1',
          title: 'Test Episode',
          description: 'Test Description',
          audioUrl: 'http://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          extractedGuests: ['Unknown Guest'],
        }

        const guestAnalytics: GuestAnalytics[] = []

        const score = service.calculateGuestMatchScore(episode, guestAnalytics)
        expect(score).toBe(0)
      })

      it('should return positive score for episodes with known guests', () => {
        const episode: Episode = {
          episodeId: 'ep1',
          podcastId: 'pod1',
          title: 'Test Episode',
          description: 'Test Description',
          audioUrl: 'http://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          extractedGuests: ['John Doe'],
        }

        const guestAnalytics: GuestAnalytics[] = [
          {
            userId: 'user1',
            guestName: 'John Doe',
            episodeIds: ['ep2'],
            listenCount: 5,
            favoriteCount: 2,
            lastListenDate: new Date().toISOString(),
            averageRating: 4.5,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]

        const score = service.calculateGuestMatchScore(episode, guestAnalytics)
        expect(score).toBeGreaterThan(0)
        expect(score).toBeLessThanOrEqual(1)
      })
    })

    describe('calculateFavoriteScore', () => {
      it('should return 1.0 for favorited episodes', () => {
        const episode: Episode = {
          episodeId: 'ep1',
          podcastId: 'pod1',
          title: 'Test Episode',
          description: 'Test Description',
          audioUrl: 'http://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        const favorites: UserFavorites[] = [
          {
            userId: 'user1',
            itemId: 'ep1',
            itemType: 'episode',
            isFavorite: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            favoritedAt: new Date().toISOString(),
          },
        ]

        const score = service.calculateFavoriteScore(episode, favorites)
        expect(score).toBe(1.0)
      })

      it('should return 0.7 for episodes from favorited podcasts', () => {
        const episode: Episode = {
          episodeId: 'ep1',
          podcastId: 'pod1',
          title: 'Test Episode',
          description: 'Test Description',
          audioUrl: 'http://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        const favorites: UserFavorites[] = [
          {
            userId: 'user1',
            itemId: 'pod1',
            itemType: 'podcast',
            isFavorite: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            favoritedAt: new Date().toISOString(),
          },
        ]

        const score = service.calculateFavoriteScore(episode, favorites)
        expect(score).toBe(0.7)
      })

      it('should return 0 for non-favorited content', () => {
        const episode: Episode = {
          episodeId: 'ep1',
          podcastId: 'pod1',
          title: 'Test Episode',
          description: 'Test Description',
          audioUrl: 'http://example.com/audio.mp3',
          duration: '30:00',
          releaseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        const favorites: UserFavorites[] = []

        const score = service.calculateFavoriteScore(episode, favorites)
        expect(score).toBe(0)
      })
    })
  })

  describe('updateGuestAnalytics', () => {
    it('should update guest analytics for listen action', async () => {
      mockSend.mockResolvedValueOnce({})

      await service.updateGuestAnalytics('user1', 'ep1', ['John Doe'], 'listen')

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: expect.any(String),
          Key: {
            userId: 'user1',
            guestName: 'John Doe',
          },
          UpdateExpression: expect.stringContaining('ADD listenCount'),
        }),
      )
    })

    it('should update guest analytics for favorite action', async () => {
      mockSend.mockResolvedValueOnce({})

      await service.updateGuestAnalytics('user1', 'ep1', ['John Doe'], 'favorite', 5)

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: expect.any(String),
          Key: {
            userId: 'user1',
            guestName: 'John Doe',
          },
          UpdateExpression: expect.stringContaining('ADD favoriteCount'),
        }),
      )
    })

    it('should handle multiple guests', async () => {
      mockSend.mockResolvedValue({})

      await service.updateGuestAnalytics('user1', 'ep1', ['John Doe', 'Jane Smith'], 'listen')

      expect(mockSend).toHaveBeenCalledTimes(2)
    })
  })
})
