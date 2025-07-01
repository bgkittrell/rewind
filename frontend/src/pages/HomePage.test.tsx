import { render, screen } from '@testing-library/react'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('renders welcome message', () => {
    render(<HomePage />)
    expect(screen.getByText('Welcome to Rewind')).toBeInTheDocument()
    expect(screen.getByText('Your mobile-first PWA for rediscovering older podcast episodes.')).toBeInTheDocument()
  })

  it('shows development setup complete message', () => {
    render(<HomePage />)
    expect(screen.getByText('🚧 Development Setup Complete')).toBeInTheDocument()
  })
})
