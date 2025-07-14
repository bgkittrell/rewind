import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, clearAuth } from './setup/testUtils'
import { server } from './setup/mswServer'
import { http, HttpResponse } from 'msw'
import App from '../../App'

// Set up MSW server
import './setup/mswServer'

describe.skip('Auth Integration Tests', () => {
  beforeEach(() => {
    clearAuth()
  })

  describe('Login Flow', () => {
    it('should successfully login with valid credentials', async () => {
      const user = userEvent.setup()
      render(<App />)

      // Navigate to login - click the header login button
      const loginButton = await screen.findByTestId('login-button')
      await user.click(loginButton)

      // Fill in login form
      const emailInput = await screen.findByLabelText(/email/i)
      const passwordInput = await screen.findByLabelText(/password/i)

      await user.clear(emailInput)
      await user.type(emailInput, 'test@example.com')
      await user.clear(passwordInput)
      await user.type(passwordInput, 'password123')

      // Submit form - find the submit button within the form
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // Should receive tokens and redirect
      await waitFor(() => {
        expect(localStorage.getItem('accessToken')).toBe('mock-access-token')
        expect(localStorage.getItem('idToken')).toBe('mock-id-token')
        expect(localStorage.getItem('refreshToken')).toBe('mock-refresh-token')
      })
    })

    it('should show error message with invalid credentials', async () => {
      const user = userEvent.setup()
      render(<App />)

      // Navigate to login
      const loginButton = await screen.findByText(/sign in/i)
      await user.click(loginButton)

      // Fill in login form with invalid credentials
      const emailInput = await screen.findByLabelText(/email/i)
      const passwordInput = await screen.findByLabelText(/password/i)

      await user.type(emailInput, 'wrong@example.com')
      await user.type(passwordInput, 'wrongpassword')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // Should show error message
      const errorMessage = await screen.findByText(/invalid credentials/i)
      expect(errorMessage).toBeInTheDocument()
    })

    it('should handle network errors gracefully', async () => {
      // Override handler to simulate network error
      server.use(
        http.post('*/api/auth/signin', () => {
          return HttpResponse.error()
        }),
      )

      const user = userEvent.setup()
      render(<App />)

      // Navigate to login
      const loginButton = await screen.findByText(/sign in/i)
      await user.click(loginButton)

      // Fill in and submit form
      const emailInput = await screen.findByLabelText(/email/i)
      const passwordInput = await screen.findByLabelText(/password/i)

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // Should show network error message
      const errorMessage = await screen.findByText(/network error|something went wrong/i)
      expect(errorMessage).toBeInTheDocument()
    })
  })

  describe('Signup Flow', () => {
    it('should successfully create a new account', async () => {
      const user = userEvent.setup()
      render(<App />)

      // Navigate to signup
      const signupButton = await screen.findByText(/create account/i)
      await user.click(signupButton)

      // Fill in signup form
      const nameInput = await screen.findByLabelText(/name/i)
      const emailInput = await screen.findByLabelText(/email/i)
      const passwordInput = await screen.findByLabelText(/password/i)

      await user.type(nameInput, 'New User')
      await user.type(emailInput, 'newuser@example.com')
      await user.type(passwordInput, 'securepassword123')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      await user.click(submitButton)

      // Should show confirmation message
      const confirmationMessage = await screen.findByText(/check your email|confirm your email/i)
      expect(confirmationMessage).toBeInTheDocument()
    })

    it('should show error when email already exists', async () => {
      const user = userEvent.setup()
      render(<App />)

      // Navigate to signup
      const signupButton = await screen.findByText(/create account/i)
      await user.click(signupButton)

      // Fill in signup form with existing email
      const nameInput = await screen.findByLabelText(/name/i)
      const emailInput = await screen.findByLabelText(/email/i)
      const passwordInput = await screen.findByLabelText(/password/i)

      await user.type(nameInput, 'Existing User')
      await user.type(emailInput, 'existing@example.com')
      await user.type(passwordInput, 'password123')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      await user.click(submitButton)

      // Should show error message
      const errorMessage = await screen.findByText(/user already exists/i)
      expect(errorMessage).toBeInTheDocument()
    })
  })

  describe('Email Confirmation Flow', () => {
    it('should successfully confirm email with valid code', async () => {
      const user = userEvent.setup()
      render(<App />)

      // Assume we're on the confirmation page
      // This would typically happen after signup
      const confirmationInput = await screen.findByLabelText(/confirmation code/i)
      await user.type(confirmationInput, '123456')

      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)

      // Should show success message
      const successMessage = await screen.findByText(/email confirmed/i)
      expect(successMessage).toBeInTheDocument()
    })

    it('should show error with invalid confirmation code', async () => {
      const user = userEvent.setup()
      render(<App />)

      const confirmationInput = await screen.findByLabelText(/confirmation code/i)
      await user.type(confirmationInput, '999999')

      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)

      // Should show error message
      const errorMessage = await screen.findByText(/invalid confirmation code/i)
      expect(errorMessage).toBeInTheDocument()
    })
  })

  describe('Protected Routes', () => {
    it('should redirect to login when accessing protected route without auth', async () => {
      render(<App />)

      // Try to navigate to a protected route
      window.history.pushState({}, '', '/library')

      // Should redirect to login or show login prompt
      const loginPrompt = await screen.findByText(/sign in to continue/i)
      expect(loginPrompt).toBeInTheDocument()
    })

    it('should allow access to protected routes when authenticated', async () => {
      // Set up authenticated state
      localStorage.setItem('accessToken', 'mock-access-token')
      localStorage.setItem('idToken', 'mock-id-token')

      render(<App />)

      // Navigate to protected route
      window.history.pushState({}, '', '/library')

      // Should show library content
      const libraryContent = await screen.findByText(/your library|my podcasts/i)
      expect(libraryContent).toBeInTheDocument()
    })
  })

  describe('Token Management', () => {
    it('should handle expired token and redirect to login', async () => {
      // Set up expired token scenario
      server.use(
        http.get('*/api/podcasts', () => {
          return HttpResponse.json({ error: 'Token expired' }, { status: 401 })
        }),
      )

      // Set tokens
      localStorage.setItem('accessToken', 'expired-token')

      render(<App />)

      // Should eventually redirect to login
      const loginPrompt = await screen.findByText(/sign in/i)
      expect(loginPrompt).toBeInTheDocument()
    })
  })

  describe('Logout Flow', () => {
    it('should clear tokens and redirect on logout', async () => {
      // Set up authenticated state
      localStorage.setItem('accessToken', 'mock-access-token')
      localStorage.setItem('idToken', 'mock-id-token')
      localStorage.setItem('refreshToken', 'mock-refresh-token')

      const user = userEvent.setup()
      render(<App />)

      // Find and click logout button
      const logoutButton = await screen.findByText(/log out|sign out/i)
      await user.click(logoutButton)

      // Should clear tokens
      await waitFor(() => {
        expect(localStorage.getItem('accessToken')).toBeNull()
        expect(localStorage.getItem('idToken')).toBeNull()
        expect(localStorage.getItem('refreshToken')).toBeNull()
      })

      // Should show login option
      const loginButton = await screen.findByText(/sign in/i)
      expect(loginButton).toBeInTheDocument()
    })
  })
})
