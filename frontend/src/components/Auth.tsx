import { useState, useEffect } from 'react'
import { signOut, getCurrentUser, AuthUser } from 'aws-amplify/auth'

interface AuthProps {
  onAuthStateChange?: (_isAuthenticated: boolean, _user?: AuthUser) => void
}

export function Auth({ onAuthStateChange }: AuthProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthState()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuthState = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      onAuthStateChange?.(true, currentUser)
    } catch (error) {
      setUser(null)
      onAuthStateChange?.(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = () => {
    // Redirect to Cognito hosted UI
    const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID
    const redirectUri = encodeURIComponent(`${window.location.origin}/callback`)

    // Debug environment variables
    console.warn('Environment variables:', {
      cognitoDomain,
      clientId,
      allEnv: import.meta.env,
    })

    if (!cognitoDomain || !clientId) {
      console.error('Missing required environment variables')
      return
    }

    const loginUrl = `${cognitoDomain}/login?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}`
    window.location.href = loginUrl
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setUser(null)
      onAuthStateChange?.(false)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex items-center gap-3 p-4">
        <span className="text-sm text-gray-700">Welcome, {user.username}</span>
        <button
          onClick={handleSignOut}
          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-4">
      <button
        onClick={handleSignIn}
        className="px-4 py-2 bg-teal text-white rounded hover:bg-teal-600 transition-colors"
      >
        Sign In
      </button>
    </div>
  )
}
