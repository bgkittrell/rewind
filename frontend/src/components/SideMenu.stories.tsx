import type { Meta, StoryObj } from '@storybook/react'
import { SideMenu } from './SideMenu'

const meta: Meta<typeof SideMenu> = {
  title: 'Components/SideMenu',
  component: SideMenu,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Navigation side menu that slides in from the left with user actions and settings.',
      },
    },
  },
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Controls whether the side menu is visible',
    },
  },
}

export default meta
type Story = StoryObj<typeof SideMenu>

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Close menu'),
    onProfile: () => console.log('Open profile'),
    onAddPodcast: () => console.log('Add podcast'),
    onShareLibrary: () => console.log('Share library'),
    onSettings: () => console.log('Open settings'),
    onLogout: () => console.log('Logout'),
  },
}

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => console.log('Close menu'),
    onProfile: () => console.log('Open profile'),
    onAddPodcast: () => console.log('Add podcast'),
    onShareLibrary: () => console.log('Share library'),
    onSettings: () => console.log('Open settings'),
    onLogout: () => console.log('Logout'),
  },
}

export const Interactive: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Close menu'),
    onProfile: () => console.log('Open profile'),
    onAddPodcast: () => console.log('Add podcast'),
    onShareLibrary: () => console.log('Share library'),
    onSettings: () => console.log('Open settings'),
    onLogout: () => console.log('Logout'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive side menu with all menu items functional. Check the browser console for action logs.',
      },
    },
  },
}
