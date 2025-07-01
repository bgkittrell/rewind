import { Outlet, Link, useLocation } from 'react-router'
import { useState } from 'react'
import { Auth } from './components/Auth'
import { FloatingMediaPlayer } from './components/FloatingMediaPlayer'
import { SideMenu } from './components/SideMenu'
import { OfflineStatus } from './components/OfflineStatus'
import { PWAInstallPrompt } from './components/PWAInstallPrompt'
import { PlayerProvider, usePlayer } from './context/PlayerContext'
import { IconMenu2, IconHome, IconBooks, IconSearch } from '@tabler/icons-react'

function AppContent() {
  const location = useLocation()
  const player = usePlayer()
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false)

  const handleMenuAction = (action: string) => {
    console.log(`Menu action: ${action}`)
    // TODO: Implement menu actions
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red text-white p-4 flex justify-between items-center h-14">
        {/* Menu Button */}
        <button
          onClick={() => setIsSideMenuOpen(true)}
          className="p-2 hover:bg-red/20 rounded-lg transition-colors"
          aria-label="Open navigation menu"
        >
          <IconMenu2 className="w-6 h-6" />
        </button>

        {/* Title */}
        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold">Rewind</h1>
        </div>
        <Auth />
      </header>

      <main className="container mx-auto p-4">
        <Outlet />
      </main>

      {/* Floating Media Player */}
      <FloatingMediaPlayer
        state={player.state}
        onTogglePlayPause={player.togglePlayPause}
        onSeek={player.seek}
        onSkipForward={player.skipForward}
        onSkipBackward={player.skipBackward}
        onExpand={player.expand}
        onMinimize={player.minimize}
        onSetVolume={player.setVolume}
        onSetPlaybackRate={player.setPlaybackRate}
      />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-30">
        <div className="flex justify-around">
          <Link
            to="/"
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              location.pathname === '/' ? 'text-red bg-red/10' : 'text-gray-600 hover:text-red'
            }`}
          >
            <IconHome className="w-6 h-6 mb-1" />
            <span className="text-xs">Home</span>
          </Link>
          <Link
            to="/library"
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              location.pathname === '/library' ? 'text-red bg-red/10' : 'text-gray-600 hover:text-red'
            }`}
          >
            <IconBooks className="w-6 h-6 mb-1" />
            <span className="text-xs">Library</span>
          </Link>
          <Link
            to="/search"
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              location.pathname === '/search' ? 'text-red bg-red/10' : 'text-gray-600 hover:text-red'
            }`}
          >
            <IconSearch className="w-6 h-6 mb-1" />
            <span className="text-xs">Search</span>
          </Link>
        </div>
      </nav>

      {/* Offline Status */}
      <OfflineStatus />

      {/* Side Menu */}
      <SideMenu
        isOpen={isSideMenuOpen}
        onClose={() => setIsSideMenuOpen(false)}
        onProfile={() => handleMenuAction('profile')}
        onAddPodcast={() => handleMenuAction('addPodcast')}
        onShareLibrary={() => handleMenuAction('shareLibrary')}
        onSettings={() => handleMenuAction('settings')}
        onLogout={() => handleMenuAction('logout')}
      />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Bottom padding to account for fixed navigation and media player */}
      <div className={`${player.state.currentEpisode ? 'h-32' : 'h-20'}`}></div>
    </div>
  )
}

function App() {
  return (
    <PlayerProvider>
      <AppContent />
    </PlayerProvider>
  )
}

export default App
