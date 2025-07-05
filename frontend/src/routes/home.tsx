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
    imageUrl: 'https://images.placeholders.dev/80x80?bgColor=%23eb4034&textColor=%23ffffff&text=LTW',
    description: 'A deep dive into comedy history with classic bits and timeless humor.',
    playbackPosition: 0,
    podcastImageUrl: 'https://images.placeholders.dev/80x80?bgColor=%23eb4034&textColor=%23ffffff&text=LTW',
  },
  {
    id: '2',
    title: 'Interview with Sarah Johnson: The Art of Improvisation',
    podcastName: 'Behind the Mic',
    releaseDate: '2023-06-22',
    duration: '38 min',
    audioUrl: 'https://file-examples.com/storage/fe86a1e166e06f51de4b5bf/2017/11/file_example_MP3_700KB.mp3',
    imageUrl: 'https://images.placeholders.dev/80x80?bgColor=%2326a69a&textColor=%23ffffff&text=BTM',
    description: 'Exploring the world of improv comedy with industry veteran Sarah Johnson.',
    podcastImageUrl: 'https://images.placeholders.dev/80x80?bgColor=%2326a69a&textColor=%23ffffff&text=BTM',
  },
  {
    id: '3',
    title: 'Stand-Up Chronicles: From Open Mic to Main Stage',
    podcastName: 'Comedy Circuit',
    releaseDate: '2023-05-30',
    duration: '52 min',
    audioUrl: 'https://www.kozco.com/tech/LRMonoPhase4.mp3',
    imageUrl: 'https://images.placeholders.dev/80x80?bgColor=%239c27b0&textColor=%23ffffff&text=CC',
    description: 'The journey of comedians from their first open mic to headlining shows.',
    podcastImageUrl: 'https://images.placeholders.dev/80x80?bgColor=%239c27b0&textColor=%23ffffff&text=CC',
  },
  {
    id: '4',
    title: 'The Psychology of Humor: What Makes Us Laugh?',
    podcastName: 'Mind & Comedy',
    releaseDate: '2023-04-18',
    duration: '41 min',
    audioUrl: 'https://www.kozco.com/tech/piano2-CoolEdit-16bitPCM.mp3',
    imageUrl: 'https://images.placeholders.dev/80x80?bgColor=%23ff9800&textColor=%23ffffff&text=MC',
    description: 'A scientific look at humor and its effects on the human brain.',
    podcastImageUrl: 'https://images.placeholders.dev/80x80?bgColor=%23ff9800&textColor=%23ffffff&text=MC',
  },
]

export default function Home() {
  const { playEpisode } = useMediaPlayer()

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
    podcastImageUrl?: string
  }) => {
    playEpisode(episode)
  }

  const handleAIExplanation = (_episode: {
    id: string
    title: string
    podcastName: string
    releaseDate: string
    duration: string
    audioUrl?: string
    imageUrl?: string
    description?: string
    playbackPosition?: number
    podcastImageUrl?: string
  }) => {
    // TODO: Implement AI explanation modal
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Header Section */}
      <div className="bg-white px-4 py-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Recommended Episodes</h1>
        <p className="text-gray-600">Rediscover older episodes from your favorite podcasts</p>
      </div>

      {/* Filter Pills */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <span className="inline-block bg-primary text-white px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
            Not Recent
          </span>
          <span className="inline-block bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap hover:bg-gray-300 transition-colors">
            Comedy
          </span>
          <span className="inline-block bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap hover:bg-gray-300 transition-colors">
            Favorites
          </span>
        </div>
      </div>

      {/* Episode Cards */}
      <div className="bg-white mx-4 mt-4 rounded-lg divide-y divide-gray-100">
        {sampleEpisodes.map(episode => (
          <EpisodeCard
            key={episode.id}
            episode={episode}
            podcastImageUrl={episode.podcastImageUrl}
            onPlay={handlePlay}
            onAIExplanation={handleAIExplanation}
          />
        ))}
      </div>
    </div>
  )
}
