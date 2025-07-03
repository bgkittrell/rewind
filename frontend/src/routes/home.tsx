export default function Home() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Recommended Episodes</h1>
        <p className="text-gray-600">Rediscover older episodes from your favorite podcasts</p>
      </div>

      {/* TODO: Add FilterPills component */}
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

      {/* TODO: Add EpisodeCard components */}
      <div className="space-y-4">
        <div className="episode-card">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-gray-300 rounded-lg flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">Sample Episode Title</h3>
              <p className="text-sm text-gray-600 truncate">Sample Podcast Name</p>
              <p className="text-xs text-gray-500 mt-1">Released 3 months ago • 45 min</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
