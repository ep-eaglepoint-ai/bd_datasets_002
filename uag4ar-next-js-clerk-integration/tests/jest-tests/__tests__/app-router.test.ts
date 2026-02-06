import { describe, it, expect } from '@jest/globals'
import fs from 'fs'
import path from 'path'

describe('App Router Structure and Configuration', () => {
  const appDir = path.join(process.cwd(), 'app')

  it('has correct app directory structure', () => {
    expect(fs.existsSync(appDir)).toBe(true)
    
    const requiredFiles = [
      'layout.tsx',
      'page.tsx',
      'sign-in/[[...sign-in]]/page.tsx',
      'sign-up/[[...sign-up]]/page.tsx'
    ]

    requiredFiles.forEach(file => {
      const filePath = path.join(appDir, file)
      expect(fs.existsSync(filePath)).toBe(true)
    })
  })

  it('uses catch-all routes for auth pages', () => {
    const signInDir = path.join(appDir, 'sign-in', '[[...sign-in]]')
    const signUpDir = path.join(appDir, 'sign-up', '[[...sign-up]]')
    
    expect(fs.existsSync(signInDir)).toBe(true)
    expect(fs.existsSync(signUpDir)).toBe(true)
    
    expect(fs.existsSync(path.join(signInDir, 'page.tsx'))).toBe(true)
    expect(fs.existsSync(path.join(signUpDir, 'page.tsx'))).toBe(true)
  })

  it('has no pages directory (App Router exclusivity)', () => {
    const pagesDir = path.join(process.cwd(), 'pages')
    
    // Pages directory should not exist or be empty
    if (fs.existsSync(pagesDir)) {
      const files = fs.readdirSync(pagesDir)
      expect(files.length).toBe(0)
    }
  })

  it('layout.tsx exports proper metadata', () => {
    const layoutPath = path.join(appDir, 'layout.tsx')
    const layoutContent = fs.readFileSync(layoutPath, 'utf8')
    
    // Check for metadata export
    expect(layoutContent).toContain('export const metadata')
    expect(layoutContent).toContain('title')
    expect(layoutContent).toContain('description')
  })

  it('layout.tsx uses ClerkProvider', () => {
    const layoutPath = path.join(appDir, 'layout.tsx')
    const layoutContent = fs.readFileSync(layoutPath, 'utf8')
    
    expect(layoutContent).toContain('ClerkProvider')
    expect(layoutContent).toContain('@clerk/nextjs')
  })

  it('page.tsx uses Clerk UI components', () => {
    const pagePath = path.join(appDir, 'page.tsx')
    const pageContent = fs.readFileSync(pagePath, 'utf8')
    
    expect(pageContent).toContain('SignInButton')
    expect(pageContent).toContain('SignUpButton')
    expect(pageContent).toContain('@clerk/nextjs')
  })

  it('sign-in page uses SignIn component', () => {
    const signInPath = path.join(appDir, 'sign-in', '[[...sign-in]]', 'page.tsx')
    const signInContent = fs.readFileSync(signInPath, 'utf8')
    
    expect(signInContent).toContain('SignIn')
    expect(signInContent).toContain('@clerk/nextjs')
  })

  it('sign-up page uses SignUp component', () => {
    const signUpPath = path.join(appDir, 'sign-up', '[[...sign-up]]', 'page.tsx')
    const signUpContent = fs.readFileSync(signUpPath, 'utf8')
    
    expect(signUpContent).toContain('SignUp')
    expect(signUpContent).toContain('@clerk/nextjs')
  })

  it('has proper TypeScript configuration', () => {
    const tsConfigPath = path.join(process.cwd(), 'tsconfig.json')
    expect(fs.existsSync(tsConfigPath)).toBe(true)
    
    const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'))
    expect(tsConfig.compilerOptions).toBeDefined()
  })

  it('has proper Next.js configuration', () => {
    const nextConfigPath = path.join(process.cwd(), 'next.config.ts')
    expect(fs.existsSync(nextConfigPath)).toBe(true)
  })

  it('package.json has @clerk/nextjs@latest', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    
    expect(packageJson.dependencies['@clerk/nextjs']).toBe('latest')
  })

  it('proxy.ts exists and uses clerkMiddleware', () => {
    const proxyPath = path.join(process.cwd(), 'proxy.ts')
    expect(fs.existsSync(proxyPath)).toBe(true)
    
    const proxyContent = fs.readFileSync(proxyPath, 'utf8')
    expect(proxyContent).toContain('clerkMiddleware')
    expect(proxyContent).toContain('@clerk/nextjs/server')
  })
})
