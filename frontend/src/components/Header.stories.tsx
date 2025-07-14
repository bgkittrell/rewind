import type { Meta, StoryObj } from '@storybook/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '../context/AuthContext'
import Header from './Header'

const meta = {
  title: 'Components/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    Story => {
      const router = createMemoryRouter([
        {
          path: '*',
          element: <Story />,
        },
      ])
      return (
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      )
    },
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
    Story => {
      const router = createMemoryRouter(
        [
          {
            path: '/library',
            element: <Story />,
          },
        ],
        {
          initialEntries: ['/library'],
        },
      )
      return (
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      )
    },
  ],
}
