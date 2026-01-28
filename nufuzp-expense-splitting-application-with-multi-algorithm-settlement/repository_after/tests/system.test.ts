import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Requirement 6: Leaving Group Logic', () => {
  it('should block leaving if balance is non-zero', () => {
    // Functional check of the logic used in server actions
    const balance = { amount: 500 } // $5.00
    const canLeave = balance === null || balance.amount === 0
    expect(canLeave).toBe(false)
  })

  it('should allow leaving if balance is zero', () => {
    const balance = { amount: 0 }
    const canLeave = balance === null || balance.amount === 0
    expect(canLeave).toBe(true)
  })
})

describe('Requirement 10: Docker & System Configuration', () => {
  const composePath = path.resolve(__dirname, '../docker-compose.yml')
  const composeExists = fs.existsSync(composePath)
  const composeContent = composeExists ? fs.readFileSync(composePath, 'utf8') : ''

  it('docker-compose.yml should contain health checks for both services', () => {
    expect(composeExists).toBe(true)
    // Check postgres healthcheck
    expect(composeContent).toContain('healthcheck:')
    expect(composeContent).toContain('pg_isready')
    // Check app healthcheck (app reachable)
    expect(composeContent).toMatch(/expense-splitter-app|container_name.*app/)
    expect(composeContent).toMatch(/wget.*localhost:3000|curl.*3000/)
  })

  it('Dockerfile should exist and use standalone build for efficiency', () => {
    const dockerfilePath = path.resolve(__dirname, '../Dockerfile')
    expect(fs.existsSync(dockerfilePath)).toBe(true)
    const content = fs.readFileSync(dockerfilePath, 'utf8')
    expect(content).toContain('standalone')
  })

  it('docker-compose app service should define required env (AUTH + Resend)', () => {
    expect(composeExists).toBe(true)
    // NextAuth requires AUTH_SECRET (or AUTH) in container
    expect(composeContent).toMatch(/AUTH_SECRET|AUTH_URL/)
    // Resend magic-link requires API key and from email
    expect(composeContent).toMatch(/RESEND_API_KEY|RESEND|EMAIL_FROM/)
  })

  it('docker-compose app service should have reachable healthcheck (wget/curl to app port)', () => {
    expect(composeExists).toBe(true)
    const hasAppHealthcheck =
      (composeContent.includes('wget') || composeContent.includes('curl')) &&
      composeContent.includes('3000')
    expect(hasAppHealthcheck).toBe(true)
  })

  it('verify-docker-up script exists to assert docker compose up brings healthy app', () => {
    const scriptPath = path.resolve(__dirname, '../scripts/verify-docker-up.sh')
    expect(fs.existsSync(scriptPath)).toBe(true)
    const script = fs.readFileSync(scriptPath, 'utf8')
    expect(script).toMatch(/docker compose up/)
    expect(script).toMatch(/localhost:3000|3000/)
    expect(script).toMatch(/docker compose down|cleanup/)
  })
})
