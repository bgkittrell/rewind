import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Input } from './Input'

const meta = {
  title: 'UI/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large', 'fullscreen'],
    },
    closeOnOverlayClick: {
      control: 'boolean',
    },
    closeOnEscape: {
      control: 'boolean',
    },
    showCloseButton: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Modal>

export default meta
type Story = StoryObj<typeof meta>

const ModalDemo = (args: any) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal {...args} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

export const Default: Story = {
  render: args => <ModalDemo {...args} />,
  args: {
    isOpen: true,
    onClose: () => {},
    title: 'Modal Title',
    children: (
      <p>This is the modal content. You can put any content here including forms, images, or other components.</p>
    ),
  },
}

export const Small: Story = {
  render: args => <ModalDemo {...args} />,
  args: {
    isOpen: true,
    onClose: () => {},
    title: 'Small Modal',
    size: 'small',
    children: <p>This is a small modal with limited width.</p>,
  },
}

export const Large: Story = {
  render: args => <ModalDemo {...args} />,
  args: {
    isOpen: true,
    onClose: () => {},
    title: 'Large Modal',
    size: 'large',
    children: (
      <div className="space-y-4">
        <p>
          This is a large modal that can contain more content. It's perfect for displaying detailed information, forms,
          or complex interactions.
        </p>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore
          magna aliqua.
        </p>
      </div>
    ),
  },
}

export const WithFooter: Story = {
  render: args => <ModalDemo {...args} />,
  args: {
    title: 'Modal with Footer',
    children: <p>This modal has action buttons in the footer.</p>,
    footer: (
      <div className="flex justify-end gap-2">
        <Button variant="secondary">Cancel</Button>
        <Button variant="primary">Save Changes</Button>
      </div>
    ),
  },
}

export const NoCloseButton: Story = {
  render: args => <ModalDemo {...args} />,
  args: {
    title: 'Modal without Close Button',
    showCloseButton: false,
    children: <p>This modal doesn't have a close button. Users must click outside or press Escape to close it.</p>,
  },
}

export const NoOverlayClose: Story = {
  render: args => <ModalDemo {...args} />,
  args: {
    title: 'No Overlay Click Close',
    closeOnOverlayClick: false,
    children: <p>Clicking outside this modal won't close it. Users must use the close button or press Escape.</p>,
  },
}

export const FormModal: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Form Modal</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Edit Profile"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setIsOpen(false)}>
                Save Changes
              </Button>
            </div>
          }
        >
          <form className="space-y-4">
            <Input label="Name" placeholder="John Doe" fullWidth />
            <Input label="Email" type="email" placeholder="john@example.com" fullWidth />
            <Input label="Bio" placeholder="Tell us about yourself..." fullWidth />
          </form>
        </Modal>
      </>
    )
  },
}

export const ConfirmationModal: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button variant="danger" onClick={() => setIsOpen(true)}>
          Delete Item
        </Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Confirm Deletion"
          size="small"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setIsOpen(false)}>
                Delete
              </Button>
            </div>
          }
        >
          <p>Are you sure you want to delete this item? This action cannot be undone.</p>
        </Modal>
      </>
    )
  },
}

export const LongContent: Story = {
  render: args => <ModalDemo {...args} />,
  args: {
    title: 'Modal with Scrollable Content',
    children: (
      <div className="space-y-4">
        {Array.from({ length: 20 }, (_, i) => (
          <p key={i}>
            Paragraph {i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
            ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
          </p>
        ))}
      </div>
    ),
    footer: (
      <div className="flex justify-end">
        <Button>Close</Button>
      </div>
    ),
  },
}
