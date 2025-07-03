export default function Library() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Library</h1>
        <p className="text-gray-600">Manage your podcast subscriptions</p>
      </div>

      {/* TODO: Add search/add podcast functionality */}
      <div className="mb-6">
        <button className="btn-primary w-full">Add Podcast</button>
      </div>

      {/* TODO: Add PodcastCard components */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-gray-300 rounded-lg flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">Sample Podcast</h3>
              <p className="text-sm text-gray-600">5 unread episodes</p>
              <p className="text-xs text-gray-500 mt-1">Last updated 2 days ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
