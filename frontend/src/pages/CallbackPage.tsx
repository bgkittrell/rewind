import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { signIn } from 'aws-amplify/auth'

export function CallbackPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    handleCallback()
  }, [])

  const handleCallback = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')

      if (!code) {
        throw new Error('No authorization code received')
      }

      // Handle the OAuth callback
      await signIn({
        username: '', // Not used for OAuth flow
        options: {
          authFlowType: 'USER_SRP_AUTH',
        },
      })

      setStatus('success')
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      console.error('Callback error:', err)
      setError(err instanceof Error ? err.message : 'Authentication failed')
      setStatus('error')
      setTimeout(() => navigate('/'), 5000)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Signing you in...</h2>
          <p className="text-gray-600">Please wait while we complete your authentication.</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-green-500 text-4xl mb-4">✓</div>
          <h2 className="text-xl font-semibold mb-2">Successfully signed in!</h2>
          <p className="text-gray-600">Redirecting you to the home page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-red-500 text-4xl mb-4">✗</div>
        <h2 className="text-xl font-semibold mb-2">Authentication failed</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <p className="text-sm text-gray-500">Redirecting you back to the home page...</p>
      </div>
    </div>
  )
}
