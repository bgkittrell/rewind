import { useState } from 'react'
import { EpisodeCard } from '../components/EpisodeCard'
import { Episode } from '../types/episode'
import { sampleEpisodes } from '../data/sampleEpisodes'
import { usePlayer } from '../context/PlayerContext'

type FilterType = 'all' | 'not-recent' | 'favorites' | 'favorite-guests'

export function HomePage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('not-recent')
  const [episodes] = useState<Episode[]>(sampleEpisodes)
  const player = usePlayer()

  const handlePlayEpisode = (episode: Episode) => {
    player.playEpisode(episode)
  }

  const handleAIExplanation = (episode: Episode) => {
    console.log('AI explanation for:', episode.title)
    // TODO: Implement AI explanation modal/feature
  }

  const filterButtons = [
    { id: 'not-recent' as FilterType, label: 'Not Recently Heard' },
    { id: 'favorites' as FilterType, label: 'Favorites' },
    { id: 'favorite-guests' as FilterType, label: 'Favorite Guests' },
  ]

  const filteredEpisodes = episodes.filter(episode => {
    switch (activeFilter) {
      case 'favorites':
        return episode.isFavorite
      case 'not-recent':
        // For demo, show episodes without progress or with less than 20% progress
        return !episode.progress || episode.progress < 0.2
      case 'favorite-guests':
        // For demo, show episodes with guests
        return episode.guests && episode.guests.length > 0
      default:
        return true
    }
  })

  return (
    <div>
      {/* Filter Pills */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filterButtons.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === filter.id ? 'bg-teal text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              aria-label={`Filter by ${filter.label}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Episodes List */}
      <div className="space-y-4">
        {filteredEpisodes.length > 0 ? (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recommended for You</h2>
            {filteredEpisodes.map(episode => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                onPlay={handlePlayEpisode}
                onAIExplanation={handleAIExplanation}
              />
            ))}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No episodes found for the selected filter.</p>
            <button
              onClick={() => setActiveFilter('not-recent')}
              className="mt-2 text-teal hover:text-teal-600 font-medium"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
