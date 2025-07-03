import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Amplify } from 'aws-amplify'
import {
  signUp,
  signIn,
  signOut,
  confirmSignUp,
  resendSignUpCode,
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes,
} from 'aws-amplify/auth'
import { apiClient } from '../services/api'

// Configuration will be set at runtime
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: '', // Will be set from environment
      userPoolClientId: '', // Will be set from environment
      identityPoolId: '', // Will be set from environment
    },
  },
}

interface User {
  id: string
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  signUp: (_email: string, _password: string, _name: string) => Promise<{ success: boolean; message: string }>
  signIn: (_email: string, _password: string) => Promise<{ success: boolean; message: string }>
  signOut: () => Promise<void>
  confirmSignUp: (_email: string, _code: string) => Promise<{ success: boolean; message: string }>
  resendCode: (_email: string) => Promise<{ success: boolean; message: string }>
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Initialize Amplify configuration
  useEffect(() => {
    // In a real app, these would come from environment variables
    // For now, we'll set them as placeholders
    const config = {
      ...amplifyConfig,
      Auth: {
        Cognito: {
          userPoolId: import.meta.env.VITE_USER_POOL_ID || 'placeholder',
          userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || 'placeholder',
          identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID || 'placeholder',
        },
      },
    }

    Amplify.configure(config)
    checkAuthState()
  }, [])

  const checkAuthState = async () => {
    try {
      console.log('AuthContext: Starting auth check')
      setIsLoading(true)
      const currentUser = await getCurrentUser()
      const session = await fetchAuthSession()

      if (currentUser && session.tokens) {
        // Set the auth token in the API client
        // Try ID token first, then access token as fallback
        const token = session.tokens.idToken || session.tokens.accessToken
        if (token) {
          console.log(
            'AuthContext: Setting auth token (type:',
            session.tokens.idToken ? 'ID' : 'Access',
            ')',
            token.toString(),
          )
          apiClient.setAuthToken(token.toString())
        }

        // Fetch user attributes to get the name
        const attributes = await fetchUserAttributes()
        setUser({
          id: currentUser.userId,
          email: currentUser.signInDetails?.loginId || attributes.email || '',
          name: attributes.name || attributes.preferred_username || '',
        })
        setIsAuthenticated(true)
        console.log('AuthContext: User authenticated successfully')
      }
    } catch (error) {
      console.log('AuthContext: User is not authenticated', error)
      setUser(null)
      setIsAuthenticated(false)
      apiClient.clearAuthToken()
    } finally {
      setIsLoading(false)
      console.log('AuthContext: Auth check completed')
    }
  }

  const handleSignUp = async (email: string, password: string, name: string) => {
    try {
      const { isSignUpComplete } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name,
          },
        },
      })

      return {
        success: true,
        message: isSignUpComplete ? 'Account created successfully' : 'Please check your email for verification code',
      }
    } catch (error: any) {
      console.error('Sign up error:', error)
      return {
        success: false,
        message: error.message || 'Failed to create account',
      }
    }
  }

  const handleSignIn = async (email: string, password: string) => {
    try {
      const { isSignedIn } = await signIn({
        username: email,
        password,
      })

      if (isSignedIn) {
        await checkAuthState()
        return {
          success: true,
          message: 'Signed in successfully',
        }
      }

      return {
        success: false,
        message: 'Sign in failed',
      }
    } catch (error: any) {
      console.error('Sign in error:', error)
      return {
        success: false,
        message: error.message || 'Failed to sign in',
      }
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setUser(null)
      setIsAuthenticated(false)
      apiClient.clearAuthToken()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const handleConfirmSignUp = async (email: string, code: string) => {
    try {
      const { isSignUpComplete } = await confirmSignUp({
        username: email,
        confirmationCode: code,
      })

      return {
        success: isSignUpComplete,
        message: isSignUpComplete ? 'Email verified successfully' : 'Verification failed',
      }
    } catch (error: any) {
      console.error('Confirmation error:', error)
      return {
        success: false,
        message: error.message || 'Failed to verify email',
      }
    }
  }

  const handleResendCode = async (email: string) => {
    try {
      await resendSignUpCode({ username: email })
      return {
        success: true,
        message: 'Verification code sent',
      }
    } catch (error: any) {
      console.error('Resend code error:', error)
      return {
        success: false,
        message: error.message || 'Failed to resend code',
      }
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    confirmSignUp: handleConfirmSignUp,
    resendCode: handleResendCode,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
