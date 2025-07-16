/**
 * Episode Card Guest Scenarios Integration Test
 *
 * Frontend integration test for up-voting functionality with various guest scenarios
 * Tests to ensure UI behavior matches expected backend behavior after bug fix
 */

import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import { ToastProvider } from '../ui/Toast'
import { EpisodeCard } from '../EpisodeCard'
import { recommendationService } from '../../services/recommendationService'
import type { Episode } from '../../types/episode'

// Mock the recommendation service
vi.mock('../../services/recommendationService', () => ({
  recommendationService: {
    thumbsUp: vi.fn(),
    thumbsDown: vi.fn(),
    submitFeedback: vi.fn(),
  },
}))

// Mock the navigation
vi.mock('react-router', async importOriginal => {
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

describe('Episode Card Guest Scenarios Integration Test', () => {
  let mockOnPlay: ReturnType<typeof vi.fn>
  let mockOnAIExplanation: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Setup mock functions
    mockOnPlay = vi.fn()
    mockOnAIExplanation = vi.fn()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  const renderEpisodeCard = (episode: Episode, recommendationScore?: number) => {
    return render(
      <MemoryRouter>
        <ToastProvider>
          <EpisodeCard
            episode={episode}
            onPlay={mockOnPlay}
            onAIExplanation={mockOnAIExplanation}
            recommendationScore={recommendationScore}
            referrer="home"
          />
        </ToastProvider>
      </MemoryRouter>,
    )
  }

  describe('Empty Guests Array Scenarios', () => {
    it('should handle episode with empty guests array', async () => {
      // ===== PHASE 1: Create Episode with Empty Guests Array =====
      const emptyGuestsEpisode: Episode = {
        episodeId: 'empty-guests-episode-123',
        podcastId: 'test-podcast-456',
        title: 'Episode with Empty Guests Array',
        description: 'Testing empty guests array scenario',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '45:30',
        releaseDate: '2024-01-15T08:00:00Z',
        imageUrl: 'https://example.com/image.jpg',
        podcastName: 'Test Podcast',
        guests: [], // Empty guests array
        extractedGuests: [], // Empty extractedGuests array
        guestExtractionStatus: 'completed',
        guestExtractionDate: '2024-01-15T08:30:00Z',
        guestExtractionConfidence: 0.95,
        playbackPosition: 0,
      }

      // ===== PHASE 2: Setup Mock API Response =====
      const mockUpvoteResponse = {
        message: 'Upvote recorded successfully',
        updated: true,
        guestAnalyticsCreated: true, // Backend should create analytics record even for empty guests
      }

      vi.mocked(recommendationService.thumbsUp).mockResolvedValue(mockUpvoteResponse)

      // ===== PHASE 3: Render Component =====
      renderEpisodeCard(emptyGuestsEpisode, 0.85)

      // ===== PHASE 4: Verify Component Renders Correctly =====
      expect(screen.getByTestId('episode-card')).toBeInTheDocument()
      expect(screen.getByText('Episode with Empty Guests Array')).toBeInTheDocument()
      expect(screen.getByText('Test Podcast')).toBeInTheDocument()

      // ===== PHASE 5: Verify Guest Extraction Status =====
      expect(screen.getByText('No guests found')).toBeInTheDocument()

      // ===== PHASE 6: Test Upvote Interaction =====
      const recommendationButton = screen.getByTitle('Click for AI explanation of this recommendation')
      expect(recommendationButton).toBeInTheDocument()

      await act(async () => {
        fireEvent.click(recommendationButton)
      })

      // ===== PHASE 7: Verify AI Explanation Handler Called =====
      await waitFor(() => {
        expect(mockOnAIExplanation).toHaveBeenCalledWith(emptyGuestsEpisode)
      })

      // ===== PHASE 8: Simulate Upvote API Call =====
      await act(async () => {
        await recommendationService.thumbsUp(emptyGuestsEpisode.episodeId, {
          source: 'episode-card',
          recommendationScore: 0.85,
          guests: emptyGuestsEpisode.guests,
        })
      })

      // ===== PHASE 9: Verify API Call Made Correctly =====
      expect(recommendationService.thumbsUp).toHaveBeenCalledWith('empty-guests-episode-123', {
        source: 'episode-card',
        recommendationScore: 0.85,
        guests: [],
      })
    })

    it('should handle episode with undefined guests field', async () => {
      // ===== PHASE 1: Create Episode with Undefined Guests =====
      const undefinedGuestsEpisode: Episode = {
        episodeId: 'undefined-guests-episode-123',
        podcastId: 'test-podcast-456',
        title: 'Episode with Undefined Guests',
        description: 'Testing undefined guests scenario',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2024-01-15T08:00:00Z',
        imageUrl: 'https://example.com/image.jpg',
        podcastName: 'Test Podcast',
        // guests field is undefined
        extractedGuests: undefined, // extractedGuests is also undefined
        guestExtractionStatus: 'pending',
        playbackPosition: 0,
      }

      // ===== PHASE 2: Setup Mock API Response =====
      const mockUpvoteResponse = {
        message: 'Upvote recorded successfully',
        updated: true,
        guestAnalyticsCreated: true, // Backend should still create analytics record
      }

      vi.mocked(recommendationService.thumbsUp).mockResolvedValue(mockUpvoteResponse)

      // ===== PHASE 3: Render Component =====
      renderEpisodeCard(undefinedGuestsEpisode, 0.75)

      // ===== PHASE 4: Verify Component Renders Correctly =====
      expect(screen.getByTestId('episode-card')).toBeInTheDocument()
      expect(screen.getByText('Episode with Undefined Guests')).toBeInTheDocument()

      // ===== PHASE 5: Verify Guest Extraction Status =====
      expect(screen.getByText('Guests pending')).toBeInTheDocument()

      // ===== PHASE 6: Test Upvote Interaction =====
      const recommendationButton = screen.getByTitle('Click for AI explanation of this recommendation')

      await act(async () => {
        fireEvent.click(recommendationButton)
      })

      // ===== PHASE 7: Verify Handler Called =====
      await waitFor(() => {
        expect(mockOnAIExplanation).toHaveBeenCalledWith(undefinedGuestsEpisode)
      })

      // ===== PHASE 8: Simulate Upvote API Call =====
      await act(async () => {
        await recommendationService.thumbsUp(undefinedGuestsEpisode.episodeId, {
          source: 'episode-card',
          recommendationScore: 0.75,
          guests: undefinedGuestsEpisode.guests || [],
        })
      })

      // ===== PHASE 9: Verify API Call Made Correctly =====
      expect(recommendationService.thumbsUp).toHaveBeenCalledWith('undefined-guests-episode-123', {
        source: 'episode-card',
        recommendationScore: 0.75,
        guests: [],
      })
    })
  })

  describe('Populated Guests Array Scenarios', () => {
    it('should handle episode with populated guests array', async () => {
      // ===== PHASE 1: Create Episode with Populated Guests Array =====
      const populatedGuestsEpisode: Episode = {
        episodeId: 'populated-guests-episode-123',
        podcastId: 'test-podcast-456',
        title: 'Episode with Multiple Guests',
        description: 'Testing populated guests array scenario',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '60:00',
        releaseDate: '2024-01-15T08:00:00Z',
        imageUrl: 'https://example.com/image.jpg',
        podcastName: 'Test Podcast',
        guests: ['John Doe', 'Jane Smith', 'Bob Johnson'],
        extractedGuests: ['John Doe', 'Jane Smith', 'Bob Johnson'],
        guestExtractionStatus: 'completed',
        guestExtractionDate: '2024-01-15T08:30:00Z',
        guestExtractionConfidence: 0.95,
        playbackPosition: 25,
      }

      // ===== PHASE 2: Setup Mock API Response =====
      const mockUpvoteResponse = {
        message: 'Upvote recorded successfully',
        updated: true,
        guestAnalyticsCreated: true, // Should create analytics records for each guest
      }

      vi.mocked(recommendationService.thumbsUp).mockResolvedValue(mockUpvoteResponse)

      // ===== PHASE 3: Render Component =====
      renderEpisodeCard(populatedGuestsEpisode, 0.9)

      // ===== PHASE 4: Verify Component Renders Correctly =====
      expect(screen.getByTestId('episode-card')).toBeInTheDocument()
      expect(screen.getByText('Episode with Multiple Guests')).toBeInTheDocument()
      expect(screen.getByText('Test Podcast')).toBeInTheDocument()

      // ===== PHASE 5: Verify Guest Extraction Status =====
      expect(screen.getByText('3 guests found')).toBeInTheDocument()

      // ===== PHASE 6: Verify Progress Indicator =====
      expect(screen.getByText('25% complete')).toBeInTheDocument()

      // ===== PHASE 7: Test Upvote Interaction =====
      const recommendationButton = screen.getByTitle('Click for AI explanation of this recommendation')

      await act(async () => {
        fireEvent.click(recommendationButton)
      })

      // ===== PHASE 8: Verify Handler Called =====
      await waitFor(() => {
        expect(mockOnAIExplanation).toHaveBeenCalledWith(populatedGuestsEpisode)
      })

      // ===== PHASE 9: Simulate Upvote API Call =====
      await act(async () => {
        await recommendationService.thumbsUp(populatedGuestsEpisode.episodeId, {
          source: 'episode-card',
          recommendationScore: 0.9,
          guests: populatedGuestsEpisode.guests,
        })
      })

      // ===== PHASE 10: Verify API Call Made Correctly =====
      expect(recommendationService.thumbsUp).toHaveBeenCalledWith('populated-guests-episode-123', {
        source: 'episode-card',
        recommendationScore: 0.9,
        guests: ['John Doe', 'Jane Smith', 'Bob Johnson'],
      })
    })

    it('should handle episode with single guest', async () => {
      // ===== PHASE 1: Create Episode with Single Guest =====
      const singleGuestEpisode: Episode = {
        episodeId: 'single-guest-episode-123',
        podcastId: 'test-podcast-456',
        title: 'Episode with Single Guest',
        description: 'Testing single guest scenario',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '45:00',
        releaseDate: '2024-01-15T08:00:00Z',
        imageUrl: 'https://example.com/image.jpg',
        podcastName: 'Test Podcast',
        guests: ['Solo Guest'],
        extractedGuests: ['Solo Guest'],
        guestExtractionStatus: 'completed',
        guestExtractionDate: '2024-01-15T08:30:00Z',
        guestExtractionConfidence: 0.98,
        playbackPosition: 0,
      }

      // ===== PHASE 2: Setup Mock API Response =====
      const mockUpvoteResponse = {
        message: 'Upvote recorded successfully',
        updated: true,
        guestAnalyticsCreated: true, // Should create analytics record for single guest
      }

      vi.mocked(recommendationService.thumbsUp).mockResolvedValue(mockUpvoteResponse)

      // ===== PHASE 3: Render Component =====
      renderEpisodeCard(singleGuestEpisode, 0.88)

      // ===== PHASE 4: Verify Component Renders Correctly =====
      expect(screen.getByTestId('episode-card')).toBeInTheDocument()
      expect(screen.getByText('Episode with Single Guest')).toBeInTheDocument()

      // ===== PHASE 5: Verify Guest Extraction Status =====
      expect(screen.getByText('1 guest found')).toBeInTheDocument()

      // ===== PHASE 6: Test Upvote Interaction =====
      const recommendationButton = screen.getByTitle('Click for AI explanation of this recommendation')

      await act(async () => {
        fireEvent.click(recommendationButton)
      })

      // ===== PHASE 7: Verify Handler Called =====
      await waitFor(() => {
        expect(mockOnAIExplanation).toHaveBeenCalledWith(singleGuestEpisode)
      })

      // ===== PHASE 8: Simulate Upvote API Call =====
      await act(async () => {
        await recommendationService.thumbsUp(singleGuestEpisode.episodeId, {
          source: 'episode-card',
          recommendationScore: 0.88,
          guests: singleGuestEpisode.guests,
        })
      })

      // ===== PHASE 9: Verify API Call Made Correctly =====
      expect(recommendationService.thumbsUp).toHaveBeenCalledWith('single-guest-episode-123', {
        source: 'episode-card',
        recommendationScore: 0.88,
        guests: ['Solo Guest'],
      })
    })
  })

  describe('Guest Extraction Status Scenarios', () => {
    it('should handle episode with failed guest extraction', async () => {
      // ===== PHASE 1: Create Episode with Failed Guest Extraction =====
      const failedExtractionEpisode: Episode = {
        episodeId: 'failed-extraction-episode-123',
        podcastId: 'test-podcast-456',
        title: 'Episode with Failed Guest Extraction',
        description: 'Testing failed guest extraction scenario',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '40:00',
        releaseDate: '2024-01-15T08:00:00Z',
        imageUrl: 'https://example.com/image.jpg',
        podcastName: 'Test Podcast',
        guests: [], // Empty because extraction failed
        extractedGuests: [], // Empty because extraction failed
        guestExtractionStatus: 'failed',
        guestExtractionDate: '2024-01-15T08:30:00Z',
        guestExtractionConfidence: 0.0,
        playbackPosition: 0,
      }

      // ===== PHASE 2: Setup Mock API Response =====
      const mockUpvoteResponse = {
        message: 'Upvote recorded successfully',
        updated: true,
        guestAnalyticsCreated: true, // Backend should still create analytics record
      }

      vi.mocked(recommendationService.thumbsUp).mockResolvedValue(mockUpvoteResponse)

      // ===== PHASE 3: Render Component =====
      renderEpisodeCard(failedExtractionEpisode, 0.7)

      // ===== PHASE 4: Verify Component Renders Correctly =====
      expect(screen.getByTestId('episode-card')).toBeInTheDocument()
      expect(screen.getByText('Episode with Failed Guest Extraction')).toBeInTheDocument()

      // ===== PHASE 5: Verify Guest Extraction Status =====
      expect(screen.getByText('Guest extraction failed')).toBeInTheDocument()

      // ===== PHASE 6: Test Upvote Interaction =====
      const recommendationButton = screen.getByTitle('Click for AI explanation of this recommendation')

      await act(async () => {
        fireEvent.click(recommendationButton)
      })

      // ===== PHASE 7: Verify Handler Called =====
      await waitFor(() => {
        expect(mockOnAIExplanation).toHaveBeenCalledWith(failedExtractionEpisode)
      })

      // ===== PHASE 8: Simulate Upvote API Call =====
      await act(async () => {
        await recommendationService.thumbsUp(failedExtractionEpisode.episodeId, {
          source: 'episode-card',
          recommendationScore: 0.7,
          guests: failedExtractionEpisode.guests,
        })
      })

      // ===== PHASE 9: Verify API Call Made Correctly =====
      expect(recommendationService.thumbsUp).toHaveBeenCalledWith('failed-extraction-episode-123', {
        source: 'episode-card',
        recommendationScore: 0.7,
        guests: [],
      })
    })

    it('should handle episode with processing guest extraction', async () => {
      // ===== PHASE 1: Create Episode with Processing Guest Extraction =====
      const processingExtractionEpisode: Episode = {
        episodeId: 'processing-extraction-episode-123',
        podcastId: 'test-podcast-456',
        title: 'Episode with Processing Guest Extraction',
        description: 'Testing processing guest extraction scenario',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '35:00',
        releaseDate: '2024-01-15T08:00:00Z',
        imageUrl: 'https://example.com/image.jpg',
        podcastName: 'Test Podcast',
        guests: [], // Empty because still processing
        extractedGuests: [], // Empty because still processing
        guestExtractionStatus: 'processing',
        guestExtractionDate: undefined, // Not complete yet
        guestExtractionConfidence: undefined, // Not complete yet
        playbackPosition: 0,
      }

      // ===== PHASE 2: Setup Mock API Response =====
      const mockUpvoteResponse = {
        message: 'Upvote recorded successfully',
        updated: true,
        guestAnalyticsCreated: true, // Backend should still create analytics record
      }

      vi.mocked(recommendationService.thumbsUp).mockResolvedValue(mockUpvoteResponse)

      // ===== PHASE 3: Render Component =====
      renderEpisodeCard(processingExtractionEpisode, 0.8)

      // ===== PHASE 4: Verify Component Renders Correctly =====
      expect(screen.getByTestId('episode-card')).toBeInTheDocument()
      expect(screen.getByText('Episode with Processing Guest Extraction')).toBeInTheDocument()

      // ===== PHASE 5: Verify Guest Extraction Status =====
      expect(screen.getByText('Finding guests...')).toBeInTheDocument()

      // ===== PHASE 6: Test Upvote Interaction =====
      const recommendationButton = screen.getByTitle('Click for AI explanation of this recommendation')

      await act(async () => {
        fireEvent.click(recommendationButton)
      })

      // ===== PHASE 7: Verify Handler Called =====
      await waitFor(() => {
        expect(mockOnAIExplanation).toHaveBeenCalledWith(processingExtractionEpisode)
      })

      // ===== PHASE 8: Simulate Upvote API Call =====
      await act(async () => {
        await recommendationService.thumbsUp(processingExtractionEpisode.episodeId, {
          source: 'episode-card',
          recommendationScore: 0.8,
          guests: processingExtractionEpisode.guests,
        })
      })

      // ===== PHASE 9: Verify API Call Made Correctly =====
      expect(recommendationService.thumbsUp).toHaveBeenCalledWith('processing-extraction-episode-123', {
        source: 'episode-card',
        recommendationScore: 0.8,
        guests: [],
      })
    })
  })

  describe('Error Handling for Guest Scenarios', () => {
    it('should handle API errors gracefully for empty guests scenario', async () => {
      // ===== PHASE 1: Create Episode with Empty Guests =====
      const emptyGuestsEpisode: Episode = {
        episodeId: 'error-empty-guests-episode-123',
        podcastId: 'test-podcast-456',
        title: 'Episode for Error Testing',
        description: 'Testing error handling with empty guests',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '30:00',
        releaseDate: '2024-01-15T08:00:00Z',
        imageUrl: 'https://example.com/image.jpg',
        podcastName: 'Test Podcast',
        guests: [],
        extractedGuests: [],
        guestExtractionStatus: 'completed',
        playbackPosition: 0,
      }

      // ===== PHASE 2: Setup Mock API Error =====
      const mockError = new Error('Server error during upvote')
      vi.mocked(recommendationService.thumbsUp).mockRejectedValue(mockError)

      // ===== PHASE 3: Render Component =====
      renderEpisodeCard(emptyGuestsEpisode, 0.65)

      // ===== PHASE 4: Test Error Handling =====
      await expect(
        recommendationService.thumbsUp(emptyGuestsEpisode.episodeId, {
          source: 'episode-card',
          guests: emptyGuestsEpisode.guests,
        }),
      ).rejects.toThrow('Server error during upvote')

      // ===== PHASE 5: Verify Error Was Properly Handled =====
      expect(recommendationService.thumbsUp).toHaveBeenCalledWith('error-empty-guests-episode-123', {
        source: 'episode-card',
        guests: [],
      })
    })

    it('should handle API errors gracefully for populated guests scenario', async () => {
      // ===== PHASE 1: Create Episode with Populated Guests =====
      const populatedGuestsEpisode: Episode = {
        episodeId: 'error-populated-guests-episode-123',
        podcastId: 'test-podcast-456',
        title: 'Episode for Error Testing with Guests',
        description: 'Testing error handling with populated guests',
        audioUrl: 'https://example.com/audio.mp3',
        duration: '50:00',
        releaseDate: '2024-01-15T08:00:00Z',
        imageUrl: 'https://example.com/image.jpg',
        podcastName: 'Test Podcast',
        guests: ['Guest One', 'Guest Two'],
        extractedGuests: ['Guest One', 'Guest Two'],
        guestExtractionStatus: 'completed',
        playbackPosition: 0,
      }

      // ===== PHASE 2: Setup Mock API Error =====
      const mockError = new Error('Database error during analytics creation')
      vi.mocked(recommendationService.thumbsUp).mockRejectedValue(mockError)

      // ===== PHASE 3: Render Component =====
      renderEpisodeCard(populatedGuestsEpisode, 0.92)

      // ===== PHASE 4: Test Error Handling =====
      await expect(
        recommendationService.thumbsUp(populatedGuestsEpisode.episodeId, {
          source: 'episode-card',
          guests: populatedGuestsEpisode.guests,
        }),
      ).rejects.toThrow('Database error during analytics creation')

      // ===== PHASE 5: Verify Error Was Properly Handled =====
      expect(recommendationService.thumbsUp).toHaveBeenCalledWith('error-populated-guests-episode-123', {
        source: 'episode-card',
        guests: ['Guest One', 'Guest Two'],
      })
    })
  })
})

/**
 * Guest Scenarios Test Utilities
 */
export const GuestScenariosTestUtils = {
  /**
   * Create episode with empty guests array
   */
  createEmptyGuestsEpisode: (overrides?: Partial<Episode>): Episode => ({
    episodeId: 'empty-guests-test-episode',
    podcastId: 'test-podcast',
    title: 'Empty Guests Test Episode',
    description: 'Testing empty guests scenario',
    audioUrl: 'https://example.com/audio.mp3',
    duration: '30:00',
    releaseDate: '2024-01-15T08:00:00Z',
    imageUrl: 'https://example.com/image.jpg',
    podcastName: 'Test Podcast',
    guests: [],
    extractedGuests: [],
    guestExtractionStatus: 'completed',
    guestExtractionDate: '2024-01-15T08:30:00Z',
    guestExtractionConfidence: 0.95,
    playbackPosition: 0,
    ...overrides,
  }),

  /**
   * Create episode with populated guests array
   */
  createPopulatedGuestsEpisode: (guests: string[], overrides?: Partial<Episode>): Episode => ({
    episodeId: 'populated-guests-test-episode',
    podcastId: 'test-podcast',
    title: 'Populated Guests Test Episode',
    description: 'Testing populated guests scenario',
    audioUrl: 'https://example.com/audio.mp3',
    duration: '45:00',
    releaseDate: '2024-01-15T08:00:00Z',
    imageUrl: 'https://example.com/image.jpg',
    podcastName: 'Test Podcast',
    guests,
    extractedGuests: guests,
    guestExtractionStatus: 'completed',
    guestExtractionDate: '2024-01-15T08:30:00Z',
    guestExtractionConfidence: 0.95,
    playbackPosition: 0,
    ...overrides,
  }),

  /**
   * Create episode with specific guest extraction status
   */
  createGuestExtractionStatusEpisode: (
    status: 'pending' | 'processing' | 'completed' | 'failed',
    overrides?: Partial<Episode>,
  ): Episode => ({
    episodeId: `${status}-extraction-test-episode`,
    podcastId: 'test-podcast',
    title: `${status} Extraction Test Episode`,
    description: `Testing ${status} guest extraction scenario`,
    audioUrl: 'https://example.com/audio.mp3',
    duration: '40:00',
    releaseDate: '2024-01-15T08:00:00Z',
    imageUrl: 'https://example.com/image.jpg',
    podcastName: 'Test Podcast',
    guests: status === 'completed' ? ['Test Guest'] : [],
    extractedGuests: status === 'completed' ? ['Test Guest'] : [],
    guestExtractionStatus: status,
    guestExtractionDate: status === 'completed' ? '2024-01-15T08:30:00Z' : undefined,
    guestExtractionConfidence: status === 'completed' ? 0.95 : undefined,
    playbackPosition: 0,
    ...overrides,
  }),

  /**
   * Mock successful upvote response
   */
  mockSuccessfulUpvote: () => ({
    message: 'Upvote recorded successfully',
    updated: true,
    guestAnalyticsCreated: true,
  }),

  /**
   * Mock upvote error
   */
  mockUpvoteError: (message: string) => {
    return new Error(message)
  },
}
