import { Outlet } from 'react-router'
import Header from '../components/Header'
import BottomActionBar from '../components/BottomActionBar'

export default function Root() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 pb-16">
        <Outlet />
      </main>

      <BottomActionBar />

      {/* TODO: Add FloatingMediaPlayer component */}
    </div>
  )
}
