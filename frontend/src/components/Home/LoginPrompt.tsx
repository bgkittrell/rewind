import React from 'react'

interface LoginPromptProps {
  onSignInClick: () => void
}

export const LoginPrompt: React.FC<LoginPromptProps> = ({ onSignInClick }) => (
  <div className="bg-white rounded-lg p-8 text-center">
    <div className="text-gray-400 mb-4">
      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in to get recommendations</h3>
    <p className="text-gray-600 mb-4">Sign in to your account to see personalized podcast episode recommendations.</p>
    <button
      onClick={onSignInClick}
      className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
    >
      Sign In
    </button>
  </div>
)
