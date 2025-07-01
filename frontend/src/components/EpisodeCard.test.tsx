import { render, screen, fireEvent } from '@testing-library/react'
import { EpisodeCard } from './EpisodeCard'
import { Episode } from '../types/episode'

const mockEpisode: Episode = {
  id: '1',
  title: 'Test Episode',
  podcast: {
    id: 'test-podcast',
    name: 'Test Podcast',
    thumbnail: 'https://example.com/thumbnail.jpg',
  },
  releaseDate: '2023-01-15T10:00:00Z',
  duration: 2700, // 45 minutes
  description: 'A test episode',
  audioUrl: 'https://example.com/episode.mp3',
}

describe('EpisodeCard', () => {
  const mockOnPlay = vi.fn()
  const mockOnAIExplanation = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders episode information correctly', () => {
    render(<EpisodeCard episode={mockEpisode} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

    expect(screen.getByText('Test Episode')).toBeInTheDocument()
    expect(screen.getByText('Test Podcast')).toBeInTheDocument()
    expect(screen.getByText('Jan 15, 2023')).toBeInTheDocument()
    expect(screen.getByText('45m')).toBeInTheDocument()
  })

  it('calls onPlay when play button is clicked', () => {
    render(<EpisodeCard episode={mockEpisode} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

    const playButton = screen.getByText('Play Episode')
    fireEvent.click(playButton)

    expect(mockOnPlay).toHaveBeenCalledWith(mockEpisode)
  })

  it('calls onAIExplanation when AI button is clicked', () => {
    render(<EpisodeCard episode={mockEpisode} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

    const aiButton = screen.getByLabelText('Get AI explanation')
    fireEvent.click(aiButton)

    expect(mockOnAIExplanation).toHaveBeenCalledWith(mockEpisode)
  })

  it('shows progress bar when episode has progress', () => {
    const episodeWithProgress = { ...mockEpisode, progress: 0.5 }
    render(<EpisodeCard episode={episodeWithProgress} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

    const progressBar = document.querySelector('.bg-red.h-1')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveStyle('width: 50%')
  })

  it('formats long duration correctly', () => {
    const longEpisode = { ...mockEpisode, duration: 7200 } // 2 hours
    render(<EpisodeCard episode={longEpisode} onPlay={mockOnPlay} onAIExplanation={mockOnAIExplanation} />)

    expect(screen.getByText('2h 0m')).toBeInTheDocument()
  })
})
