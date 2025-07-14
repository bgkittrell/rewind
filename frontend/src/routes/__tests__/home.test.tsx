import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import Home from '../home';
import type { RecommendationScore } from '../../services/recommendationService';

// Mock the contexts
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../context/MediaPlayerContext', () => ({
  useMediaPlayer: vi.fn(),
}));

// Mock the recommendation service
vi.mock('../../services/recommendationService', () => ({
  recommendationService: {
    getRecommendations: vi.fn().mockResolvedValue([]),
    trackPlay: vi.fn().mockResolvedValue({}),
    thumbsUp: vi.fn().mockResolvedValue({}),
    thumbsDown: vi.fn().mockResolvedValue({}),
  },
}));

// Mock the useRecommendations hook
vi.mock('../../hooks/useRecommendations', () => ({
  useRecommendations: vi.fn(),
}));

// Mock the components
vi.mock('../../components/Home/PageHeader', () => ({
  PageHeader: () => <div data-testid="page-header">For You</div>,
}));

vi.mock('../../components/Home/FilterPills', () => ({
  FilterPills: ({ activeFilter, onFilterChange }: any) => (
    <div data-testid="filter-pills">
      <button onClick={() => onFilterChange('not_recent')} data-active={activeFilter === 'not_recent'}>
        Not Recent
      </button>
      <button onClick={() => onFilterChange('most_recent')} data-active={activeFilter === 'most_recent'}>
        Most Recent
      </button>
    </div>
  ),
}));

vi.mock('../../components/Home/LoadingSkeleton', () => ({
  LoadingSkeleton: () => <div data-testid="loading-skeleton">Loading...</div>,
}));

