import { Outlet, Link, useLocation } from 'react-router'
import { Auth } from './components/Auth'

function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-teal text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Rewind</h1>
          <p className="text-sm opacity-90">Rediscover older podcast episodes</p>
        </div>
        <Auth />
      </header>

      <main className="container mx-auto p-4">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          <Link
            to="/"
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              location.pathname === '/' ? 'text-teal bg-teal/10' : 'text-gray-600 hover:text-teal'
            }`}
          >
            <span className="text-xl mb-1">🏠</span>
            <span className="text-xs">Home</span>
          </Link>
          <Link
            to="/library"
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              location.pathname === '/library' ? 'text-teal bg-teal/10' : 'text-gray-600 hover:text-teal'
            }`}
          >
            <span className="text-xl mb-1">📚</span>
            <span className="text-xs">Library</span>
          </Link>
          <Link
            to="/search"
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              location.pathname === '/search' ? 'text-teal bg-teal/10' : 'text-gray-600 hover:text-teal'
            }`}
          >
            <span className="text-xl mb-1">🔍</span>
            <span className="text-xs">Search</span>
          </Link>
        </div>
      </nav>

      {/* Bottom padding to account for fixed navigation */}
      <div className="h-20"></div>
    </div>
  )
}

export default App
