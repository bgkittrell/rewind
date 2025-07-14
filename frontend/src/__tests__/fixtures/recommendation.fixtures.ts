import type { RecommendationScore } from '../types/api.types'

export const sampleRecommendations: RecommendationScore[] = [
  {
    episodeId: 'rec-episode-1',
    podcastId: 'podcast-1',
    score: 0.95,
    reasons: [
      'Based on your listening history',
      'Similar to episodes you enjoyed',
      'Popular in your favorite categories',
    ],
    factors: {
      content_similarity: 0.9,
      listening_history: 0.85,
      popularity: 0.8,
    },
    episode: {
      episodeId: 'rec-episode-1',
      podcastId: 'podcast-1',
      title: 'The Future of AI in Healthcare',
      podcastName: 'Tech Talk Daily',
      releaseDate: '2024-01-20T00:00:00Z',
      duration: '42:30',
      audioUrl: 'https://example.com/episodes/ai-healthcare.mp3',
      imageUrl: 'https://example.com/episodes/ai-healthcare.jpg',
      description: 'Exploring how AI is revolutionizing healthcare...',
      playbackPosition: 0,
    },
  },
  {
    episodeId: 'rec-episode-2',
    podcastId: 'podcast-3',
    score: 0.88,
    reasons: ['Trending in Technology', 'High engagement from similar users'],
    factors: {
      content_similarity: 0.75,
      listening_history: 0.7,
      popularity: 0.95,
    },
    episode: {
      episodeId: 'rec-episode-2',
      podcastId: 'podcast-3',
      title: 'Cybersecurity Best Practices 2024',
      podcastName: 'Security Now',
      releaseDate: '2024-01-18T00:00:00Z',
      duration: '55:00',
      audioUrl: 'https://example.com/episodes/cybersecurity.mp3',
      imageUrl: 'https://example.com/episodes/cybersecurity.jpg',
      description: 'Essential security practices for the modern digital age...',
      playbackPosition: 300, // 5 minutes in
    },
  },
  {
    episodeId: 'rec-episode-3',
    podcastId: 'podcast-2',
    score: 0.82,
    reasons: ['New episode from subscribed podcast', 'Matches your interests'],
    factors: {
      content_similarity: 0.8,
      listening_history: 0.9,
      popularity: 0.6,
    },
    episode: {
      episodeId: 'rec-episode-3',
      podcastId: 'podcast-2',
      title: 'Understanding Quantum Mechanics',
      podcastName: 'Science Weekly',
      releaseDate: '2024-01-15T00:00:00Z',
      duration: '48:20',
      audioUrl: 'https://example.com/episodes/quantum.mp3',
      description: 'A deep dive into the weird world of quantum mechanics...',
    },
  },
]

export const recommendationResponses = {
  success: {
    recommendations: sampleRecommendations,
  },
  empty: {
    recommendations: [],
  },
  feedbackSuccess: {
    message: 'Feedback recorded',
  },
  playTracked: {
    message: 'Play event tracked',
  },
}

export const recommendationFilters = {
  notRecent: 'not_recent',
  mostRecent: 'most_recent',
  highScore: 'high_score',
  popular: 'popular',
}

export const feedbackScenarios = {
  thumbsUp: {
    episodeId: 'rec-episode-1',
    feedback: 'up' as const,
  },
  thumbsDown: {
    episodeId: 'rec-episode-2',
    feedback: 'down' as const,
  },
}

export const playContexts = {
  homeRecommendations: {
    source: 'home_recommendations',
    filter: 'not_recent',
    score: 0.95,
  },
  searchResults: {
    source: 'search_results',
  },
  podcastPage: {
    source: 'podcast_page',
  },
}
