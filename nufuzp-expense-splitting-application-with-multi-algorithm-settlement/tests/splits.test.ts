import { describe, it, expect } from 'vitest'
import { calculateSplit, calculateEqualSplit } from '@/lib/splits'
import { dollarsToCents, centsToDollars } from '@/lib/money'

describe('Requirement 2: Monetary Values & Integer Arithmetic', () => {
  it('should split $100.00 among 3 people exactly as 3333 + 3333 + 3334', () => {
    const totalCents = 10000 // $100.00
    const participants = ['u1', 'u2', 'u3']
    const result = calculateEqualSplit(totalCents, participants)
    
    expect(result).toHaveLength(3)
    expect(result[0].amount).toBe(3333)
    expect(result[1].amount).toBe(3333)
    expect(result[2].amount).toBe(3334)
    expect(result.reduce((sum, r) => sum + r.amount, 0)).toBe(totalCents)
  })

  it('should handle dollar/cent conversions without float errors', () => {
    expect(dollarsToCents(10.50)).toBe(1050)
    expect(centsToDollars(1050)).toBe(10.50)
  })
})

describe('Requirement 3: Split Type Support', () => {
  const total = 10000

  it('supports EXACT split', () => {
    const participants = [
      { userId: 'u1', amount: 5000 },
      { userId: 'u2', amount: 5000 }
    ]
    const result = calculateSplit('EXACT', total, participants)
    expect(result[0].amount).toBe(5000)
    expect(result[1].amount).toBe(5000)
  })

  it('supports PERCENTAGE split with rounding remainder', () => {
    const participants = [
      { userId: 'u1', percentage: 33.33 },
      { userId: 'u2', percentage: 33.33 },
      { userId: 'u3', percentage: 33.34 }
    ]
    const result = calculateSplit('PERCENTAGE', total, participants)
    expect(result.reduce((sum, r) => sum + r.amount, 0)).toBe(total)
  })

  it('supports SHARE ratio split (2:1:1)', () => {
    const participants = [
      { userId: 'u1', share: 2 },
      { userId: 'u2', share: 1 },
      { userId: 'u3', share: 1 }
    ]
    const result = calculateSplit('SHARE', total, participants)
    expect(result[0].amount).toBe(5000)
    expect(result[1].amount).toBe(2500)
    expect(result[2].amount).toBe(2500)
  })
})
