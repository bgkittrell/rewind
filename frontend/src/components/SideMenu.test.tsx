import { render, screen, fireEvent } from '@testing-library/react'
import { SideMenu } from './SideMenu'

describe('SideMenu', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    onProfile: vi.fn(),
    onAddPodcast: vi.fn(),
    onShareLibrary: vi.fn(),
    onSettings: vi.fn(),
    onLogout: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    render(<SideMenu {...mockProps} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Menu')).toBeInTheDocument()
    expect(screen.getByText('Navigate your podcast library')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<SideMenu {...mockProps} isOpen={false} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders all menu items', () => {
    render(<SideMenu {...mockProps} />)

    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Add Podcast')).toBeInTheDocument()
    expect(screen.getByText('Share Library')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(<SideMenu {...mockProps} />)

    const closeButton = screen.getByLabelText('Close menu')
    fireEvent.click(closeButton)

    expect(mockProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop is clicked', () => {
    render(<SideMenu {...mockProps} />)

    const backdrop = document.querySelector('.bg-black.bg-opacity-50')
    expect(backdrop).toBeInTheDocument()
    fireEvent.click(backdrop!)

    expect(mockProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('calls appropriate handlers when menu items are clicked', () => {
    render(<SideMenu {...mockProps} />)

    fireEvent.click(screen.getByText('Profile'))
    expect(mockProps.onProfile).toHaveBeenCalledTimes(1)
    expect(mockProps.onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('Add Podcast'))
    expect(mockProps.onAddPodcast).toHaveBeenCalledTimes(1)
    expect(mockProps.onClose).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByText('Share Library'))
    expect(mockProps.onShareLibrary).toHaveBeenCalledTimes(1)
    expect(mockProps.onClose).toHaveBeenCalledTimes(3)

    fireEvent.click(screen.getByText('Settings'))
    expect(mockProps.onSettings).toHaveBeenCalledTimes(1)
    expect(mockProps.onClose).toHaveBeenCalledTimes(4)

    fireEvent.click(screen.getByText('Logout'))
    expect(mockProps.onLogout).toHaveBeenCalledTimes(1)
    expect(mockProps.onClose).toHaveBeenCalledTimes(5)
  })

  it('has proper accessibility attributes', () => {
    render(<SideMenu {...mockProps} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Navigation menu')

    const closeButton = screen.getByLabelText('Close menu')
    expect(closeButton).toBeInTheDocument()
  })

  it('displays version information in footer', () => {
    render(<SideMenu {...mockProps} />)

    expect(screen.getByText(/Rewind v0\.1\.0/)).toBeInTheDocument()
    expect(screen.getByText(/Rediscover older podcast episodes/)).toBeInTheDocument()
  })
})
