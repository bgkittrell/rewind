import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SearchPage } from './SearchPage'
import { PlayerProvider } from '../context/PlayerContext'

describe('SearchPage', () => {
  const renderWithProvider = () => {
    return render(
      <PlayerProvider>
        <SearchPage />
      </PlayerProvider>
    )
  }

  it('renders search page with empty state', () => {
    renderWithProvider()
    
    expect(screen.getByText('Search your podcast library')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search episodes, podcasts, guests...')).toBeInTheDocument()
  })

  it('shows search tips in empty state', () => {
    renderWithProvider()
    
    expect(screen.getByText('Search tips:')).toBeInTheDocument()
    expect(screen.getByText('• Try searching for guest names like "John Doe"')).toBeInTheDocument()
  })
})