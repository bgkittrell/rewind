import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'
import { useAuth } from '../../context/AuthContext'

// Mock the useAuth hook
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

describe('LoginForm', () => {
  const mockSignIn = vi.fn()
  const mockOnSwitchToSignup = vi.fn()
  const mockOnSwitchToConfirm = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as any).mockReturnValue({
      signIn: mockSignIn,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders login form with all necessary fields', () => {
    render(<LoginForm onSwitchToSignup={mockOnSwitchToSignup} />)

    expect(screen.getByRole('heading', { name: 'Sign In to Rewind' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument()
  })

  it('allows user to enter email and password', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSwitchToSignup={mockOnSwitchToSignup} />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')

    expect(emailInput).toHaveValue('test@example.com')
    expect(passwordInput).toHaveValue('password123')
  })

  it('calls signIn with correct credentials on form submission', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ success: true })

    render(<LoginForm onSwitchToSignup={mockOnSwitchToSignup} onSuccess={mockOnSuccess} />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('displays error message when sign in fails', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({
      success: false,
      message: 'Invalid email or password',
    })

    render(<LoginForm onSwitchToSignup={mockOnSwitchToSignup} />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
    })
  })

  it('switches to confirm email form when email not verified', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({
      success: false,
      message: 'Email not verified. Please check your email for verification code.',
    })

    render(<LoginForm onSwitchToSignup={mockOnSwitchToSignup} onSwitchToConfirm={mockOnSwitchToConfirm} />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(mockOnSwitchToConfirm).toHaveBeenCalled()
    })
  })

  it('disables form fields and shows loading state during submission', async () => {
    const user = userEvent.setup()
    mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<LoginForm onSwitchToSignup={mockOnSwitchToSignup} />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')

    fireEvent.click(submitButton)

    expect(emailInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()
    expect(submitButton).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Signing In...' })).toBeInTheDocument()
  })

  it('handles unexpected errors gracefully', async () => {
    const user = userEvent.setup()
    mockSignIn.mockRejectedValue(new Error('Network error'))

    render(<LoginForm onSwitchToSignup={mockOnSwitchToSignup} />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
    })
  })

  it('calls onSwitchToSignup when signup link is clicked', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSwitchToSignup={mockOnSwitchToSignup} />)

    await user.click(screen.getByText('Sign up here'))

    expect(mockOnSwitchToSignup).toHaveBeenCalled()
  })

  it('requires email and password fields', () => {
    render(<LoginForm onSwitchToSignup={mockOnSwitchToSignup} />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')

    expect(emailInput).toBeRequired()
    expect(passwordInput).toBeRequired()
  })
})
