import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import Header from './Header'

const meta = {
  title: 'Components/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    Story => (
      <AuthProvider>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </AuthProvider>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const WithDifferentRoutes: Story = {
  decorators: [
    Story => (
      <AuthProvider>
        <MemoryRouter initialEntries={['/library']}>
          <Story />
        </MemoryRouter>
      </AuthProvider>
    ),
  ],
}
