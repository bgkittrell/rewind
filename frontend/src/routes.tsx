import { createBrowserRouter, RouteObject } from 'react-router'
import App from './App'
import { CallbackPage } from './pages/CallbackPage'
import { HomePage } from './pages/HomePage'
import { LibraryPage } from './pages/LibraryPage'
import { SearchPage } from './pages/SearchPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'library',
        element: <LibraryPage />,
      },
      {
        path: 'search',
        element: <SearchPage />,
      },
    ],
  },
  {
    path: '/callback',
    element: <CallbackPage />,
  },
]

export const router = createBrowserRouter(routes)
