import { useState } from 'react'
import { LoginForm } from './LoginForm'
import { SignupForm } from './SignupForm'
import { ConfirmEmailForm } from './ConfirmEmailForm'

type AuthView = 'login' | 'signup' | 'confirm'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [currentView, setCurrentView] = useState<AuthView>('login')
  const [emailToConfirm, setEmailToConfirm] = useState('')

  if (!isOpen) return null

  const handleSwitchToSignup = () => setCurrentView('signup')
  const handleSwitchToLogin = () => setCurrentView('login')
  const handleSwitchToConfirm = (email: string) => {
    setEmailToConfirm(email)
    setCurrentView('confirm')
  }
  const handleConfirmed = () => {
    setCurrentView('login')
    setEmailToConfirm('')
  }
  const handleBackFromConfirm = () => setCurrentView('signup')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="relative max-w-md w-full mx-4">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {currentView === 'login' && (
          <LoginForm onSwitchToSignup={handleSwitchToSignup} onSwitchToConfirm={() => handleSwitchToConfirm('')} />
        )}

        {currentView === 'signup' && (
          <SignupForm onSwitchToLogin={handleSwitchToLogin} onSwitchToConfirm={handleSwitchToConfirm} />
        )}

        {currentView === 'confirm' && (
          <ConfirmEmailForm email={emailToConfirm} onConfirmed={handleConfirmed} onBack={handleBackFromConfirm} />
        )}
      </div>
    </div>
  )
}
