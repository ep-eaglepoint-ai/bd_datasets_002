import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const repoRoot = path.resolve(__dirname, '..')

describe('Requirement 1: Auth & Sessions', () => {
  it('should use Resend as the magic-link provider in NextAuth config', () => {
    const authPath = path.join(repoRoot, 'lib', 'auth.ts')
    expect(fs.existsSync(authPath)).toBe(true)
    const content = fs.readFileSync(authPath, 'utf8')
    expect(content).toContain('next-auth/providers/resend')
    expect(content).toContain('Resend(')
    expect(content).toMatch(/providers:\s*\[\s*Resend\(/)
  })

  it('should use JWT strategy and configure signIn and verifyRequest pages', () => {
    const authPath = path.join(repoRoot, 'lib', 'auth.ts')
    const content = fs.readFileSync(authPath, 'utf8')
    expect(content).toContain("strategy: 'jwt'")
    expect(content).toContain("signIn: '/login'")
    expect(content).toContain("verifyRequest: '/verify-email'")
    expect(content).toContain('session:')
    expect(content).toContain('pages:')
  })

  it('should gate dashboard and group routes when session is missing', () => {
    const layoutPath = path.join(repoRoot, 'app', '(dashboard)', 'layout.tsx')
    expect(fs.existsSync(layoutPath)).toBe(true)
    const content = fs.readFileSync(layoutPath, 'utf8')
    expect(content).toContain('auth()')
    expect(content).toContain('redirect')
    expect(content).toContain("'/login'")
    expect(content).toMatch(/if\s*\(\s*!session\s*\)/)
  })

  it('should redirect authenticated users from login page to dashboard', () => {
    const loginPath = path.join(repoRoot, 'app', '(auth)', 'login', 'page.tsx')
    expect(fs.existsSync(loginPath)).toBe(true)
    const content = fs.readFileSync(loginPath, 'utf8')
    expect(content).toContain('auth()')
    expect(content).toContain('session')
    expect(content).toContain("'/dashboard'")
    expect(content).toContain('redirect')
  })

  it('LoginForm should trigger magic-link flow via Resend provider', () => {
    const loginFormPath = path.join(repoRoot, 'components', 'forms', 'LoginForm.tsx')
    expect(fs.existsSync(loginFormPath)).toBe(true)
    const content = fs.readFileSync(loginFormPath, 'utf8')
    expect(content).toContain("signIn('resend'")
    expect(content).toContain('resend')
    expect(content).toMatch(/magic link|magic-link/)
  })

  it('verify-email page should exist and reference magic link', () => {
    const verifyPath = path.join(repoRoot, 'app', '(auth)', 'verify-email', 'page.tsx')
    expect(fs.existsSync(verifyPath)).toBe(true)
    const content = fs.readFileSync(verifyPath, 'utf8')
    expect(content).toMatch(/magic link|check your email/i)
  })
})
