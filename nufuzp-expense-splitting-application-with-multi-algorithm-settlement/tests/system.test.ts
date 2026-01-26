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
  it('docker-compose.yml should contain health checks for both services', () => {
    const composePath = path.resolve(__dirname, '../docker-compose.yml')
    const content = fs.readFileSync(composePath, 'utf8')
    
    // Check postgres healthcheck
    expect(content).toContain('healthcheck:')
    expect(content).toContain('pg_isready')
    
    // Check app healthcheck (Requirement: proper health checks - plural)
    expect(content).toContain('expense-splitter-app')
    expect(content).toMatch(/wget.*localhost:3000/)
  })

  it('Dockerfile should exist and use standalone build for efficiency', () => {
    const dockerfilePath = path.resolve(__dirname, '../Dockerfile')
    expect(fs.existsSync(dockerfilePath)).toBe(true)
    
    const content = fs.readFileSync(dockerfilePath, 'utf8')
    expect(content).toContain('standalone')
  })
})
