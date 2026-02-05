import { describe, it, expect } from 'vitest'
import { calculateSplit } from '@/lib/splits'

/**
 * Requirement 3: Split types via UI
 * Tests use the same participant shapes the frontend sends (ExpenseForm → createExpense).
 * Verifies each split type yields correct stored splits and sum === total (balance-safe).
 */

const TOTAL_100 = 10000 // $100.00 in cents

describe('Requirement 3: Split types via UI', () => {
  describe('EQUAL – payload shape as from UI (selected participants only)', () => {
    it('creates correct splits for 3 participants and yields correct stored amounts', () => {
      const participants = [
        { userId: 'u1' },
        { userId: 'u2' },
        { userId: 'u3' },
      ]
      const result = calculateSplit('EQUAL', TOTAL_100, participants)
      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ userId: 'u1', amount: 3333 })
      expect(result[1]).toEqual({ userId: 'u2', amount: 3333 })
      expect(result[2]).toEqual({ userId: 'u3', amount: 3334 })
      expect(result.reduce((sum, r) => sum + r.amount, 0)).toBe(TOTAL_100)
    })

    it('creates correct splits for 1 participant (full amount)', () => {
      const participants = [{ userId: 'u1' }]
      const result = calculateSplit('EQUAL', TOTAL_100, participants)
      expect(result).toHaveLength(1)
      expect(result[0].amount).toBe(TOTAL_100)
      expect(result.reduce((sum, r) => sum + r.amount, 0)).toBe(TOTAL_100)
    })
  })

  describe('EXACT – payload shape as from UI (amount per user in cents)', () => {
    it('creates correct stored splits when exact amounts sum to total', () => {
      const participants = [
        { userId: 'u1', amount: 6000 },
        { userId: 'u2', amount: 4000 },
      ]
      const result = calculateSplit('EXACT', TOTAL_100, participants)
      expect(result).toHaveLength(2)
      expect(result[0].amount).toBe(6000)
      expect(result[1].amount).toBe(4000)
      expect(result.reduce((sum, r) => sum + r.amount, 0)).toBe(TOTAL_100)
    })

    it('creates correct splits for uneven exact amounts', () => {
      const participants = [
        { userId: 'u1', amount: 3333 },
        { userId: 'u2', amount: 3333 },
        { userId: 'u3', amount: 3334 },
      ]
      const result = calculateSplit('EXACT', TOTAL_100, participants)
      expect(result.reduce((sum, r) => sum + r.amount, 0)).toBe(TOTAL_100)
    })
  })

  describe('PERCENTAGE – payload shape as from UI (percentage per user)', () => {
    it('creates correct stored splits when percentages total 100%', () => {
      const participants = [
        { userId: 'u1', percentage: 50 },
        { userId: 'u2', percentage: 50 },
      ]
      const result = calculateSplit('PERCENTAGE', TOTAL_100, participants)
      expect(result).toHaveLength(2)
      expect(result[0].amount).toBe(5000)
      expect(result[1].amount).toBe(5000)
      expect(result.reduce((sum, r) => sum + r.amount, 0)).toBe(TOTAL_100)
    })

    it('allocates remainder to last participant (33.33, 33.33, 33.34)', () => {
      const participants = [
        { userId: 'u1', percentage: 33.33 },
        { userId: 'u2', percentage: 33.33 },
        { userId: 'u3', percentage: 33.34 },
      ]
      const result = calculateSplit('PERCENTAGE', TOTAL_100, participants)
      expect(result.reduce((sum, r) => sum + r.amount, 0)).toBe(TOTAL_100)
      expect(result.every((r) => r.amount >= 0)).toBe(true)
    })

    it('handles fractional percentages that sum to 100', () => {
      const participants = [
        { userId: 'u1', percentage: 25.5 },
        { userId: 'u2', percentage: 25.5 },
        { userId: 'u3', percentage: 49 },
      ]
      const result = calculateSplit('PERCENTAGE', TOTAL_100, participants)
      expect(result.reduce((sum, r) => sum + r.amount, 0)).toBe(TOTAL_100)
    })
  })

  describe('SHARE – payload shape as from UI (share integer per user)', () => {
    it('creates correct stored splits for 2:1:1 ratio', () => {
      const participants = [
        { userId: 'u1', share: 2 },
        { userId: 'u2', share: 1 },
        { userId: 'u3', share: 1 },
      ]
      const result = calculateSplit('SHARE', TOTAL_100, participants)
      expect(result).toHaveLength(3)
      expect(result[0].amount).toBe(5000)
      expect(result[1].amount).toBe(2500)
      expect(result[2].amount).toBe(2500)
      expect(result.reduce((sum, r) => sum + r.amount, 0)).toBe(TOTAL_100)
    })

    it('creates correct splits for single participant (share 1)', () => {
      const participants = [{ userId: 'u1', share: 1 }]
      const result = calculateSplit('SHARE', TOTAL_100, participants)
      expect(result[0].amount).toBe(TOTAL_100)
      expect(result.reduce((sum, r) => sum + r.amount, 0)).toBe(TOTAL_100)
    })

    it('creates correct splits for 3:2:1 ratio', () => {
      const participants = [
        { userId: 'u1', share: 3 },
        { userId: 'u2', share: 2 },
        { userId: 'u3', share: 1 },
      ]
      const result = calculateSplit('SHARE', TOTAL_100, participants)
      expect(result.reduce((sum, r) => sum + r.amount, 0)).toBe(TOTAL_100)
      expect(result[0].amount).toBe(5000) // 3/6
      expect(result[1].amount).toBe(3333) // 2/6 round down
      expect(result[2].amount).toBe(1667) // remainder
    })
  })
})

