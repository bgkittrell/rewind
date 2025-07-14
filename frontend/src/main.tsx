import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'

// Import context providers
import { AuthProvider } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'

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
        path: 'episode/:podcastId/:episodeId',
        element: <EpisodeDetail />,
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

// Add beforeunload handler to save progress when app closes
window.addEventListener('beforeunload', () => {
  // This will trigger any cleanup in the MediaPlayerContext
  // The actual progress saving is handled in FloatingMediaPlayer component
})

// Show update notification when available
let updateNotificationElement: HTMLDivElement | null = null

pwaService.onUpdateAvailable(showReload => {
  if (showReload && !updateNotificationElement) {
    updateNotificationElement = document.createElement('div')
    updateNotificationElement.className = 'fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-3 shadow-lg'

    // Create elements safely without innerHTML
    const container = document.createElement('div')
    container.className = 'flex items-center justify-between'

    const textContainer = document.createElement('div')

    const title = document.createElement('p')
    title.className = 'font-medium'
    title.textContent = 'Update Available'

    const subtitle = document.createElement('p')
    subtitle.className = 'text-sm text-red-100'
    subtitle.textContent = 'A new version of Rewind is ready to install'

    textContainer.appendChild(title)
    textContainer.appendChild(subtitle)

    const buttonContainer = document.createElement('div')
    buttonContainer.className = 'flex items-center space-x-2'

    const updateBtn = document.createElement('button')
    updateBtn.id = 'update-btn'
    updateBtn.className = 'bg-white text-red-500 px-4 py-2 rounded font-medium hover:bg-red-50'
    updateBtn.textContent = 'Update Now'
    updateBtn.addEventListener('click', () => {
      pwaService.applyUpdate()
    })

    const dismissBtn = document.createElement('button')
    dismissBtn.id = 'dismiss-btn'
    dismissBtn.className = 'text-white hover:text-red-200 p-1'
    dismissBtn.textContent = '×'

    buttonContainer.appendChild(updateBtn)
    buttonContainer.appendChild(dismissBtn)

    container.appendChild(textContainer)
    container.appendChild(buttonContainer)

    updateNotificationElement.appendChild(container)
    document.body.appendChild(updateNotificationElement)

    // Handle dismiss button click
    document.getElementById('dismiss-btn')?.addEventListener('click', () => {
      updateNotificationElement?.remove()
      updateNotificationElement = null
    })
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
