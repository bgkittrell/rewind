import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignupForm } from './SignupForm'
import { useAuth } from '../../context/AuthContext'

// Mock the useAuth hook
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

describe('SignupForm', () => {
  const mockSignUp = vi.fn()
  const mockOnSwitchToLogin = vi.fn()
  const mockOnSwitchToConfirm = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as any).mockReturnValue({
      signUp: mockSignUp,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders signup form with all necessary fields', () => {
    render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} onSwitchToConfirm={mockOnSwitchToConfirm} />)

    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
    expect(screen.getByText('Already have an account?')).toBeInTheDocument()
    expect(screen.getByText('Must be at least 8 characters with uppercase, lowercase, and numbers')).toBeInTheDocument()
  })

  it('allows user to enter name, email and password', async () => {
    const user = userEvent.setup()
    render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} onSwitchToConfirm={mockOnSwitchToConfirm} />)

    const nameInput = screen.getByLabelText('Full Name')
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')

    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(passwordInput, 'SecurePass123')

    expect(nameInput).toHaveValue('John Doe')
    expect(emailInput).toHaveValue('john@example.com')
    expect(passwordInput).toHaveValue('SecurePass123')
  })

  it('calls signUp with correct credentials on form submission', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({ success: true })

    render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} onSwitchToConfirm={mockOnSwitchToConfirm} />)

    await user.type(screen.getByLabelText('Full Name'), 'John Doe')
    await user.type(screen.getByLabelText('Email'), 'john@example.com')
    await user.type(screen.getByLabelText('Password'), 'SecurePass123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('john@example.com', 'SecurePass123', 'John Doe')
      expect(mockOnSwitchToConfirm).toHaveBeenCalledWith('john@example.com')
    })
  })

  it('displays error message when sign up fails', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({
      success: false,
      message: 'Email already exists',
    })

    render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} onSwitchToConfirm={mockOnSwitchToConfirm} />)

    await user.type(screen.getByLabelText('Full Name'), 'John Doe')
    await user.type(screen.getByLabelText('Email'), 'existing@example.com')
    await user.type(screen.getByLabelText('Password'), 'SecurePass123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument()
      expect(mockOnSwitchToConfirm).not.toHaveBeenCalled()
    })
  })

  it('disables form fields and shows loading state during submission', async () => {
    const user = userEvent.setup()
    mockSignUp.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} onSwitchToConfirm={mockOnSwitchToConfirm} />)

    const nameInput = screen.getByLabelText('Full Name')
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Create Account' })

    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(passwordInput, 'SecurePass123')

    fireEvent.click(submitButton)

    expect(nameInput).toBeDisabled()
    expect(emailInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()
    expect(submitButton).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Creating Account...' })).toBeInTheDocument()
  })

  it('handles unexpected errors gracefully', async () => {
    const user = userEvent.setup()
    mockSignUp.mockRejectedValue(new Error('Network error'))

    render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} onSwitchToConfirm={mockOnSwitchToConfirm} />)

    await user.type(screen.getByLabelText('Full Name'), 'John Doe')
    await user.type(screen.getByLabelText('Email'), 'john@example.com')
    await user.type(screen.getByLabelText('Password'), 'SecurePass123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
    })
  })

  it('calls onSwitchToLogin when login link is clicked', async () => {
    const user = userEvent.setup()
    render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} onSwitchToConfirm={mockOnSwitchToConfirm} />)

    await user.click(screen.getByText('Sign in here'))

    expect(mockOnSwitchToLogin).toHaveBeenCalled()
  })

  it('requires all fields', () => {
    render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} onSwitchToConfirm={mockOnSwitchToConfirm} />)

    const nameInput = screen.getByLabelText('Full Name')
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')

    expect(nameInput).toBeRequired()
    expect(emailInput).toBeRequired()
    expect(passwordInput).toBeRequired()
  })
})
