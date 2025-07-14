import type { Meta, StoryObj } from '@storybook/react'
import { useState, useEffect } from 'react'
import { ToastProvider, useToast, useToastActions } from './Toast'
import { Button } from './Button'

const meta = {
  title: 'UI/Toast',
  component: ToastProvider,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ToastProvider>

export default meta
type Story = StoryObj<typeof meta>

const ToastDemo = () => {
  const { addToast } = useToast()
  const { success, error, warning, info } = useToastActions()

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-xl font-semibold mb-4">Toast Notifications Demo</h2>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">Basic Toasts</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="small" onClick={() => success('Success!', 'Your changes have been saved.')}>
            Success Toast
          </Button>
          <Button
            variant="danger"
            size="small"
            onClick={() => error('Error!', 'Something went wrong. Please try again.')}
          >
            Error Toast
          </Button>
          <Button variant="secondary" size="small" onClick={() => warning('Warning!', 'This action cannot be undone.')}>
            Warning Toast
          </Button>
          <Button variant="secondary" size="small" onClick={() => info('Info', 'New updates are available.')}>
            Info Toast
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">Toast Variations</h3>
        <div className="flex flex-wrap gap-2">
          <Button size="small" onClick={() => addToast({ title: 'Title only toast' })}>
            Title Only
          </Button>
          <Button
            size="small"
            onClick={() =>
              addToast({
                title: 'With Action',
                description: 'Click the action button below',
                action: {
                  label: 'Undo',
                  onClick: () => alert('Undo clicked!'),
                },
              })
            }
          >
            With Action
          </Button>
          <Button
            size="small"
            onClick={() =>
              addToast({
                title: 'Persistent Toast',
                description: 'This toast will not auto-dismiss',
                duration: 0,
              })
            }
          >
            No Auto-dismiss
          </Button>
          <Button
            size="small"
            onClick={() =>
              addToast({
                title: 'Quick Toast',
                description: 'Disappears in 2 seconds',
                duration: 2000,
              })
            }
          >
            Quick (2s)
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">Multiple Toasts</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            size="small"
            onClick={() => {
              success('First toast')
              setTimeout(() => warning('Second toast'), 100)
              setTimeout(() => info('Third toast'), 200)
            }}
          >
            Show 3 Toasts
          </Button>
          <Button
            size="small"
            onClick={() => {
              for (let i = 1; i <= 10; i++) {
                setTimeout(() => {
                  addToast({
                    title: `Toast ${i}`,
                    description: 'Testing max toast limit',
                    type: ['success', 'error', 'warning', 'info'][i % 4] as any,
                  })
                }, i * 100)
              }
            }}
          >
            Spam Toasts (Max 5)
          </Button>
        </div>
      </div>
    </div>
  )
}

export const Default: Story = {
  args: {
    children: <ToastDemo />,
  },
  render: args => <ToastProvider>{args.children}</ToastProvider>,
}

const AutoToastDemo = () => {
  const { success, error } = useToastActions()

  useEffect(() => {
    // Show a welcome toast after 1 second
    const timer = setTimeout(() => {
      success('Welcome!', 'This toast appeared automatically.')
    }, 1000)

    return () => clearTimeout(timer)
  }, [success])

  return (
    <div className="p-8">
      <p>A toast notification will appear automatically after 1 second.</p>
      <Button className="mt-4" onClick={() => error('Manual Toast', 'You clicked the button!')}>
        Show Manual Toast
      </Button>
    </div>
  )
}

export const AutomaticToast: Story = {
  args: {
    children: <AutoToastDemo />,
  },
  render: args => <ToastProvider>{args.children}</ToastProvider>,
}

const ApiSimulationDemo = () => {
  const { success, error } = useToastActions()
  const [isLoading, setIsLoading] = useState(false)

  const simulateApiCall = async (shouldSucceed: boolean) => {
    setIsLoading(true)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    if (shouldSucceed) {
      success('Data saved!', 'Your changes have been successfully saved.')
    } else {
      error('Save failed', 'Unable to save your changes. Please try again.')
    }

    setIsLoading(false)
  }

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-xl font-semibold mb-4">API Response Simulation</h2>
      <p className="text-gray-600 mb-4">Simulates showing toast notifications based on API responses.</p>
      <div className="flex gap-2">
        <Button onClick={() => simulateApiCall(true)} isLoading={isLoading} disabled={isLoading}>
          Successful API Call
        </Button>
        <Button variant="danger" onClick={() => simulateApiCall(false)} isLoading={isLoading} disabled={isLoading}>
          Failed API Call
        </Button>
      </div>
    </div>
  )
}

export const ApiSimulation: Story = {
  args: {
    children: <ApiSimulationDemo />,
  },
  render: args => <ToastProvider>{args.children}</ToastProvider>,
}
