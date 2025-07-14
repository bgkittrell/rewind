import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardBody, CardFooter } from './Card'
import { Button } from './Button'
import { IconDots } from '@tabler/icons-react'

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outlined', 'elevated'],
    },
    padding: {
      control: 'select',
      options: ['none', 'small', 'medium', 'large'],
    },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Card Title</h3>
        <p className="text-gray-600">
          This is a basic card component with some content inside. It can be used to group related information.
        </p>
      </div>
    ),
  },
}

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Outlined Card</h3>
        <p className="text-gray-600">This card has a more prominent border for emphasis.</p>
      </div>
    ),
  },
}

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Elevated Card</h3>
        <p className="text-gray-600">This card has a shadow to appear elevated from the page.</p>
      </div>
    ),
  },
}

export const WithHeaderAndFooter: Story = {
  args: {
    children: (
      <>
        <CardHeader
          title="Card with Header"
          subtitle="Supporting text for the card"
          action={
            <button className="text-gray-400 hover:text-gray-600">
              <IconDots size={20} />
            </button>
          }
        />
        <CardBody>
          <p>
            This card demonstrates the use of CardHeader, CardBody, and CardFooter components to create a
            well-structured card layout.
          </p>
        </CardBody>
        <CardFooter>
          <div className="flex gap-2">
            <Button variant="primary" size="small">
              Action
            </Button>
            <Button variant="secondary" size="small">
              Cancel
            </Button>
          </div>
        </CardFooter>
      </>
    ),
  },
  render: args => (
    <Card className="w-96" {...args}>
      {args.children}
    </Card>
  ),
}

export const MediaCard: Story = {
  args: {
    padding: 'none',
    children: (
      <>
        <img src="https://via.placeholder.com/320x180" alt="Placeholder" className="w-full h-48 object-cover" />
        <div className="p-6">
          <CardHeader title="Media Card" subtitle="With image header" />
          <CardBody>
            <p>Cards can include images and other media content.</p>
          </CardBody>
          <CardFooter>
            <Button fullWidth>Learn More</Button>
          </CardFooter>
        </div>
      </>
    ),
  },
  render: args => (
    <Card className="w-80 overflow-hidden" {...args}>
      {args.children}
    </Card>
  ),
}

export const SmallPadding: Story = {
  args: {
    padding: 'small',
    children: <p>Card with small padding</p>,
  },
}

export const LargePadding: Story = {
  args: {
    padding: 'large',
    children: <p>Card with large padding</p>,
  },
}

export const NoPadding: Story = {
  args: {
    padding: 'none',
    children: (
      <div>
        <div className="p-4 bg-gray-50">
          <p>Custom padding area</p>
        </div>
        <div className="p-4">
          <p>Another custom padding area</p>
        </div>
      </div>
    ),
  },
}

export const CardGrid: Story = {
  args: {
    children: (
      <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
        <Card>
          <CardHeader title="Card 1" />
          <CardBody>
            <p>First card in a grid layout</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Card 2" />
          <CardBody>
            <p>Second card in a grid layout</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Card 3" />
          <CardBody>
            <p>Third card in a grid layout</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Card 4" />
          <CardBody>
            <p>Fourth card in a grid layout</p>
          </CardBody>
        </Card>
      </div>
    ),
  },
  render: args => <div>{args.children}</div>,
}
