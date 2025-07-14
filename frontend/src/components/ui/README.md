# UI Component Library

A collection of reusable React components built with TypeScript and Tailwind CSS.

## Installation

All components are available through the main export:

```typescript
import { Button, Input, Card, Modal, Spinner, ToastProvider } from '@/components/ui'
```

## Components

### Button

A versatile button component with multiple variants and states.

#### Props

| Prop      | Type                                   | Default     | Description             |
| --------- | -------------------------------------- | ----------- | ----------------------- |
| variant   | `'primary' \| 'secondary' \| 'danger'` | `'primary'` | Visual style variant    |
| size      | `'small' \| 'medium' \| 'large'`       | `'medium'`  | Button size             |
| isLoading | `boolean`                              | `false`     | Shows loading spinner   |
| fullWidth | `boolean`                              | `false`     | Makes button full width |
| disabled  | `boolean`                              | `false`     | Disables the button     |
| children  | `React.ReactNode`                      | required    | Button content          |

#### Usage

```tsx
<Button variant="primary" size="medium" onClick={handleClick}>
  Click me
</Button>

<Button variant="danger" isLoading>
  Deleting...
</Button>
```

### Input

A form input component with validation states and icon support.

#### Props

| Prop       | Type              | Default | Description             |
| ---------- | ----------------- | ------- | ----------------------- |
| label      | `string`          | -       | Input label             |
| error      | `string`          | -       | Error message           |
| success    | `boolean`         | `false` | Success state           |
| helperText | `string`          | -       | Helper text below input |
| fullWidth  | `boolean`         | `false` | Makes input full width  |
| leftIcon   | `React.ReactNode` | -       | Icon on the left        |
| rightIcon  | `React.ReactNode` | -       | Icon on the right       |

#### Usage

```tsx
<Input
  label="Email"
  type="email"
  placeholder="john@example.com"
  error="Invalid email address"
  leftIcon={<IconMail size={16} />}
/>
```

### Card

A flexible container component with optional header and footer.

#### Components

- `Card` - Main container
- `CardHeader` - Header section with title and optional action
- `CardBody` - Main content area
- `CardFooter` - Footer section with optional divider

#### Card Props

| Prop    | Type                                       | Default     | Description      |
| ------- | ------------------------------------------ | ----------- | ---------------- |
| variant | `'default' \| 'outlined' \| 'elevated'`    | `'default'` | Visual style     |
| padding | `'none' \| 'small' \| 'medium' \| 'large'` | `'medium'`  | Internal padding |

#### Usage

```tsx
<Card variant="elevated">
  <CardHeader title="Card Title" subtitle="Optional subtitle" action={<Button size="small">Action</Button>} />
  <CardBody>
    <p>Card content goes here</p>
  </CardBody>
  <CardFooter>
    <Button>Footer Action</Button>
  </CardFooter>
</Card>
```

### Modal

A fully accessible modal dialog component.

#### Props

| Prop                | Type                                             | Default    | Description            |
| ------------------- | ------------------------------------------------ | ---------- | ---------------------- |
| isOpen              | `boolean`                                        | required   | Controls visibility    |
| onClose             | `() => void`                                     | required   | Close handler          |
| title               | `string`                                         | -          | Modal title            |
| size                | `'small' \| 'medium' \| 'large' \| 'fullscreen'` | `'medium'` | Modal size             |
| closeOnOverlayClick | `boolean`                                        | `true`     | Close on overlay click |
| closeOnEscape       | `boolean`                                        | `true`     | Close on Escape key    |
| showCloseButton     | `boolean`                                        | `true`     | Show close button      |
| footer              | `React.ReactNode`                                | -          | Footer content         |

#### Usage

```tsx
const [isOpen, setIsOpen] = useState(false)

;<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Edit Profile"
  footer={
    <div className="flex gap-2">
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button>Save</Button>
    </div>
  }
>
  <form>{/* Form content */}</form>
</Modal>
```

### Loading Components

#### Spinner

Animated loading spinner.

```tsx
<Spinner size="medium" color="primary" />
```

#### Skeleton

Placeholder for loading content.

```tsx
<Skeleton variant="text" width="80%" />
<Skeleton variant="circular" width={40} height={40} />
<Skeleton variant="rectangular" height={200} />
```

#### LoadingOverlay

Overlay with spinner for loading states.

```tsx
<LoadingOverlay isLoading={isLoading} message="Loading data...">
  <YourContent />
</LoadingOverlay>
```

#### SkeletonCard

Pre-built skeleton for card layouts.

```tsx
<SkeletonCard showAvatar lines={3} />
```

### Toast Notifications

Global notification system.

#### Setup

Wrap your app with `ToastProvider`:

```tsx
import { ToastProvider } from '@/components/ui'

function App() {
  return (
    <ToastProvider maxToasts={5}>
      <YourApp />
    </ToastProvider>
  )
}
```

#### Usage

```tsx
import { useToast, useToastActions } from '@/components/ui'

// Basic usage
const { addToast } = useToast()

addToast({
  title: 'Success!',
  description: 'Your changes have been saved.',
  type: 'success',
  duration: 5000,
})

// Convenience methods
const { success, error, warning, info } = useToastActions()

success('Saved!', 'Your changes have been saved.')
error('Error!', 'Something went wrong.')
```

#### Toast Options

| Option      | Type                                          | Default  | Description                      |
| ----------- | --------------------------------------------- | -------- | -------------------------------- |
| title       | `string`                                      | required | Toast title                      |
| description | `string`                                      | -        | Additional details               |
| type        | `'success' \| 'error' \| 'warning' \| 'info'` | `'info'` | Toast type                       |
| duration    | `number`                                      | `5000`   | Auto-dismiss time (0 to disable) |
| action      | `{ label: string, onClick: () => void }`      | -        | Action button                    |

## Theme Tokens

Use the design tokens for consistent styling:

```tsx
import { theme } from '@/theme/tokens'

const styles = {
  color: theme.colors.primary[500],
  padding: theme.spacing.md,
  fontSize: theme.typography.fontSize.lg,
}
```

## Accessibility

All components are built with accessibility in mind:

- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Screen reader friendly

## Examples

See the Storybook for interactive examples of all components:

```bash
npm run storybook
```
