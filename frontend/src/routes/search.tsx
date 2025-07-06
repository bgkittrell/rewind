import React, { useState, useCallback } from 'react'
import { SearchService, SearchResult, SearchFilters } from '../services/searchService'
import { EpisodeCard } from '../components/EpisodeCard'
import { useAuth } from '../context/AuthContext'
import { useMediaPlayer } from '../context/MediaPlayerContext'

const searchService = new SearchService()

interface SearchPageState {
  query: string
  results: SearchResult[]
  loading: boolean
  error: string | null
  filters: SearchFilters
  pagination: {
    offset: number
    limit: number
    total: number
    hasMore: boolean
  }
  searchTime: number
}

export default function Search() {
  const { user } = useAuth()
  const { playEpisode } = useMediaPlayer()

  const [searchState, setSearchState] = useState<SearchPageState>({
    query: '',
    results: [],
    loading: false,
    error: null,
    filters: {},
    pagination: {
      offset: 0,
      limit: 20,
      total: 0,
      hasMore: false,
    },
    searchTime: 0,
  })

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null

      return (query: string, isNewSearch: boolean = true) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        timeoutId = setTimeout(async () => {
          if (!query || query.trim().length < 2) {
            setSearchState((prev: SearchPageState) => ({
              ...prev,
              results: [],
              loading: false,
              error: null,
              pagination: { ...prev.pagination, total: 0, hasMore: false },
            }))
            return
          }

          setSearchState((prev: SearchPageState) => ({
            ...prev,
            loading: true,
            error: null,
            ...(isNewSearch && { results: [], pagination: { ...prev.pagination, offset: 0 } }),
          }))

          try {
            const pagination = isNewSearch
              ? { limit: searchState.pagination.limit, offset: 0 }
              : { limit: searchState.pagination.limit, offset: searchState.pagination.offset }

            const response = await searchService.searchEpisodes(query, searchState.filters, pagination)

            setSearchState((prev: SearchPageState) => ({
              ...prev,
              results: isNewSearch ? response.results : [...prev.results, ...response.results],
              loading: false,
              pagination: {
                ...prev.pagination,
                total: response.total,
                hasMore: response.hasMore,
                offset: isNewSearch ? response.results.length : prev.pagination.offset + response.results.length,
              },
              searchTime: response.searchTime,
            }))
          } catch (error) {
            console.error('Search failed:', error)
            setSearchState((prev: SearchPageState) => ({
              ...prev,
              loading: false,
              error: error instanceof Error ? error.message : 'Search failed',
            }))
          }
        }, 300)
      }
    })(),
    [searchState.filters, searchState.pagination.limit],
  )

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setSearchState((prev: SearchPageState) => ({ ...prev, query: newQuery }))
    debouncedSearch(newQuery, true)
  }

  // Handle load more results
  const handleLoadMore = () => {
    if (!searchState.loading && searchState.pagination.hasMore) {
      debouncedSearch(searchState.query, false)
    }
  }

  // Handle play episode
  const handlePlayEpisode = (episode: any) => {
    playEpisode({
      id: episode.id,
      title: episode.title,
      podcastName: episode.podcastName,
      audioUrl: episode.audioUrl,
      imageUrl: episode.imageUrl,
      duration: episode.duration,
      releaseDate: episode.releaseDate || new Date().toISOString(),
    })
  }

  // Handle AI explanation (placeholder)
  const handleAIExplanation = (episode: any) => {
    // TODO: Implement AI explanation functionality
    console.log('AI explanation for:', episode.title)
  }

  // Clear search
  const clearSearch = () => {
    setSearchState({
      query: '',
      results: [],
      loading: false,
      error: null,
      filters: {},
      pagination: {
        offset: 0,
        limit: 20,
        total: 0,
        hasMore: false,
      },
      searchTime: 0,
    })
  }

  // Render search results
  const renderResults = () => {
    if (!searchState.query) {
      return (
        <div className="text-center text-gray-500 py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="text-lg font-medium text-gray-900 mb-2">Find your favorite episodes</p>
          <p className="text-sm text-gray-500">Start typing to search through your podcast library</p>
        </div>
      )
    }

    if (searchState.loading && searchState.results.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Searching...</p>
        </div>
      )
    }

    if (searchState.error) {
      return (
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <p className="text-lg font-medium text-gray-900 mb-2">Search Error</p>
            <p className="text-sm text-gray-500">{searchState.error}</p>
          </div>
          <button
            onClick={() => debouncedSearch(searchState.query, true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
          >
            Try Again
          </button>
        </div>
      )
    }

    if (searchState.results.length === 0) {
      return (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.007-5.824-2.562M15 6.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-lg font-medium text-gray-900 mb-2">No episodes found</p>
          <p className="text-sm text-gray-500">Try adjusting your search terms</p>
        </div>
      )
    }

    return (
      <div className="space-y-0">
        {/* Search results header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              {searchState.pagination.total} result{searchState.pagination.total !== 1 ? 's' : ''} found
              {searchState.searchTime > 0 && ` (${searchState.searchTime.toFixed(3)}s)`}
            </p>
          </div>
          <button onClick={clearSearch} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Clear search
          </button>
        </div>

        {/* Search results */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {searchState.results.map((result, index) => (
            <EpisodeCard
              key={`${result.episode.episodeId}-${index}`}
              episode={searchService.convertToEpisodeCard(result)}
              podcastImageUrl={result.podcast.imageUrl}
              onPlay={handlePlayEpisode}
              onAIExplanation={handleAIExplanation}
            />
          ))}
        </div>

        {/* Load more button */}
        {searchState.pagination.hasMore && (
          <div className="text-center py-6">
            <button
              onClick={handleLoadMore}
              disabled={searchState.loading}
              className="bg-white border border-gray-300 px-6 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searchState.loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                  Loading...
                </div>
              ) : (
                'Load more results'
              )}
            </button>
          </div>
        )}
      </div>
    )
  }

  // Don't render if not authenticated
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Please sign in to search your podcast library</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Search</h1>
        <p className="text-gray-600">Find episodes and podcasts in your library</p>
      </div>

      {/* Search input */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchState.query}
            onChange={handleSearchChange}
            placeholder="Search episodes or podcasts..."
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            autoComplete="off"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchState.query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Search results */}
      {renderResults()}
    </div>
  )
}