vi.mock('../../components/Home/ErrorMessage', () => ({
  ErrorMessage: ({ message, onRetry }: any) => (
    <div data-testid="error-message">
      <p>{message}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

vi.mock('../../components/Home/EmptyState', () => ({
  EmptyState: () => <div data-testid="empty-state">No recommendations</div>,
}));

vi.mock('../../components/Home/LoginPrompt', () => ({
  LoginPrompt: ({ onSignInClick }: any) => (
    <div data-testid="login-prompt">
      <p>Sign in to get personalized recommendations</p>
      <button onClick={onSignInClick}>Sign In</button>
    </div>
  ),
}));

vi.mock('../../components/Home/RecommendationCard', () => ({
  RecommendationCard: ({ recommendation, onPlay, onAIExplanation, onFeedback, userFeedback }: any) => (
    <div data-testid={`recommendation-${recommendation.episodeId}`}>
      <h3>{recommendation.episode.title}</h3>
      <button onClick={() => onPlay(recommendation.episode)}>Play</button>
      <button onClick={() => onAIExplanation(recommendation.episode)}>Why this?</button>
      <button onClick={() => onFeedback(recommendation.episodeId, 'up')}>Thumbs Up</button>
      <button onClick={() => onFeedback(recommendation.episodeId, 'down')}>Thumbs Down</button>
      {userFeedback && <span>Feedback: {userFeedback}</span>}
    </div>
  ),
}));

import { useAuth } from '../../context/AuthContext';
import { useMediaPlayer } from '../../context/MediaPlayerContext';
import { recommendationService } from '../../services/recommendationService';
import { useRecommendations } from '../../hooks/useRecommendations';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
});

const mockRecommendations: RecommendationScore[] = [
  {
    episodeId: 'ep1',
    podcastId: 'pod1',
    score: 0.95,
    reasons: ['Based on your listening history', 'Similar to episodes you enjoyed'],
    factors: {
      content_similarity: 0.9,
      listening_history: 0.8,
      popularity: 0.7,
    },
    episode: {
      episodeId: 'ep1',
      podcastId: 'pod1',
      title: 'Test Episode 1',
      podcastName: 'Test Podcast',
      releaseDate: '2024-01-01',
      duration: '30:00',
      audioUrl: 'https://example.com/audio1.mp3',
      imageUrl: 'https://example.com/image1.jpg',
      description: 'Test description 1',
      playbackPosition: 0,
    },
  },
  {
    episodeId: 'ep2',
    podcastId: 'pod2',
    score: 0.85,
    reasons: ['Popular in your genres', 'Trending this week'],
    factors: {
      content_similarity: 0.7,
      listening_history: 0.6,
      popularity: 0.9,
    },
    episode: {
      episodeId: 'ep2',
      podcastId: 'pod2',
      title: 'Test Episode 2',
      podcastName: 'Another Podcast',
      releaseDate: '2024-01-02',
      duration: '45:00',
      audioUrl: 'https://example.com/audio2.mp3',
      imageUrl: 'https://example.com/image2.jpg',
      description: 'Test description 2',
      playbackPosition: 100,
    },
  },
];

describe('Home', () => {
  const mockPlayEpisode = vi.fn();
  const mockLoadRecommendations = vi.fn();
  const mockHandleFilterChange = vi.fn();
  const mockHandleFeedback = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    console.log = vi.fn();
    console.error = vi.fn();
    
    (useMediaPlayer as any).mockReturnValue({
      playEpisode: mockPlayEpisode,
      currentEpisode: null,
      isPlaying: false,
    });
  });

  it('shows loading state when auth is loading', async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });
    
    (useRecommendations as any).mockReturnValue({
      recommendations: [],
      loading: true,
      error: null,
      activeFilter: 'not_recent',
      userFeedback: {},
      loadRecommendations: mockLoadRecommendations,
      handleFilterChange: mockHandleFilterChange,
      handleFeedback: mockHandleFeedback,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getAllByTestId('page-header')[0]).toBeInTheDocument();
    expect(screen.getAllByTestId('loading-skeleton')[0]).toBeInTheDocument();
  });

  it('shows login prompt when not authenticated', async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });
    
    (useRecommendations as any).mockReturnValue({
      recommendations: [],
      loading: false,
      error: null,
      activeFilter: 'not_recent',
      userFeedback: {},
      loadRecommendations: mockLoadRecommendations,
      handleFilterChange: mockHandleFilterChange,
      handleFeedback: mockHandleFeedback,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getAllByTestId('page-header')[0]).toBeInTheDocument();
    expect(screen.getAllByTestId('login-prompt')[0]).toBeInTheDocument();
    expect(screen.getByText('Sign in to get personalized recommendations')).toBeInTheDocument();
  });

  it('redirects to login when sign in button is clicked', () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });
    
    (useRecommendations as any).mockReturnValue({
      recommendations: [],
      loading: false,
      error: null,
      activeFilter: 'not_recent',
      userFeedback: {},
      loadRecommendations: mockLoadRecommendations,
      handleFilterChange: mockHandleFilterChange,
      handleFeedback: mockHandleFeedback,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByText('Sign In')[0]);
    expect(window.location.href).toBe('/login');
  });

  it('shows recommendations when authenticated', async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    
    (useRecommendations as any).mockReturnValue({
      recommendations: mockRecommendations,
      loading: false,
      error: null,
      activeFilter: 'not_recent',
      userFeedback: {},
      loadRecommendations: mockLoadRecommendations,
      handleFilterChange: mockHandleFilterChange,
      handleFeedback: mockHandleFeedback,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getAllByTestId('filter-pills')[0]).toBeInTheDocument();
    expect(screen.getAllByTestId('recommendation-ep1')[0]).toBeInTheDocument();
    expect(screen.getAllByTestId('recommendation-ep2')[0]).toBeInTheDocument();
    expect(screen.getByText('Test Episode 1')).toBeInTheDocument();
    expect(screen.getByText('Test Episode 2')).toBeInTheDocument();
  });

  it('shows loading state while fetching recommendations', async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    
    (useRecommendations as any).mockReturnValue({
      recommendations: [],
      loading: true,
      error: null,
      activeFilter: 'not_recent',
      userFeedback: {},
      loadRecommendations: mockLoadRecommendations,
      handleFilterChange: mockHandleFilterChange,
      handleFeedback: mockHandleFeedback,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getAllByTestId('loading-skeleton')[0]).toBeInTheDocument();
  });

  it('shows error message when recommendations fail to load', async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    
    (useRecommendations as any).mockReturnValue({
      recommendations: [],
      loading: false,
      error: 'Failed to fetch',
      activeFilter: 'not_recent',
      userFeedback: {},
      loadRecommendations: mockLoadRecommendations,
      handleFilterChange: mockHandleFilterChange,
      handleFeedback: mockHandleFeedback,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getAllByTestId('error-message')[0]).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
  });

  it('retries loading recommendations when retry button is clicked', async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    
    (useRecommendations as any).mockReturnValue({
      recommendations: [],
      loading: false,
      error: 'Failed to fetch',
      activeFilter: 'not_recent',
      userFeedback: {},
      loadRecommendations: mockLoadRecommendations,
      handleFilterChange: mockHandleFilterChange,
      handleFeedback: mockHandleFeedback,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByText('Retry')[0]);
    expect(mockLoadRecommendations).toHaveBeenCalled();
  });

  it('shows empty state when no recommendations', async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    
    (useRecommendations as any).mockReturnValue({
      recommendations: [],
      loading: false,
      error: null,
      activeFilter: 'not_recent',
      userFeedback: {},
      loadRecommendations: mockLoadRecommendations,
      handleFilterChange: mockHandleFilterChange,
      handleFeedback: mockHandleFeedback,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getAllByTestId('empty-state')[0]).toBeInTheDocument();
    expect(screen.getByText('No recommendations')).toBeInTheDocument();
  });

  it('handles filter changes', async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    
    (useRecommendations as any).mockReturnValue({
      recommendations: mockRecommendations,
      loading: false,
      error: null,
      activeFilter: 'not_recent',
      userFeedback: {},
      loadRecommendations: mockLoadRecommendations,
      handleFilterChange: mockHandleFilterChange,
      handleFeedback: mockHandleFeedback,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    // Initial filter should be 'not_recent'
    expect(screen.getAllByText('Not Recent')[0]).toHaveAttribute('data-active', 'true');

    // Change filter
    fireEvent.click(screen.getAllByText('Most Recent')[0]);
    expect(mockHandleFilterChange).toHaveBeenCalledWith('most_recent');
  });

  it('plays episode and tracks play event', async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    
    (useRecommendations as any).mockReturnValue({
      recommendations: mockRecommendations,
      loading: false,
      error: null,
      activeFilter: 'not_recent',
      userFeedback: {},
      loadRecommendations: mockLoadRecommendations,
      handleFilterChange: mockHandleFilterChange,
      handleFeedback: mockHandleFeedback,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    // Click play button on first recommendation
    const playButtons = screen.getAllByText('Play');
    const playButton = playButtons[0];
    fireEvent.click(playButton);

    expect(recommendationService.trackPlay).toHaveBeenCalledWith('ep1', {
      source: 'home_recommendations',
      filter: 'not_recent',
      score: 0.95,
    });

    expect(mockPlayEpisode).toHaveBeenCalledWith({
      episodeId: 'ep1',
      podcastId: 'pod1',
      title: 'Test Episode 1',
      podcastName: 'Test Podcast',
      releaseDate: '2024-01-01',
      duration: '30:00',
      audioUrl: 'https://example.com/audio1.mp3',
      imageUrl: 'https://example.com/image1.jpg',
      description: 'Test description 1',
      playbackPosition: 0,
    });
  });

  it('shows AI explanation when why this button is clicked', async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    
    (useRecommendations as any).mockReturnValue({
      recommendations: mockRecommendations,
      loading: false,
      error: null,
      activeFilter: 'not_recent',
      userFeedback: {},
      loadRecommendations: mockLoadRecommendations,
      handleFilterChange: mockHandleFilterChange,
      handleFeedback: mockHandleFeedback,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    // Click why this button
    const whyButton = screen.getAllByText('Why this?')[0];
    fireEvent.click(whyButton);

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining('Why this episode?\n\nScore: 95%')
    );
  });

  it('handles thumbs up feedback', async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    
    (useRecommendations as any).mockReturnValue({
      recommendations: mockRecommendations,
      loading: false,
      error: null,
      activeFilter: 'not_recent',
      userFeedback: {},
      loadRecommendations: mockLoadRecommendations,
      handleFilterChange: mockHandleFilterChange,
      handleFeedback: mockHandleFeedback,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    // Click thumbs up
    const thumbsUpButtons = screen.getAllByText('Thumbs Up');
    fireEvent.click(thumbsUpButtons[0]);

    expect(mockHandleFeedback).toHaveBeenCalledWith('ep1', 'up');
  });

  it('handles thumbs down feedback', async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    
    (useRecommendations as any).mockReturnValue({
      recommendations: mockRecommendations,
      loading: false,
      error: null,
      activeFilter: 'not_recent',
      userFeedback: {},
      loadRecommendations: mockLoadRecommendations,
      handleFilterChange: mockHandleFilterChange,
      handleFeedback: mockHandleFeedback,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    // Click thumbs down
    const thumbsDownButtons = screen.getAllByText('Thumbs Down');
    fireEvent.click(thumbsDownButtons[0]);

    expect(mockHandleFeedback).toHaveBeenCalledWith('ep1', 'down');
  });

  it('shows user feedback state', async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    
    (useRecommendations as any).mockReturnValue({
      recommendations: mockRecommendations,
      loading: false,
      error: null,
      activeFilter: 'not_recent',
      userFeedback: {
        'ep1': 'up',
        'ep2': 'down',
      },
      loadRecommendations: mockLoadRecommendations,
      handleFilterChange: mockHandleFilterChange,
      handleFeedback: mockHandleFeedback,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    // Should show feedback states
    const feedbackElements = screen.getAllByText(/Feedback:/);  
    expect(feedbackElements[0]).toHaveTextContent('Feedback: up');
    expect(feedbackElements[1]).toHaveTextContent('Feedback: down');
  });
});
