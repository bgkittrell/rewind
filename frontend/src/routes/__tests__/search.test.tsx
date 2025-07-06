import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Search from '../search'

// Mock react-router
const mockNavigate = vi.fn()
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock auth context
const mockUseAuth = vi.fn()
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock media player context
const mockPlayEpisode = vi.fn()
vi.mock('../../context/MediaPlayerContext', () => ({
  useMediaPlayer: () => ({
    playEpisode: mockPlayEpisode,
  }),
}))

// Mock search service
const mockSearchService = {
  searchEpisodes: vi.fn(),
  convertToEpisodeCard: vi.fn(),
}

vi.mock('../../services/searchService', () => ({
  SearchService: vi.fn().mockImplementation(() => mockSearchService),
}))

// Mock EpisodeCard component
vi.mock('../../components/EpisodeCard', () => ({
  EpisodeCard: ({ episode, onPlay, onAIExplanation }: any) => (
    <div data-testid="episode-card">
      <h3>{episode.title}</h3>
      <p>{episode.podcastName}</p>
      <button onClick={() => onPlay(episode)}>Play</button>
      <button onClick={() => onAIExplanation(episode)}>AI Explanation</button>
    </div>
  ),
}))

describe('Search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', name: 'Test User' },
      isAuthenticated: true,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders search page title and description', () => {
    render(<Search />)

    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Find episodes and podcasts in your library')).toBeInTheDocument()
  })

  it('renders search input with placeholder', () => {
    render(<Search />)

    const searchInput = screen.getByPlaceholderText('Search episodes or podcasts...')
    expect(searchInput).toBeInTheDocument()
  })

  it('shows empty state when no query is entered', () => {
    render(<Search />)

    expect(screen.getByText('Find your favorite episodes')).toBeInTheDocument()
    expect(screen.getByText('Start typing to search through your podcast library')).toBeInTheDocument()
  })

  it('shows login prompt when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    render(<Search />)

    expect(screen.getByText('Please sign in to search your podcast library')).toBeInTheDocument()
  })

  it('triggers search when user types in input', async () => {
    const mockSearchResponse = {
      results: [
        {
          episode: {
            episodeId: 'episode-1',
            podcastId: 'podcast-1',
            title: 'Test Episode',
            description: 'Test description',
            audioUrl: 'https://example.com/audio.mp3',
            duration: '30:00',
            releaseDate: '2024-01-01T00:00:00Z',
          },
          podcast: {
            podcastId: 'podcast-1',
            title: 'Test Podcast',
            imageUrl: 'https://example.com/podcast.jpg',
          },
          relevance: {
            score: 0.95,
            matchedFields: ['title'],
            highlights: { title: 'Test <mark>Episode</mark>' },
          },
        },
      ],
      total: 1,
      hasMore: false,
      searchTime: 0.123,
    }

    mockSearchService.searchEpisodes.mockResolvedValue(mockSearchResponse)
    mockSearchService.convertToEpisodeCard.mockReturnValue({
      id: 'episode-1',
      title: 'Test Episode',
      podcastName: 'Test Podcast',
      releaseDate: '2024-01-01T00:00:00Z',
      duration: '30:00',
      audioUrl: 'https://example.com/audio.mp3',
      imageUrl: 'https://example.com/podcast.jpg',
      description: 'Test description',
      podcastId: 'podcast-1',
    })

    render(<Search />)

    const searchInput = screen.getByPlaceholderText('Search episodes or podcasts...')
    fireEvent.change(searchInput, { target: { value: 'test episode' } })

    // Wait for debounced search
    await waitFor(() => {
      expect(mockSearchService.searchEpisodes).toHaveBeenCalledWith('test episode', {}, { limit: 20, offset: 0 })
    })

    // Should display search results
    await waitFor(() => {
      expect(screen.getByText('1 result found')).toBeInTheDocument()
    })
  })

  it('shows loading state during search', async () => {
    // Mock a slow search response
    mockSearchService.searchEpisodes.mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(() => resolve({ results: [], total: 0, hasMore: false, searchTime: 0 }), 100),
        ),
    )

    render(<Search />)

    const searchInput = screen.getByPlaceholderText('Search episodes or podcasts...')
    fireEvent.change(searchInput, { target: { value: 'test' } })

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Searching...')).toBeInTheDocument()
    })
  })

  it('shows no results state when search returns empty', async () => {
    mockSearchService.searchEpisodes.mockResolvedValue({
      results: [],
      total: 0,
      hasMore: false,
      searchTime: 0.05,
    })

    render(<Search />)

    const searchInput = screen.getByPlaceholderText('Search episodes or podcasts...')
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

    await waitFor(() => {
      expect(screen.getByText('No episodes found')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your search terms')).toBeInTheDocument()
    })
  })

  it('shows error state when search fails', async () => {
    mockSearchService.searchEpisodes.mockRejectedValue(new Error('Search failed'))

    render(<Search />)

    const searchInput = screen.getByPlaceholderText('Search episodes or podcasts...')
    fireEvent.change(searchInput, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText('Search Error')).toBeInTheDocument()
      expect(screen.getByText('Search failed')).toBeInTheDocument()
    })
  })

  it('clears search when clear button is clicked', async () => {
    render(<Search />)

    const searchInput = screen.getByPlaceholderText('Search episodes or podcasts...')
    fireEvent.change(searchInput, { target: { value: 'test query' } })

    // Wait for input to update
    await waitFor(() => {
      expect(searchInput).toHaveValue('test query')
    })

    // Click clear button
    const clearButton = screen.getByRole('button', { name: '' }) // Clear button with X icon
    fireEvent.click(clearButton)

    // Should clear the input
    expect(searchInput).toHaveValue('')
  })

  it('handles play episode action', async () => {
    const mockSearchResponse = {
      results: [
        {
          episode: {
            episodeId: 'episode-1',
            podcastId: 'podcast-1',
            title: 'Test Episode',
            description: 'Test description',
            audioUrl: 'https://example.com/audio.mp3',
            duration: '30:00',
            releaseDate: '2024-01-01T00:00:00Z',
          },
          podcast: {
            podcastId: 'podcast-1',
            title: 'Test Podcast',
            imageUrl: 'https://example.com/podcast.jpg',
          },
          relevance: {
            score: 0.95,
            matchedFields: ['title'],
            highlights: { title: 'Test <mark>Episode</mark>' },
          },
        },
      ],
      total: 1,
      hasMore: false,
      searchTime: 0.123,
    }

    mockSearchService.searchEpisodes.mockResolvedValue(mockSearchResponse)
    mockSearchService.convertToEpisodeCard.mockReturnValue({
      id: 'episode-1',
      title: 'Test Episode',
      podcastName: 'Test Podcast',
      releaseDate: '2024-01-01T00:00:00Z',
      duration: '30:00',
      audioUrl: 'https://example.com/audio.mp3',
      imageUrl: 'https://example.com/podcast.jpg',
      description: 'Test description',
      podcastId: 'podcast-1',
    })

    render(<Search />)

    const searchInput = screen.getByPlaceholderText('Search episodes or podcasts...')
    fireEvent.change(searchInput, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText('Test Episode')).toBeInTheDocument()
    })

    // Click play button
    const playButton = screen.getByText('Play')
    fireEvent.click(playButton)

    expect(mockPlayEpisode).toHaveBeenCalledWith({
      id: 'episode-1',
      title: 'Test Episode',
      podcastName: 'Test Podcast',
      audioUrl: 'https://example.com/audio.mp3',
      imageUrl: 'https://example.com/podcast.jpg',
      duration: '30:00',
      podcastId: 'podcast-1',
    })
  })

  it('handles AI explanation action', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const mockSearchResponse = {
      results: [
        {
          episode: {
            episodeId: 'episode-1',
            podcastId: 'podcast-1',
            title: 'Test Episode',
            description: 'Test description',
            audioUrl: 'https://example.com/audio.mp3',
            duration: '30:00',
            releaseDate: '2024-01-01T00:00:00Z',
          },
          podcast: {
            podcastId: 'podcast-1',
            title: 'Test Podcast',
            imageUrl: 'https://example.com/podcast.jpg',
          },
          relevance: {
            score: 0.95,
            matchedFields: ['title'],
            highlights: { title: 'Test <mark>Episode</mark>' },
          },
        },
      ],
      total: 1,
      hasMore: false,
      searchTime: 0.123,
    }

    mockSearchService.searchEpisodes.mockResolvedValue(mockSearchResponse)
    mockSearchService.convertToEpisodeCard.mockReturnValue({
      id: 'episode-1',
      title: 'Test Episode',
      podcastName: 'Test Podcast',
      releaseDate: '2024-01-01T00:00:00Z',
      duration: '30:00',
      audioUrl: 'https://example.com/audio.mp3',
      imageUrl: 'https://example.com/podcast.jpg',
      description: 'Test description',
      podcastId: 'podcast-1',
    })

    render(<Search />)

    const searchInput = screen.getByPlaceholderText('Search episodes or podcasts...')
    fireEvent.change(searchInput, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText('Test Episode')).toBeInTheDocument()
    })

    // Click AI explanation button
    const aiButton = screen.getByText('AI Explanation')
    fireEvent.click(aiButton)

    expect(consoleSpy).toHaveBeenCalledWith('AI explanation for:', 'Test Episode')
    consoleSpy.mockRestore()
  })

  it('shows load more button when hasMore is true', async () => {
    const mockSearchResponse = {
      results: [
        {
          episode: {
            episodeId: 'episode-1',
            podcastId: 'podcast-1',
            title: 'Test Episode',
            description: 'Test description',
            audioUrl: 'https://example.com/audio.mp3',
            duration: '30:00',
            releaseDate: '2024-01-01T00:00:00Z',
          },
          podcast: {
            podcastId: 'podcast-1',
            title: 'Test Podcast',
            imageUrl: 'https://example.com/podcast.jpg',
          },
          relevance: {
            score: 0.95,
            matchedFields: ['title'],
            highlights: { title: 'Test <mark>Episode</mark>' },
          },
        },
      ],
      total: 50,
      hasMore: true,
      searchTime: 0.123,
    }

    mockSearchService.searchEpisodes.mockResolvedValue(mockSearchResponse)
    mockSearchService.convertToEpisodeCard.mockReturnValue({
      id: 'episode-1',
      title: 'Test Episode',
      podcastName: 'Test Podcast',
      releaseDate: '2024-01-01T00:00:00Z',
      duration: '30:00',
      audioUrl: 'https://example.com/audio.mp3',
      imageUrl: 'https://example.com/podcast.jpg',
      description: 'Test description',
      podcastId: 'podcast-1',
    })

    render(<Search />)

    const searchInput = screen.getByPlaceholderText('Search episodes or podcasts...')
    fireEvent.change(searchInput, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText('Load more results')).toBeInTheDocument()
    })
  })
})
