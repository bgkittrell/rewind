import { Outlet } from 'react-router'
import Header from '../components/Header'
import BottomActionBar from '../components/BottomActionBar'
import FloatingMediaPlayer from '../components/FloatingMediaPlayer'
import { MediaPlayerProvider, useMediaPlayer } from '../context/MediaPlayerContext'

function RootContent() {
  const { state, pause, resume, stop, seek } = useMediaPlayer()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 pb-16">
        <Outlet />
      </main>

      <BottomActionBar />

      {/* Floating Media Player */}
      <FloatingMediaPlayer
        episode={state.currentEpisode}
        isPlaying={state.isPlaying}
        onPlay={resume}
        onPause={pause}
        onClose={stop}
        onSeek={seek}
      />
    </div>
  )
}

export default function Root() {
  return (
    <MediaPlayerProvider>
      <RootContent />
    </MediaPlayerProvider>
  )
}
