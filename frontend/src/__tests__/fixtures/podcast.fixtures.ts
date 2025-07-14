import type { Podcast, Episode } from '../types/api.types'

// Sample podcasts
export const samplePodcasts: Podcast[] = [
  {
    podcastId: 'podcast-1',
    userId: 'test-user-123',
    title: 'The Daily Tech Talk',
    author: 'Tech News Network',
    description: 'Daily updates on the latest in technology',
    imageUrl: 'https://example.com/tech-talk.jpg',
    rssUrl: 'https://example.com/tech-talk.rss',
    categories: ['Technology', 'News'],
    createdAt: '2024-01-01T00:00:00Z',
    lastFetched: '2024-01-15T00:00:00Z',
  },
  {
    podcastId: 'podcast-2',
    userId: 'test-user-123',
    title: 'Science Weekly',
    author: 'Science Magazine',
    description: 'Weekly deep dives into scientific discoveries',
    imageUrl: 'https://example.com/science-weekly.jpg',
    rssUrl: 'https://example.com/science-weekly.rss',
    categories: ['Science', 'Education'],
    createdAt: '2024-01-05T00:00:00Z',
    lastFetched: '2024-01-15T00:00:00Z',
  },
]

// Sample episodes
export const sampleEpisodes: Episode[] = [
  {
    episodeId: 'episode-1',
    podcastId: 'podcast-1',
    title: 'AI Revolution in 2024',
    description: 'Exploring the latest developments in artificial intelligence',
    audioUrl: 'https://example.com/episodes/ai-revolution.mp3',
    duration: '45:30',
    releaseDate: '2024-01-15T00:00:00Z',
    imageUrl: 'https://example.com/episodes/ai-revolution.jpg',
    guests: ['Dr. Sarah Johnson', 'Prof. Michael Chen'],
    tags: ['AI', 'Technology', 'Future'],
  },
  {
    episodeId: 'episode-2',
    podcastId: 'podcast-1',
    title: 'Quantum Computing Breakthrough',
    description: 'New advances in quantum computing technology',
    audioUrl: 'https://example.com/episodes/quantum-computing.mp3',
    duration: '38:45',
    releaseDate: '2024-01-14T00:00:00Z',
    imageUrl: 'https://example.com/episodes/quantum-computing.jpg',
    tags: ['Quantum', 'Computing', 'Physics'],
  },
  {
    episodeId: 'episode-3',
    podcastId: 'podcast-2',
    title: 'Climate Change: Latest Research',
    description: 'Recent findings on global climate patterns',
    audioUrl: 'https://example.com/episodes/climate-change.mp3',
    duration: '52:15',
    releaseDate: '2024-01-10T00:00:00Z',
    guests: ['Dr. Emily Watson'],
    tags: ['Climate', 'Environment', 'Research'],
  },
]

// Test RSS URLs
export const testRssUrls = {
  valid: 'https://example.com/valid-podcast.rss',
  invalid: 'not-a-valid-url',
  notFound: 'https://example.com/404.rss',
  existing: 'https://example.com/existing.rss',
  malformed: 'https://example.com/malformed.rss',
}

// API responses
export const podcastResponses = {
  addSuccess: {
    podcast: samplePodcasts[0],
    episodeCount: 25,
  },
  listSuccess: {
    podcasts: samplePodcasts,
  },
  alreadyExists: {
    error: 'Podcast already exists',
    details: 'You have already added this podcast',
  },
  invalidRss: {
    error: 'Invalid RSS feed',
    details: 'Unable to parse RSS feed',
  },
  notFound: {
    error: 'RSS feed not found',
    details: 'The RSS URL returned 404',
  },
}

export const episodeResponses = {
  listSuccess: {
    episodes: sampleEpisodes.filter(e => e.podcastId === 'podcast-1'),
  },
  listWithPagination: {
    episodes: sampleEpisodes.filter(e => e.podcastId === 'podcast-1'),
    lastEvaluatedKey: 'next-page-key',
  },
  progressSaved: {
    message: 'Progress saved',
  },
  podcastNotFound: {
    error: 'Podcast not found',
  },
}

// Playback progress test data
export const playbackProgress = {
  episode1: {
    position: 1230, // 20:30
    duration: 2730, // 45:30
  },
  episode2: {
    position: 0,
    duration: 2325, // 38:45
  },
  completed: {
    position: 2700, // 45:00
    duration: 2730, // 45:30
  },
}
