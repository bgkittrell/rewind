import { useRouteError } from 'react-router'

export default function ErrorPage() {
  const error = useRouteError() as Error

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">Oops!</h1>
        <p className="text-xl text-gray-600 mb-4">Sorry, an unexpected error has occurred.</p>
        <p className="text-gray-500">{error?.message || 'Unknown error'}</p>
      </div>
    </div>
  )
}
