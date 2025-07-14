import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthModal } from './AuthModal'
import { useAuth } from '../../context/AuthContext'

// Mock the useAuth hook
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// Mock the child components
vi.mock('./LoginForm', () => ({
  LoginForm: ({ onSwitchToSignup, onSwitchToConfirm, onSuccess }: any) => (
    <div data-testid="login-form">
      <button onClick={onSwitchToSignup}>Switch to Signup</button>
      <button onClick={() => onSwitchToConfirm('')}>Switch to Confirm</button>
      <button onClick={onSuccess}>Login Success</button>
    </div>
  ),
}))

vi.mock('./SignupForm', () => ({
  SignupForm: ({ onSwitchToLogin, onSwitchToConfirm }: any) => (
    <div data-testid="signup-form">
      <button onClick={onSwitchToLogin}>Switch to Login</button>
      <button onClick={() => onSwitchToConfirm('test@example.com')}>Switch to Confirm</button>
    </div>
  ),
}))

vi.mock('./ConfirmEmailForm', () => ({
  ConfirmEmailForm: ({ email, onConfirmed, onBack }: any) => (
    <div data-testid="confirm-form">
      <span>Confirming: {email}</span>
      <button onClick={onConfirmed}>Confirm Success</button>
      <button onClick={onBack}>Back to Signup</button>
    </div>
  ),
}))

describe('AuthModal', () => {
  const mockOnClose = vi.fn()
  const mockSignIn = vi.fn()
  const mockSignUp = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as any).mockReturnValue({
      signIn: mockSignIn,
      signUp: mockSignUp,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<AuthModal isOpen={false} onClose={mockOnClose} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders modal with login form by default when open', () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
    expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
    expect(screen.queryByTestId('confirm-form')).not.toBeInTheDocument()
  })

  it('displays close button that calls onClose when clicked', async () => {
    const user = userEvent.setup()
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    const closeButton = screen.getByTestId('close-modal')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('switches from login to signup form', async () => {
    const user = userEvent.setup()
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByTestId('login-form')).toBeInTheDocument()

    await user.click(screen.getByText('Switch to Signup'))

    expect(screen.queryByTestId('login-form')).not.toBeInTheDocument()
    expect(screen.getByTestId('signup-form')).toBeInTheDocument()
  })

  it('switches from signup to login form', async () => {
    const user = userEvent.setup()
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    // First switch to signup
    await user.click(screen.getByText('Switch to Signup'))
    expect(screen.getByTestId('signup-form')).toBeInTheDocument()

    // Then switch back to login
    await user.click(screen.getByText('Switch to Login'))

    expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
  })

  it('switches from login to confirm form', async () => {
    const user = userEvent.setup()
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    await user.click(screen.getByText('Switch to Confirm'))

    expect(screen.queryByTestId('login-form')).not.toBeInTheDocument()
    expect(screen.getByTestId('confirm-form')).toBeInTheDocument()
    expect(screen.getByText('Confirming:')).toBeInTheDocument()
  })

  it('switches from signup to confirm form with email', async () => {
    const user = userEvent.setup()
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    // First switch to signup
    await user.click(screen.getByText('Switch to Signup'))

    // Then switch to confirm
    await user.click(screen.getByText('Switch to Confirm'))

    expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
    expect(screen.getByTestId('confirm-form')).toBeInTheDocument()
    expect(screen.getByText('Confirming: test@example.com')).toBeInTheDocument()
  })

  it('switches from confirm back to signup', async () => {
    const user = userEvent.setup()
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    // Navigate to confirm form via signup
    await user.click(screen.getByText('Switch to Signup'))
    await user.click(screen.getByText('Switch to Confirm'))

    // Go back to signup
    await user.click(screen.getByText('Back to Signup'))

    expect(screen.queryByTestId('confirm-form')).not.toBeInTheDocument()
    expect(screen.getByTestId('signup-form')).toBeInTheDocument()
  })

  it('switches from confirm to login after successful confirmation', async () => {
    const user = userEvent.setup()
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    // Navigate to confirm form
    await user.click(screen.getByText('Switch to Confirm'))

    // Confirm success
    await user.click(screen.getByText('Confirm Success'))

    expect(screen.queryByTestId('confirm-form')).not.toBeInTheDocument()
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
  })

  it('closes modal on successful login', async () => {
    const user = userEvent.setup()
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    await user.click(screen.getByText('Login Success'))

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('has proper accessibility attributes', () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    const modal = screen.getByTestId('auth-modal')
    expect(modal).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50')
  })
})
