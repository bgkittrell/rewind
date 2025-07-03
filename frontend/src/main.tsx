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
        element: <div>Podcast Episodes</div>, // TODO: Create PodcastEpisodes component
      },
      {
        path: 'search',
        element: <Search />,
      },
      {
        path: 'episode/:episodeId',
        element: <div>Episode Details</div>, // TODO: Create EpisodeDetails component
      },
      {
        path: 'share/:shareId',
        element: <div>Share Library</div>, // TODO: Create ShareLibrary component
      },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
)