describe('Requirement 3: Split type validation (invalid inputs)', () => {
  describe('EQUAL', () => {
    it('throws when no participants', () => {
      expect(() => calculateSplit('EQUAL', TOTAL_100, [])).toThrow(
        /at least one participant/i
      )
    })
  })

  describe('EXACT', () => {
    it('throws when exact amounts do not sum to total', () => {
      const participants = [
        { userId: 'u1', amount: 5000 },
        { userId: 'u2', amount: 5000 },
      ]
      expect(() => calculateSplit('EXACT', 9999, participants)).toThrow(
        /Exact amounts sum|do not equal/i
      )
    })

    it('throws when sum exceeds total', () => {
      const participants = [
        { userId: 'u1', amount: 6000 },
        { userId: 'u2', amount: 5000 },
      ]
      expect(() => calculateSplit('EXACT', TOTAL_100, participants)).toThrow()
    })

    it('throws when no participants', () => {
      expect(() => calculateSplit('EXACT', TOTAL_100, [])).toThrow(
        /at least one participant/i
      )
    })
  })

  describe('PERCENTAGE', () => {
    it('throws when percentages do not total 100%', () => {
      const participants = [
        { userId: 'u1', percentage: 50 },
        { userId: 'u2', percentage: 40 },
      ]
      expect(() => calculateSplit('PERCENTAGE', TOTAL_100, participants)).toThrow(
        /100|percentages/i
      )
    })

    it('throws when total is over 100%', () => {
      const participants = [
        { userId: 'u1', percentage: 60 },
        { userId: 'u2', percentage: 50 },
      ]
      expect(() => calculateSplit('PERCENTAGE', TOTAL_100, participants)).toThrow()
    })

    it('throws when no participants', () => {
      expect(() => calculateSplit('PERCENTAGE', TOTAL_100, [])).toThrow(
        /at least one participant/i
      )
    })
  })

  describe('SHARE', () => {
    it('throws when share is zero', () => {
      const participants = [
        { userId: 'u1', share: 1 },
        { userId: 'u2', share: 0 },
      ]
      expect(() => calculateSplit('SHARE', TOTAL_100, participants)).toThrow(
        /positive integers|shares/i
      )
    })

    it('throws when share is negative', () => {
      const participants = [
        { userId: 'u1', share: 2 },
        { userId: 'u2', share: -1 },
      ]
      expect(() => calculateSplit('SHARE', TOTAL_100, participants)).toThrow(
        /positive integers|shares/i
      )
    })

    it('throws when share is non-integer', () => {
      const participants = [
        { userId: 'u1', share: 1.5 },
        { userId: 'u2', share: 1 },
      ]
      expect(() => calculateSplit('SHARE', TOTAL_100, participants)).toThrow(
        /positive integers|shares/i
      )
    })

    it('throws when no participants', () => {
      expect(() => calculateSplit('SHARE', TOTAL_100, [])).toThrow(
        /at least one participant/i
      )
    })
  })
})
