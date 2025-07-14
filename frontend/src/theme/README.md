# Theme Tokens

This directory contains the design tokens that define the visual language of our application.

## Usage

```typescript
import { theme } from '@/theme/tokens'

// Using colors
const primaryColor = theme.colors.primary[500]
const textColor = theme.colors.text.primary

// Using spacing
const padding = theme.spacing.md

// Using typography
const fontSize = theme.typography.fontSize.lg

// Using in styled components or inline styles
const styles = {
  color: theme.colors.text.primary,
  fontSize: theme.typography.fontSize.base,
  padding: theme.spacing.md,
  borderRadius: theme.borderRadius.lg,
}
```

## Token Categories

### Colors

- Primary: Brand colors
- Gray: Neutral colors for text and backgrounds
- Success/Warning/Error: Semantic colors for feedback
- Background: Predefined background colors
- Text: Predefined text colors

### Spacing

Consistent spacing scale from xs to 3xl

### Typography

- Font families (sans, mono)
- Font sizes (xs to 5xl)
- Font weights (normal to bold)
- Line heights (tight, normal, relaxed)

### Other Tokens

- Border radius
- Shadows
- Transitions
- Breakpoints
- Z-index levels

## Extending the Theme

To add new tokens, edit the `tokens.ts` file and follow the existing patterns. Make sure to update the TypeScript types accordingly.
