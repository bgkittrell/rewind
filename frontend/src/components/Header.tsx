import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { AuthModal } from './auth/AuthModal'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const { user, isAuthenticated, signOut } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="relative flex items-center justify-between h-16">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            data-testid="menu-button"
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Centered title and icon */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
            {/* Rewind Icon (two left-pointing triangles) */}
            <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5l-7 7 7 7V5zm7 0l-7 7 7 7V5z" />
            </svg>
            <h1 className="text-xl font-bold text-primary">Rewind</h1>
          </div>

          {/* Auth section */}
          <div className="flex items-center">
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Hello, {user?.name}</span>
                <button onClick={signOut} className="text-sm text-red-600 hover:text-red-500">
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                data-testid="login-button"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TODO: Add SideMenu component */}
      {isMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <nav className="space-y-2">
              <a href="#" className="block py-2 text-gray-700 hover:text-primary">
                Profile
              </a>
              <a href="#" className="block py-2 text-gray-700 hover:text-primary">
                Add Podcast
              </a>
              <a href="#" className="block py-2 text-gray-700 hover:text-primary">
                Share Library
              </a>
              <a href="#" className="block py-2 text-gray-700 hover:text-primary">
                Settings
              </a>
              <a href="#" className="block py-2 text-gray-700 hover:text-primary">
                Logout
              </a>
            </nav>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </header>
  )
}
