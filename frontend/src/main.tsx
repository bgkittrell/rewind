import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'

// Import context providers
import { AuthProvider } from './context/AuthContext'

// Import routes
import Root from './routes/root'
import Home from './routes/home'
import Library from './routes/library'
import Search from './routes/search'
import ErrorPage from './routes/error-page'
import PodcastDetail from './routes/podcast-detail'
import EpisodeDetail from './routes/episode-detail'
import Auth from './routes/auth'

// Import PWA service
import { pwaService } from './services/pwaService'
// Import RUM service
import { rumService } from './services/rumService'
import { rumConfig, isRumConfigured } from './config/rumConfig'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'library',
        element: <Library />,
      },
      {
        path: 'library/:podcastId',
        element: <PodcastDetail />,
      },
      {
        path: 'search',
        element: <Search />,
      },
      {
        path: 'episode/:episodeId',
        element: <EpisodeDetail />,
      },
      {
        path: 'share/:shareId',
        element: <div>Share Library</div>, // TODO: Create ShareLibrary component
      },
    ],
  },
  {
    path: '/login',
    element: <Auth />,
  },
  {
    path: '/signup',
    element: <Auth />,
  },
])

// Initialize PWA service for update handling
pwaService.initialize()

// Initialize RUM service for monitoring
if (isRumConfigured()) {
  rumService.initialize(rumConfig).catch(error => {
    console.error('Failed to initialize RUM service:', error)
  })
} else {
  console.warn('RUM service not configured, skipping initialization')
}

// Show update notification when available
let updateNotificationElement: HTMLDivElement | null = null

pwaService.onUpdateAvailable(showReload => {
  if (showReload && !updateNotificationElement) {
    updateNotificationElement = document.createElement('div')
    updateNotificationElement.className = 'fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-3 shadow-lg'
    updateNotificationElement.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium">Update Available</p>
          <p class="text-sm text-red-100">A new version of Rewind is ready to install</p>
        </div>
        <div class="flex items-center space-x-2">
          <button id="update-btn" class="bg-white text-red-500 px-4 py-2 rounded font-medium hover:bg-red-50">
            Update Now
          </button>
          <button id="dismiss-btn" class="text-white hover:text-red-200 p-1">
            ×
          </button>
        </div>
      </div>
    `

    document.body.appendChild(updateNotificationElement)

    // Handle update button click
    document.getElementById('update-btn')?.addEventListener('click', () => {
      pwaService.applyUpdate()
    })

    // Handle dismiss button click
    document.getElementById('dismiss-btn')?.addEventListener('click', () => {
      updateNotificationElement?.remove()
      updateNotificationElement = null
    })
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
)
