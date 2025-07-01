import { Link } from 'react-router'
import { samplePodcasts } from '../data/samplePodcasts'
import { IconChevronRight } from '@tabler/icons-react'

export function LibraryPage() {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Sort podcasts by last updated date (most recent first)
  const sortedPodcasts = [...samplePodcasts].sort((a, b) => 
    new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Library</h1>
        <p className="text-gray-600">Browse your podcast subscriptions</p>
      </div>

      <div className="space-y-3">
        {sortedPodcasts.map((podcast) => (
          <Link
            key={podcast.id}
            to={`/library/podcast/${podcast.id}`}
            className="block bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              {/* Podcast Thumbnail */}
              <div className="flex-shrink-0">
                <img
                  src={podcast.thumbnail}
                  alt={`${podcast.name} thumbnail`}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              </div>

              {/* Podcast Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{podcast.name}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{podcast.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{podcast.episodeCount} episodes</span>
                      <span>•</span>
                      <span>Updated {formatDate(podcast.lastUpdated)}</span>
                      <span>•</span>
                      <span>{podcast.author}</span>
                    </div>
                  </div>

                  {/* Arrow Icon */}
                  <div className="flex-shrink-0 ml-2">
                    <IconChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
