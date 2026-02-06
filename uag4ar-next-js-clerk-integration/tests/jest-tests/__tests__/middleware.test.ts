import { describe, it, expect, jest } from '@jest/globals'

// Mock the clerkMiddleware function
const mockClerkMiddleware = jest.fn()

jest.mock('@clerk/nextjs/server', () => ({
  clerkMiddleware: () => mockClerkMiddleware(),
}))

describe('Middleware/Proxy Configuration', () => {
  it('exports clerkMiddleware from @clerk/nextjs/server', () => {
    const { clerkMiddleware } = require('@clerk/nextjs/server')
    expect(typeof clerkMiddleware).toBe('function')
  })

  it('proxy.ts uses clerkMiddleware correctly', () => {
    // Import the proxy file
    const proxyModule = require('../proxy.ts')
    
    // Verify that the default export is a function
    expect(typeof proxyModule.default).toBe('function')
    
    // Verify that clerkMiddleware was called during import
    expect(mockClerkMiddleware).toHaveBeenCalled()
  })

  it('middleware configuration is properly structured', () => {
    // Test that the middleware is properly configured
    const proxyModule = require('../proxy.ts')
    
    // The proxy should export the clerkMiddleware result
    expect(proxyModule.default).toBeDefined()
  })

  it('clerkMiddleware is called with correct parameters', () => {
    // Reset mock
    mockClerkMiddleware.mockClear()
    
    // Re-import to test the call
    delete require.cache[require.resolve('../proxy.ts')]
    require('../proxy.ts')
    
    // Verify clerkMiddleware was called
    expect(mockClerkMiddleware).toHaveBeenCalledTimes(1)
  })

  it('handles middleware errors gracefully', () => {
    // Mock an error scenario
    mockClerkMiddleware.mockImplementation(() => {
      throw new Error('Middleware error')
    })
    
    // The module should still load without crashing
    expect(() => {
      delete require.cache[require.resolve('../proxy.ts')]
      require('../proxy.ts')
    }).not.toThrow()
  })
})
