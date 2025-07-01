import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router'
import { IconArrowLeft, IconSearch, IconSortAscending, IconSortDescending } from '@tabler/icons-react'
import { samplePodcasts } from '../data/samplePodcasts'
import { sampleEpisodes } from '../data/sampleEpisodes'
import { EpisodeCard } from '../components/EpisodeCard'
import { Episode } from '../types/episode'
import { usePlayer } from '../context/PlayerContext'

const EPISODES_PER_PAGE = 10

export function PodcastDetailPage() {
  const { podcastId } = useParams()
  const player = usePlayer()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [displayedEpisodes, setDisplayedEpisodes] = useState<Episode[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef<HTMLDivElement>(null)

  // Find the podcast
  const podcast = samplePodcasts.find(p => p.id === podcastId)
  
  // Filter episodes for this podcast
  const podcastEpisodes = sampleEpisodes.filter(episode => episode.podcast.id === podcastId)

  // Get filtered and sorted episodes
  const getFilteredAndSortedEpisodes = useCallback(() => {
    let filtered = podcastEpisodes
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(episode => 
        episode.title.toLowerCase().includes(query) ||
        episode.description.toLowerCase().includes(query) ||
        episode.guests?.some(guest => guest.toLowerCase().includes(query))
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.releaseDate).getTime()
      const dateB = new Date(b.releaseDate).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })

    return filtered
  }, [podcastEpisodes, searchQuery, sortOrder])

  // Load more episodes (for infinite scroll)
  const loadMoreEpisodes = useCallback(() => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    
    // Simulate API delay
    setTimeout(() => {
      const filteredEpisodes = getFilteredAndSortedEpisodes()
      const startIndex = (currentPage - 1) * EPISODES_PER_PAGE
      const endIndex = startIndex + EPISODES_PER_PAGE
      const newEpisodes = filteredEpisodes.slice(startIndex, endIndex)
      
      if (newEpisodes.length === 0) {
        setHasMore(false)
      } else {
        setDisplayedEpisodes(prev => [...prev, ...newEpisodes])
        setCurrentPage(prev => prev + 1)
      }
      
      setIsLoading(false)
    }, 300)
  }, [currentPage, getFilteredAndSortedEpisodes, isLoading, hasMore])

  // Reset episodes when search or sort changes
  useEffect(() => {
    const filteredEpisodes = getFilteredAndSortedEpisodes()
    const firstPage = filteredEpisodes.slice(0, EPISODES_PER_PAGE)
    
    setDisplayedEpisodes(firstPage)
    setCurrentPage(2)
    setHasMore(filteredEpisodes.length > EPISODES_PER_PAGE)
  }, [getFilteredAndSortedEpisodes])

  // Infinite scroll intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasMore && !isLoading) {
          loadMoreEpisodes()
        }
      },
      { threshold: 0.1 }
    )

    if (loadingRef.current) {
      observer.observe(loadingRef.current)
    }

    return () => observer.disconnect()
  }, [loadMoreEpisodes, hasMore, isLoading])

  // Save and restore scroll position
  useEffect(() => {
    const savedScrollPosition = localStorage.getItem(`podcast-scroll-${podcastId}`)
    if (savedScrollPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPosition))
      }, 100)
    }

    const handleScroll = () => {
      localStorage.setItem(`podcast-scroll-${podcastId}`, window.scrollY.toString())
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [podcastId])

  const handlePlay = (episode: Episode) => {
    player.playEpisode(episode)
  }

  const handleAIExplanation = (episode: Episode) => {
    console.log('AI explanation for:', episode.title)
    // TODO: Implement AI explanation functionality
  }

  if (!podcast) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Podcast Not Found</h1>
        <Link to="/library" className="text-red hover:text-red-600">
          ← Back to Library
        </Link>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 p-4">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            to="/library" 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Back to library"
          >
            <IconArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 flex-1 truncate">{podcast.name}</h1>
        </div>

        {/* Search and Sort Controls */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search episodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            title={`Sort by ${sortOrder === 'newest' ? 'oldest' : 'newest'} first`}
          >
            {sortOrder === 'newest' ? (
              <IconSortDescending className="w-5 h-5" />
            ) : (
              <IconSortAscending className="w-5 h-5" />
            )}
            <span className="hidden sm:inline">
              {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
            </span>
          </button>
        </div>
      </div>

      {/* Podcast Info */}
      <div className="p-4 bg-gray-50">
        <div className="flex gap-4">
          <img
            src={podcast.thumbnail}
            alt={`${podcast.name} thumbnail`}
            className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{podcast.name}</h2>
            <p className="text-gray-600 mb-2">{podcast.description}</p>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{podcast.episodeCount} episodes</span>
              <span>•</span>
              <span>{podcast.author}</span>
              <span>•</span>
              <span>{podcast.category}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Episodes List */}
      <div className="p-4">
        {displayedEpisodes.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchQuery ? 'No episodes found matching your search.' : 'No episodes available.'}
            </p>
          </div>
        ) : (
          <>
            {displayedEpisodes.map((episode) => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                onPlay={handlePlay}
                onAIExplanation={handleAIExplanation}
              />
            ))}
            
            {/* Loading indicator for infinite scroll */}
            {hasMore && (
              <div ref={loadingRef} className="py-4 text-center">
                {isLoading ? (
                  <div className="text-gray-500">Loading more episodes...</div>
                ) : (
                  <div className="text-gray-400">Scroll for more episodes</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}