import { render } from '@testing-library/react'
import { Auth } from './Auth'

// Mock AWS config
vi.mock('../aws-config', () => ({}))

describe('Auth Component', () => {
  it('renders without crashing', () => {
    render(<Auth />)
    // Just test that it renders without errors
    expect(document.body).toBeInTheDocument()
  })
})
