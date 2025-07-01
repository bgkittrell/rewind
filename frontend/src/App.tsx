import { Auth } from './components/Auth'

function App() {
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
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Welcome to Rewind</h2>
          <p className="text-gray-600 mb-4">Your mobile-first PWA for rediscovering older podcast episodes.</p>
          <div className="bg-teal/10 border border-teal/20 rounded-lg p-4">
            <h3 className="font-semibold text-teal mb-2">🚧 Development Setup Complete</h3>
            <p className="text-sm text-gray-600">
              Project structure created and ready for development. See the documentation in the docs/ folder for
              implementation details.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
