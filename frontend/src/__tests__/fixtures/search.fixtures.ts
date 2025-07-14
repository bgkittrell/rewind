import type { SearchResult } from '../types/api.types'

export const sampleSearchResults: SearchResult[] = [
  {
    episodeId: 'search-ep-1',
    podcastId: 'podcast-1',
    episodeTitle: 'Introduction to Machine Learning',
    podcastTitle: 'Tech Talk Daily',
    description: 'A beginner-friendly guide to understanding machine learning concepts...',
    releaseDate: '2024-01-10T00:00:00Z',
    imageUrl: 'https://example.com/episodes/ml-intro.jpg',
    relevanceScore: 0.98,
  },
  {
    episodeId: 'search-ep-2',
    podcastId: 'podcast-2',
    episodeTitle: 'Deep Learning Fundamentals',
    podcastTitle: 'AI Insights',
    description: 'Exploring the basics of neural networks and deep learning...',
    releaseDate: '2024-01-08T00:00:00Z',
    imageUrl: 'https://example.com/episodes/deep-learning.jpg',
    relevanceScore: 0.85,
  },
  {
    episodeId: 'search-ep-3',
    podcastId: 'podcast-1',
    episodeTitle: 'Machine Learning in Production',
    podcastTitle: 'Tech Talk Daily',
    description: 'Best practices for deploying ML models to production...',
    releaseDate: '2024-01-05T00:00:00Z',
    relevanceScore: 0.75,
  },
]

export const searchResponses = {
  machineLearnin: {
    results: sampleSearchResults,
    totalResults: 3,
    searchTime: 0.042,
  },
  noResults: {
    results: [],
    totalResults: 0,
    searchTime: 0.015,
  },
  singleResult: {
    results: [sampleSearchResults[0]],
    totalResults: 1,
    searchTime: 0.023,
  },
  manyResults: {
    results: [
      ...sampleSearchResults,
      ...sampleSearchResults.map((r, i) => ({
        ...r,
        episodeId: `${r.episodeId}-page2-${i}`,
        relevanceScore: r.relevanceScore - 0.1,
      })),
    ],
    totalResults: 25,
    searchTime: 0.067,
  },
}

export const searchQueries = {
  valid: 'machine learning',
  empty: '',
  specialChars: 'C++ programming & algorithms',
  longQuery:
    'how to build a recommendation system using collaborative filtering and content-based filtering techniques',
  noResults: 'xyzabc123notfound',
  withTypo: 'machne lerning', // Should still return results
}

export const searchFilters = {
  all: 'all',
  title: 'title',
  description: 'description',
  author: 'author',
}

export const searchScenarios = {
  // Successful search with multiple results
  multipleResults: {
    query: searchQueries.valid,
    filter: searchFilters.all,
    expectedResults: 3,
  },
  // Search with filter
  titleOnly: {
    query: 'machine',
    filter: searchFilters.title,
    expectedResults: 2,
  },
  // No results
  emptyResults: {
    query: searchQueries.noResults,
    filter: searchFilters.all,
    expectedResults: 0,
  },
  // Special characters
  specialCharacters: {
    query: searchQueries.specialChars,
    filter: searchFilters.all,
    expectedResults: 1,
  },
}
