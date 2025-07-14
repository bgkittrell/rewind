import React, { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'

// Import context providers
import { AuthProvider } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'

// Import Root and ErrorPage directly as they're needed immediately
import Root from './routes/root'
import ErrorPage from './routes/error-page'

// Lazy load routes for code splitting
const Home = lazy(() => import('./routes/home'))
const Library = lazy(() => import('./routes/library'))
const Search = lazy(() => import('./routes/search'))
const PodcastDetail = lazy(() => import('./routes/podcast-detail'))
const EpisodeDetail = lazy(() => import('./routes/episode-detail'))
const Auth = lazy(() => import('./routes/auth'))

// Loading component for Suspense fallback
const RouteLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
)

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<RouteLoader />}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: 'library',
        element: (
          <Suspense fallback={<RouteLoader />}>
            <Library />
          </Suspense>
        ),
      },
      {
        path: 'library/:podcastId',
        element: (
          <Suspense fallback={<RouteLoader />}>
            <PodcastDetail />
          </Suspense>
        ),
      },
      {
        path: 'search',
        element: (
          <Suspense fallback={<RouteLoader />}>
            <Search />
          </Suspense>
        ),
      },
      {
        path: 'episode/:podcastId/:episodeId',
        element: (
          <Suspense fallback={<RouteLoader />}>
            <EpisodeDetail />
          </Suspense>
        ),
      },
      {
        path: 'episode/:episodeId',
        element: (
          <Suspense fallback={<RouteLoader />}>
            <EpisodeDetail />
          </Suspense>
        ),
      },
      {
        path: 'share/:shareId',
        element: <div>Share Library</div>, // TODO: Create ShareLibrary component
      },
    ],
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={<RouteLoader />}>
        <Auth />
      </Suspense>
    ),
  },
  {
    path: '/signup',
    element: (
      <Suspense fallback={<RouteLoader />}>
        <Auth />
      </Suspense>
    ),
  },
])

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
