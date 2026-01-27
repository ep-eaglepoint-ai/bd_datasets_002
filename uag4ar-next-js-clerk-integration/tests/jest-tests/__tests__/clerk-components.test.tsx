import { render, screen } from '@testing-library/react'
import { describe, it, expect } from '@jest/globals'

// Test individual Clerk components
describe('Clerk Components Rendering', () => {
  it('renders SignInButton component', () => {
    const SignInButton = require('@clerk/nextjs').SignInButton
    const { container } = render(<SignInButton><button>Sign In</button></SignInButton>)
    
    const button = screen.getByTestId('sign-in-button')
    expect(button).toBeTruthy()
    expect(button.textContent).toBe('Sign In')
  })

  it('renders SignUpButton component', () => {
    const SignUpButton = require('@clerk/nextjs').SignUpButton
    const { container } = render(<SignUpButton><button>Sign Up</button></SignUpButton>)
    
    const button = screen.getByTestId('sign-up-button')
    expect(button).toBeTruthy()
    expect(button.textContent).toBe('Sign Up')
  })

  it('renders UserButton component', () => {
    const UserButton = require('@clerk/nextjs').UserButton
    const { container } = render(<UserButton />)
    
    const userButton = screen.getByTestId('user-button')
    expect(userButton).toBeTruthy()
  })

  it('renders SignIn component', () => {
    const SignIn = require('@clerk/nextjs').SignIn
    const { container } = render(<SignIn />)
    
    const signInComponent = screen.getByTestId('clerk-sign-in')
    expect(signInComponent).toBeTruthy()
  })

  it('renders SignUp component', () => {
    const SignUp = require('@clerk/nextjs').SignUp
    const { container } = render(<SignUp />)
    
    const signUpComponent = screen.getByTestId('clerk-sign-up')
    expect(signUpComponent).toBeTruthy()
  })

  it('renders SignedIn component when condition is met', () => {
    const SignedIn = require('@clerk/nextjs').SignedIn
    const { container } = render(<SignedIn><div>Signed In Content</div></SignedIn>)
    
    const signedInComponent = screen.getByTestId('signed-in')
    expect(signedInComponent).toBeTruthy()
    expect(signedInComponent.textContent).toBe('Signed In Content')
  })

  it('renders SignedOut component when condition is met', () => {
    const SignedOut = require('@clerk/nextjs').SignedOut
    const { container } = render(<SignedOut><div>Signed Out Content</div></SignedOut>)
    
    const signedOutComponent = screen.getByTestId('signed-out')
    expect(signedOutComponent).toBeTruthy()
    expect(signedOutComponent.textContent).toBe('Signed Out Content')
  })

  it('ClerkProvider wraps children correctly', () => {
    const ClerkProvider = require('@clerk/nextjs').ClerkProvider
    const { container } = render(
      <ClerkProvider>
        <div>Test Content</div>
      </ClerkProvider>
    )
    
    expect(container.textContent).toBe('Test Content')
  })
})
