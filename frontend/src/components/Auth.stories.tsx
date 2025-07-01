import type { Meta, StoryObj } from '@storybook/react'
import { Auth } from './Auth'

const meta: Meta<typeof Auth> = {
  title: 'Components/Auth',
  component: Auth,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const WithCallback: Story = {
  args: {
    onAuthStateChange: (isAuthenticated, user) => {
      console.log('Auth state changed:', { isAuthenticated, user })
    },
  },
}
