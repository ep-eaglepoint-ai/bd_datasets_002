import { render, screen } from '@testing-library/react'
import { describe, it, expect } from '@jest/globals'
import HomePage from '../page'

describe('HomePage', () => {
  it('renders welcome message', () => {
    render(<HomePage />)
    expect(screen.getByText('Welcome to the Clerk-integrated App')).toBeInTheDocument()
  })

  it('renders description about Clerk integration', () => {
    render(<HomePage />)
    expect(screen.getByText('This app is integrated with Clerk using the App Router.')).toBeInTheDocument()
  })

  it('renders SignInButton and SignUpButton', () => {
    render(<HomePage />)
    
    const signInButton = screen.getByTestId('sign-in-button')
    const signUpButton = screen.getByTestId('sign-up-button')
    
    expect(signInButton).toBeInTheDocument()
    expect(signUpButton).toBeInTheDocument()
  })

  it('renders buttons with correct text', () => {
    render(<HomePage />)
    
    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.getByText('Sign Up')).toBeInTheDocument()
  })

  it('has proper CSS classes', () => {
    const { container } = render(<HomePage />)
    
    const mainDiv = container.querySelector('.p-8')
    expect(mainDiv).toBeInTheDocument()
    
    const heading = container.querySelector('.text-2xl')
    expect(heading).toBeInTheDocument()
    
    const paragraph = container.querySelector('.text-gray-700')
    expect(paragraph).toBeInTheDocument()
  })

  it('renders buttons in a flex container', () => {
    const { container } = render(<HomePage />)
    
    const buttonContainer = container.querySelector('.flex.gap-8')
    expect(buttonContainer).toBeInTheDocument()
    
    const buttons = buttonContainer?.querySelectorAll('button')
    expect(buttons?.length).toBe(2)
  })
})
