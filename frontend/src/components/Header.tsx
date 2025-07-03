import { useState } from 'react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-primary">Rewind</h1>
          <div className="w-10"></div> {/* Spacer for center alignment */}
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
    </header>
  )
}
