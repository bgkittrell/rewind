import { EpisodeCard } from '../components/EpisodeCard'
import { useMediaPlayer } from '../context/MediaPlayerContext'

// Sample data for development
const sampleEpisodes = [
  {
    id: '1',
    title: 'The Comedy Gold Mine: Rediscovering Classic Bits',
    podcastName: 'Laugh Track Weekly',
    releaseDate: '2023-08-15',
    duration: '45 min',
    audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
    imageUrl: 'https://via.placeholder.com/80x80/eb4034/ffffff?text=LTW',
    description: 'A deep dive into comedy history with classic bits and timeless humor.',
    playbackPosition: 0,
  },
  {
    id: '2',
    title: 'Interview with Sarah Johnson: The Art of Improvisation',
    podcastName: 'Behind the Mic',
    releaseDate: '2023-06-22',
    duration: '38 min',
    audioUrl: 'https://file-examples.com/storage/fe86a1e166e06f51de4b5bf/2017/11/file_example_MP3_700KB.mp3',
    imageUrl: 'https://via.placeholder.com/80x80/26a69a/ffffff?text=BTM',
    description: 'Exploring the world of improv comedy with industry veteran Sarah Johnson.',
  },
  {
    id: '3',
    title: 'Stand-Up Chronicles: From Open Mic to Main Stage',
    podcastName: 'Comedy Circuit',
    releaseDate: '2023-05-30',
    duration: '52 min',
    audioUrl: 'https://www.kozco.com/tech/LRMonoPhase4.mp3',
    imageUrl: 'https://via.placeholder.com/80x80/9c27b0/ffffff?text=CC',
    description: 'The journey of comedians from their first open mic to headlining shows.',
  },
  {
    id: '4',
    title: 'The Psychology of Humor: What Makes Us Laugh?',
    podcastName: 'Mind & Comedy',
    releaseDate: '2023-04-18',
    duration: '41 min',
    audioUrl: 'https://www.kozco.com/tech/piano2-CoolEdit-16bitPCM.mp3',
    imageUrl: 'https://via.placeholder.com/80x80/ff9800/ffffff?text=MC',
    description: 'A scientific look at humor and its effects on the human brain.',
  },
]

export default function Home() {
  const { playEpisode, state } = useMediaPlayer()
  
  // Debug logging
  console.log('MediaPlayer state:', state)

  const handlePlay = (episode: {
    id: string
    title: string
    podcastName: string
    releaseDate: string
    duration: string
    audioUrl?: string
    imageUrl?: string
    description?: string
    playbackPosition?: number
  }) => {
    console.log('handlePlay called with:', episode)
    playEpisode(episode)
    console.log('MediaPlayer state after playEpisode:', state)
  }

  const handleAIExplanation = (episode: {
    id: string
    title: string
    podcastName: string
    releaseDate: string
    duration: string
    audioUrl?: string
    imageUrl?: string
    description?: string
    playbackPosition?: number
  }) => {
    console.log('Getting AI explanation for:', episode.title)
    // TODO: Implement AI explanation modal
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Recommended Episodes</h1>
        <p className="text-gray-600">Rediscover older episodes from your favorite podcasts</p>
      </div>

      {/* Debug info */}
      <div className="mb-4 p-2 bg-gray-100 rounded text-sm text-gray-700">
        <strong>Debug:</strong> Current episode: {state.currentEpisode?.title || 'None'} |
        Playing: {state.isPlaying ? 'Yes' : 'No'}
      </div>

      {/* Filter Pills */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <span className="inline-block bg-primary text-white px-3 py-1 rounded-full text-sm whitespace-nowrap">
            Not Recent
          </span>
          <span className="inline-block bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm whitespace-nowrap">
            Comedy
          </span>
          <span className="inline-block bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm whitespace-nowrap">
            Favorites
          </span>
        </div>
      </div>

      {/* Episode Cards */}
      <div className="space-y-4">
        {sampleEpisodes.map((episode) => (
          <EpisodeCard
            key={episode.id}
            episode={episode}
            onPlay={handlePlay}
            onAIExplanation={handleAIExplanation}
          />
        ))}
      </div>
    </div>
  )
}
