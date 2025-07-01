import type { Meta, StoryObj } from '@storybook/react'
import { OfflineStatus } from './OfflineStatus'

// Mock the useOfflineStatus hook
const meta: Meta<typeof OfflineStatus> = {
  title: 'Components/OfflineStatus',
  component: OfflineStatus,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Status indicator showing offline state and queued requests for background sync.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof OfflineStatus>

// Mock hook for different states
const MockedOfflineStatus = ({ isOnline, queueSize }: { isOnline: boolean; queueSize: number }) => {
  // Mock the hook
  vi.doMock('../hooks/useOfflineStatus', () => ({
    useOfflineStatus: () => ({
      isOnline,
      queueSize,
      queueRequest: () => 'mock-id',
      clearQueue: () => {},
    }),
  }))

  return <OfflineStatus />
}

export const Online: Story = {
  render: () => <MockedOfflineStatus isOnline={true} queueSize={0} />,
  parameters: {
    docs: {
      description: {
        story: 'When online with no queued requests, the component renders nothing.',
      },
    },
  },
}

export const Offline: Story = {
  render: () => <MockedOfflineStatus isOnline={false} queueSize={0} />,
  parameters: {
    docs: {
      description: {
        story: 'When offline, shows an indicator that the user is offline and changes will sync when reconnected.',
      },
    },
  },
}

export const OnlineWithQueue: Story = {
  render: () => <MockedOfflineStatus isOnline={true} queueSize={3} />,
  parameters: {
    docs: {
      description: {
        story: 'When online but with queued requests, shows the number of requests being synced.',
      },
    },
  },
}

export const OnlineWithSingleRequest: Story = {
  render: () => <MockedOfflineStatus isOnline={true} queueSize={1} />,
  parameters: {
    docs: {
      description: {
        story: 'Shows singular form when there is exactly one queued request.',
      },
    },
  },
}
