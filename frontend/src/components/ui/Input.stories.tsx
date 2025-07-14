import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'
import { IconMail, IconLock, IconSearch, IconUser } from '@tabler/icons-react'

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    error: {
      control: 'text',
    },
    success: {
      control: 'boolean',
    },
    helperText: {
      control: 'text',
    },
    fullWidth: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
}

export const WithLabel: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'john@example.com',
    type: 'email',
  },
}

export const WithError: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'john@example.com',
    type: 'email',
    error: 'Please enter a valid email address',
    defaultValue: 'invalid-email',
  },
}

export const WithSuccess: Story = {
  args: {
    label: 'Username',
    placeholder: 'Enter username',
    success: true,
    helperText: 'Username is available',
    defaultValue: 'johndoe',
  },
}

export const WithHelperText: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter password',
    helperText: 'Must be at least 8 characters',
  },
}

export const WithLeftIcon: Story = {
  args: {
    label: 'Email',
    placeholder: 'john@example.com',
    type: 'email',
    leftIcon: <IconMail size={16} />,
  },
}

export const WithRightIcon: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search...',
    rightIcon: <IconSearch size={16} />,
  },
}

export const FullWidth: Story = {
  args: {
    label: 'Full Name',
    placeholder: 'John Doe',
    fullWidth: true,
  },
}

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    placeholder: 'Cannot edit',
    disabled: true,
    defaultValue: 'Read only value',
  },
}

export const Required: Story = {
  args: {
    label: 'Required Field',
    placeholder: 'This field is required',
    required: true,
  },
}

export const PasswordWithIcon: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    leftIcon: <IconLock size={16} />,
    helperText: 'Use a strong password',
  },
}

export const CompleteForm: Story = {
  render: () => (
    <form className="space-y-4 w-80">
      <Input label="Username" placeholder="johndoe" leftIcon={<IconUser size={16} />} required fullWidth />
      <Input
        label="Email"
        type="email"
        placeholder="john@example.com"
        leftIcon={<IconMail size={16} />}
        required
        fullWidth
      />
      <Input
        label="Password"
        type="password"
        placeholder="Enter password"
        leftIcon={<IconLock size={16} />}
        helperText="Must be at least 8 characters"
        required
        fullWidth
      />
    </form>
  ),
}
