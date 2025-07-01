import '@testing-library/jest-dom'

// Mock AWS Amplify
vi.mock('aws-amplify/auth', () => ({
  signOut: vi.fn(),
  getCurrentUser: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  signIn: vi.fn(),
}))

// Mock React Router
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
  }
})
