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
    const accountId = import.meta.env.VITE_AWS_ACCOUNT_ID
    const region = import.meta.env.VITE_COGNITO_REGION || 'us-east-1'
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID
    const cognitoDomain = `https://rewind-${accountId}-${region}.auth.${region}.amazoncognito.com`
    const redirectUri = encodeURIComponent(`${window.location.origin}/callback`)

    if (!accountId || !clientId) {
      console.error('Missing required environment variables for Cognito authentication')
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
      <div className="flex items-center justify-end">
        <div className="text-xs text-gray-300">Loading...</div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-200 hidden sm:inline">Welcome, {user.username}</span>
        <button
          onClick={handleSignOut}
          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center">
      <button
        onClick={handleSignIn}
        className="px-2 py-1 text-xs bg-red text-white rounded hover:bg-red/90 transition-colors"
      >
        Sign In
      </button>
    </div>
  )
}
