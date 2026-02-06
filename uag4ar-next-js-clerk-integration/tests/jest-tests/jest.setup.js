import '@testing-library/jest-dom'

// Mock Clerk components and hooks
jest.mock('@clerk/nextjs', () => ({
  ClerkProvider: ({ children }) => children,
  SignIn: () => <div data-testid="clerk-sign-in">Sign In Component</div>,
  SignUp: () => <div data-testid="clerk-sign-up">Sign Up Component</div>,
  SignInButton: ({ children }) => <button data-testid="sign-in-button">{children}</button>,
  SignUpButton: ({ children }) => <button data-testid="sign-up-button">{children}</button>,
  UserButton: () => <div data-testid="user-button">User Button</div>,
  SignedIn: ({ children }) => <div data-testid="signed-in">{children}</div>,
  SignedOut: ({ children }) => <div data-testid="signed-out">{children}</div>,
  useUser: () => ({
    isSignedIn: false,
    user: null,
    isLoaded: true,
  }),
  useAuth: () => ({
    userId: null,
    isSignedIn: false,
    isLoaded: true,
  }),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock environment variables for Clerk
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test_key'
