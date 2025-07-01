import type { Meta, StoryObj } from '@storybook/react'
import { PWAInstallPrompt } from './PWAInstallPrompt'

const meta: Meta<typeof PWAInstallPrompt> = {
  title: 'Components/PWAInstallPrompt',
  component: PWAInstallPrompt,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Progressive Web App installation prompt that appears when the app can be installed to the home screen.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PWAInstallPrompt>

// Note: The actual component won't show in Storybook because it depends on
// the beforeinstallprompt event, but we can show what it would look like
const MockPWAInstallPrompt = () => {
  return (
    <div className="fixed bottom-24 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 bg-red/10 rounded-lg">
          <svg className="w-6 h-6 text-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Install Rewind</h3>
          <p className="text-xs text-gray-600 mb-3">
            Add Rewind to your home screen for quick access and offline listening.
          </p>

          <div className="flex gap-2">
            <button className="flex items-center gap-1 px-3 py-1.5 bg-red text-white text-xs font-medium rounded-md hover:bg-red/90 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Install
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors">
              Not now
            </button>
          </div>
        </div>

        <button className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export const Default: Story = {
  render: () => <MockPWAInstallPrompt />,
  parameters: {
    docs: {
      description: {
        story:
          'Install prompt that appears when the PWA can be installed. The actual component only shows when the beforeinstallprompt event is available.',
      },
    },
  },
}

export const ActualComponent: Story = {
  render: () => <PWAInstallPrompt />,
  parameters: {
    docs: {
      description: {
        story:
          'The actual PWA install prompt component. This will only render if the beforeinstallprompt event is available and conditions are met.',
      },
    },
  },
}
