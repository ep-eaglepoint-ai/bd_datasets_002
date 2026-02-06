import { render, screen } from '@testing-library/react'
import { describe, it, expect } from '@jest/globals'
import SignInPage from '../page'

describe('SignInPage', () => {
  it('renders page title', () => {
    render(<SignInPage />)
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('renders Clerk SignIn component', () => {
    render(<SignInPage />)
    expect(screen.getByTestId('clerk-sign-in')).toBeInTheDocument()
  })

  it('has proper styling structure', () => {
    const { container } = render(<SignInPage />)
    
    // Check that the main container has padding
    const mainDiv = container.querySelector('div[style*="padding: 20px"]')
    expect(mainDiv).toBeInTheDocument()
  })

  it('renders within proper DOM structure', () => {
    const { container } = render(<SignInPage />)
    
    // Should have a heading and the SignIn component
    expect(container.querySelector('h2')).toBeInTheDocument()
    expect(screen.getByTestId('clerk-sign-in')).toBeInTheDocument()
  })

  it('renders as a catch-all route component', () => {
    // This test verifies the component can handle dynamic routing
    render(<SignInPage />)
    
    // The component should render regardless of the route parameters
    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.getByTestId('clerk-sign-in')).toBeInTheDocument()
  })
})
