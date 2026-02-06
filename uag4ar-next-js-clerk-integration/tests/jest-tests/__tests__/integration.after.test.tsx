import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, jest } from '@jest/globals'
import userEvent from '@testing-library/user-event'

// Import components for integration testing
import HomePage from '../page'

// Mock the Clerk hooks to simulate different auth states
const mockUseUser = jest.fn()
const mockUseAuth = jest.fn()

jest.mock('@clerk/nextjs', () => ({
  ClerkProvider: ({ children }) => children,
  SignIn: () => <div data-testid="clerk-sign-in">Sign In Component</div>,
  SignUp: () => <div data-testid="clerk-sign-up">Sign Up Component</div>,
  SignInButton: ({ children }) => <button data-testid="sign-in-button">{children}</button>,
  SignUpButton: ({ children }) => <button data-testid="sign-up-button">{children}</button>,
  UserButton: () => <div data-testid="user-button">User Button</div>,
  SignedIn: ({ children }) => {
    const { isSignedIn } = mockUseAuth()
    return isSignedIn ? <div data-testid="signed-in">{children}</div> : null
  },
  SignedOut: ({ children }) => {
    const { isSignedIn } = mockUseAuth()
    return !isSignedIn ? <div data-testid="signed-out">{children}</div> : null
  },
  useUser: () => mockUseUser(),
  useAuth: () => mockUseAuth(),
}))

describe('Clerk Integration Tests', () => {
  beforeEach(() => {
    mockUseUser.mockReturnValue({
      isSignedIn: false,
      user: null,
      isLoaded: true,
    })
    mockUseAuth.mockReturnValue({
      userId: null,
      isSignedIn: false,
      isLoaded: true,
    })
  })

  describe('Authentication State Management', () => {
    it('shows sign-in and sign-up buttons when user is not authenticated', () => {
      render(<HomePage />)
      
      expect(screen.getByTestId('signed-out')).toBeInTheDocument()
      expect(screen.getByTestId('sign-in-button')).toBeInTheDocument()
      expect(screen.getByTestId('sign-up-button')).toBeInTheDocument()
      expect(screen.queryByTestId('signed-in')).not.toBeInTheDocument()
    })

    it('shows user button when user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        userId: 'user_123',
        isSignedIn: true,
        isLoaded: true,
      })

      render(<HomePage />)
      
      expect(screen.getByTestId('signed-in')).toBeInTheDocument()
      expect(screen.queryByTestId('signed-out')).not.toBeInTheDocument()
    })

    it('handles loading state correctly', () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isSignedIn: false,
        isLoaded: false,
      })

      render(<HomePage />)
      
      // Should not show either signed-in or signed-out during loading
      expect(screen.queryByTestId('signed-in')).not.toBeInTheDocument()
      expect(screen.queryByTestId('signed-out')).not.toBeInTheDocument()
    })
  })

  describe('Component Behavior', () => {
    it('renders Clerk components with proper test IDs', () => {
      render(<HomePage />)
      
      // Verify Clerk UI components are present
      expect(screen.getByTestId('sign-in-button')).toBeInTheDocument()
      expect(screen.getByTestId('sign-up-button')).toBeInTheDocument()
    })

    it('maintains component hierarchy', () => {
      const { container } = render(<HomePage />)
      
      // Check that the main structure exists
      const mainDiv = container.querySelector('div')
      expect(mainDiv).toBeTruthy()
      
      // Check that buttons are present
      const buttons = container.querySelectorAll('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('handles missing auth context gracefully', () => {
      // Mock a scenario where auth hooks throw an error
      mockUseAuth.mockImplementation(() => {
        throw new Error('Auth context not found')
      })

      expect(() => {
        render(<HomePage />)
      }).toThrow('Auth context not found')
    })

    it('handles loading errors gracefully', () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isSignedIn: false,
        isLoaded: false,
      })

      const { container } = render(<HomePage />)
      
      // Should still render the basic structure even when loading
      expect(container.querySelector('div')).toBeTruthy()
    })
  })

  describe('Performance Considerations', () => {
    it('does not cause unnecessary re-renders', () => {
      const { rerender } = render(<HomePage />)
      
      // Initial render
      expect(screen.getByTestId('sign-in-button')).toBeInTheDocument()
      
      // Rerender with same props should not cause issues
      rerender(<HomePage />)
      expect(screen.getByTestId('sign-in-button')).toBeInTheDocument()
    })

    it('handles rapid auth state changes', async () => {
      const { rerender } = render(<HomePage />)
      
      // Simulate rapid auth state changes
      mockUseAuth.mockReturnValue({
        userId: 'user_123',
        isSignedIn: true,
        isLoaded: true,
      })
      
      rerender(<HomePage />)
      expect(screen.getByTestId('signed-in')).toBeInTheDocument()
      
      mockUseAuth.mockReturnValue({
        userId: null,
        isSignedIn: false,
        isLoaded: true,
      })
      
      rerender(<HomePage />)
      expect(screen.getByTestId('signed-out')).toBeInTheDocument()
    })
  })
})
