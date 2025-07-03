export default function Search() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Search</h1>
        <p className="text-gray-600">Find episodes and podcasts</p>
      </div>

      {/* Search input */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search episodes or podcasts..."
          // eslint-disable-next-line max-len
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Search results placeholder */}
      <div className="text-center text-gray-500 py-12">Start typing to search for episodes and podcasts</div>
    </div>
  )
}
