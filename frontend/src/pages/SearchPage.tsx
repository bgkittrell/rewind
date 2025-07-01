import { useState, useMemo } from 'react'
import { IconSearch, IconX, IconFilter } from '@tabler/icons-react'
import { EpisodeCard } from '../components/EpisodeCard'
import { usePlayer } from '../context/PlayerContext'
import { sampleEpisodes } from '../data/sampleEpisodes'
import { samplePodcasts } from '../data/samplePodcasts'
import { Episode } from '../types/episode'

type SearchFilter = 'all' | 'episodes' | 'podcasts'

export function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all')
  const [showFilters, setShowFilters] = useState(false)
  const player = usePlayer()

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return { episodes: [], podcasts: [] }
    }

    const query = searchQuery.toLowerCase()

    // Search episodes
    const matchingEpisodes = sampleEpisodes.filter(episode => {
      return (
        episode.title.toLowerCase().includes(query) ||
        episode.description?.toLowerCase().includes(query) ||
        episode.podcast.name.toLowerCase().includes(query) ||
        episode.guests?.some(guest => guest.toLowerCase().includes(query))
      )
    })

    // Search podcasts
    const matchingPodcasts = samplePodcasts.filter(podcast => {
      return (
        podcast.name.toLowerCase().includes(query) ||
        podcast.description.toLowerCase().includes(query) ||
        podcast.author.toLowerCase().includes(query) ||
        podcast.category.toLowerCase().includes(query)
      )
    })

    return { episodes: matchingEpisodes, podcasts: matchingPodcasts }
  }, [searchQuery])

  const filteredResults = useMemo(() => {
    switch (activeFilter) {
      case 'episodes':
        return { episodes: searchResults.episodes, podcasts: [] }
      case 'podcasts':
        return { episodes: [], podcasts: searchResults.podcasts }
      default:
        return searchResults
    }
  }, [searchResults, activeFilter])

  const totalResults = filteredResults.episodes.length + filteredResults.podcasts.length

  const handlePlay = (episode: Episode) => {
    player.playEpisode(episode)
  }

  const handleAIExplanation = (episode: Episode) => {
    console.log('AI explanation for episode:', episode.title)
    // TODO: Implement AI explanation functionality
  }

  const clearSearch = () => {
    setSearchQuery('')
    setActiveFilter('all')
  }

  return (
    <div className="pb-4">
      {/* Search Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search episodes, podcasts, guests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red/20 focus:border-red outline-none"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <IconX className="w-5 h-5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-lg border transition-colors ${
              showFilters ? 'bg-red text-white border-red' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <IconFilter className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        {showFilters && (
          <div className="flex gap-2 pt-3 border-t border-gray-100">
            {(['all', 'episodes', 'podcasts'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === filter
                    ? 'bg-red text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter === 'all' ? 'All Results' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchQuery ? (
        <div>
          {/* Results Header */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {totalResults === 0 ? 'No results found' : `${totalResults} result${totalResults === 1 ? '' : 's'}`}
              {searchQuery && (
                <span className="text-gray-600 font-normal"> for "{searchQuery}"</span>
              )}
            </h2>
          </div>

          {/* No Results */}
          {totalResults === 0 && (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <IconSearch className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
              <p className="text-gray-600 mb-4">
                Try searching for different keywords or check your spelling.
              </p>
              <button
                onClick={clearSearch}
                className="text-red hover:text-red-600 font-medium"
              >
                Clear search
              </button>
            </div>
          )}

          {/* Podcast Results */}
          {filteredResults.podcasts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-semibold text-gray-900 mb-3">
                Podcasts ({filteredResults.podcasts.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredResults.podcasts.map((podcast) => (
                  <div key={podcast.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
                    <img
                      src={podcast.thumbnail}
                      alt={podcast.name}
                      className="w-full aspect-square rounded-lg mb-2"
                    />
                    <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">{podcast.name}</h4>
                    <p className="text-xs text-gray-500 mb-1">{podcast.author}</p>
                    <p className="text-xs text-gray-400">{podcast.episodeCount} episodes</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Episode Results */}
          {filteredResults.episodes.length > 0 && (
            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-3">
                Episodes ({filteredResults.episodes.length})
              </h3>
              <div>
                {filteredResults.episodes.map((episode) => (
                  <EpisodeCard
                    key={episode.id}
                    episode={episode}
                    onPlay={handlePlay}
                    onAIExplanation={handleAIExplanation}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <IconSearch className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Search your podcast library</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Find episodes by title, description, podcast name, or guest names. Use the filter button to narrow your search.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p><strong>Search tips:</strong></p>
            <p>• Try searching for guest names like "John Doe"</p>
            <p>• Look for topics in episode descriptions</p>
            <p>• Filter by episodes or podcasts only</p>
          </div>
        </div>
      )}
    </div>
  )
}
