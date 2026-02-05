import { describe, it, expect } from 'vitest'
import {
  parseDollarsToCents,
  dollarsToCents,
  centsToDollars,
  formatCents,
  formatCentsAsNumber,
  validateCents,
} from '@/lib/money'

describe('Requirement 2: Money as integer cents', () => {
  describe('parseDollarsToCents (string-based, no float)', () => {
    it('parses integer-only strings', () => {
      expect(parseDollarsToCents('10')).toBe(1000)
      expect(parseDollarsToCents('0')).toBe(0)
      expect(parseDollarsToCents('100')).toBe(10000)
    })

    it('parses one decimal place as tens of cents', () => {
      expect(parseDollarsToCents('10.5')).toBe(1050)
      expect(parseDollarsToCents('0.5')).toBe(50)
    })

    it('parses two decimal places exactly', () => {
      expect(parseDollarsToCents('10.50')).toBe(1050)
      expect(parseDollarsToCents('99.99')).toBe(9999)
    })

    it('truncates extra decimals (no float rounding)', () => {
      expect(parseDollarsToCents('10.999')).toBe(1099)
      expect(parseDollarsToCents('10.991')).toBe(1099)
    })

    it('handles leading decimal (e.g. .5)', () => {
      expect(parseDollarsToCents('.5')).toBe(50)
      expect(parseDollarsToCents('.99')).toBe(99)
    })

    it('strips currency symbols and spaces', () => {
      expect(parseDollarsToCents('$10.50')).toBe(1050)
      expect(parseDollarsToCents('  10.50  ')).toBe(1050)
      expect(parseDollarsToCents('1,000.50')).toBe(100050)
    })

    it('handles large but safe values', () => {
      expect(parseDollarsToCents('999999.99')).toBe(99_999_999)
      expect(parseDollarsToCents('1234567.89')).toBe(123_456_789)
    })

    it('handles negative amounts when present', () => {
      expect(parseDollarsToCents('-10.50')).toBe(-1050)
      expect(parseDollarsToCents('-0.01')).toBe(-1)
    })

    it('throws on malformed input', () => {
      expect(() => parseDollarsToCents('')).toThrow('Invalid dollar amount')
      expect(() => parseDollarsToCents('   ')).toThrow('Invalid dollar amount')
      expect(() => parseDollarsToCents('abc')).toThrow('Invalid dollar amount')
      expect(() => parseDollarsToCents('10.50.50')).toThrow('Invalid dollar amount')
      expect(() => parseDollarsToCents('.')).toThrow('Invalid dollar amount')
      expect(() => parseDollarsToCents('10.5a')).toThrow('Invalid dollar amount')
      expect(() => parseDollarsToCents('10a.50')).toThrow('Invalid dollar amount')
    })
  })

  describe('dollarsToCents / centsToDollars (internal rounding)', () => {
    it('converts round dollar amounts', () => {
      expect(dollarsToCents(10.5)).toBe(1050)
      expect(centsToDollars(1050)).toBe(10.5)
    })

    it('avoids common float pitfalls for 0.1 + 0.2', () => {
      expect(dollarsToCents(0.1 + 0.2)).toBe(30)
      expect(dollarsToCents(0.3)).toBe(30)
    })

    it('rounds to nearest cent', () => {
      expect(dollarsToCents(10.994)).toBe(1099)
      expect(dollarsToCents(10.995)).toBe(1100)
    })
  })

  describe('validateCents', () => {
    it('accepts non-negative integers', () => {
      expect(validateCents(0)).toBe(true)
      expect(validateCents(100)).toBe(true)
      expect(validateCents(999999)).toBe(true)
    })

    it('rejects negative', () => {
      expect(validateCents(-1)).toBe(false)
      expect(validateCents(-100)).toBe(false)
    })

    it('rejects non-integers', () => {
      expect(validateCents(10.5)).toBe(false)
      expect(validateCents(0.1)).toBe(false)
    })

    it('rejects NaN and Infinity', () => {
      expect(validateCents(Number.NaN)).toBe(false)
      expect(validateCents(Number.POSITIVE_INFINITY)).toBe(false)
    })
  })

  describe('formatCents / formatCentsAsNumber', () => {
    it('formats cents as currency string', () => {
      expect(formatCents(1050)).toMatch(/\$10\.50/)
      expect(formatCents(0)).toMatch(/\$0\.00/)
    })

    it('formats cents as number string with 2 decimals', () => {
      expect(formatCentsAsNumber(1050)).toBe('10.50')
      expect(formatCentsAsNumber(1099)).toBe('10.99')
    })
  })
})
