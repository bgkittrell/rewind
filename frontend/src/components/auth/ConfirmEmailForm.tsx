import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

interface ConfirmEmailFormProps {
  email: string
  onConfirmed: () => void
  onBack: () => void
}

export function ConfirmEmailForm({ email, onConfirmed, onBack }: ConfirmEmailFormProps) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isResending, setIsResending] = useState(false)
  const { confirmSignUp, resendCode } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await confirmSignUp(email, code)
      if (result.success) {
        onConfirmed()
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    setError('')
    setIsResending(true)

    try {
      const result = await resendCode(email)
      if (!result.success) {
        setError(result.message)
      }
    } catch (err) {
      setError('Failed to resend code')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Verify Your Email</h2>

        <div className="mb-4 text-center">
          <p className="text-sm text-gray-600">
            We've sent a verification code to <strong>{email}</strong>
          </p>
        </div>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="mt-4 text-center space-y-2">
          <button
            onClick={handleResendCode}
            disabled={isResending}
            className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
          >
            {isResending ? 'Sending...' : "Didn't receive the code? Resend"}
          </button>

          <div>
            <button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-500">
              ← Back to signup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
