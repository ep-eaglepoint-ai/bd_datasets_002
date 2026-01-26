import { SplitType } from '@prisma/client'
import { formatCents } from './money'

/**
 * Split calculation utilities
 * All calculations use integer arithmetic (cents)
 */

export interface SplitResult {
  userId: string
  amount: number // in cents
  percentage?: number
  share?: number
}

/**
 * Calculate EQUAL split
 * Remainder is assigned to the last participant
 * Example: $100.00 / 3 = 3333 + 3333 + 3334 cents
 */
export function calculateEqualSplit(
  totalCents: number,
  participantIds: string[]
): SplitResult[] {
  if (participantIds.length === 0) {
    throw new Error('At least one participant is required')
  }

  const baseAmount = Math.floor(totalCents / participantIds.length)
  const remainder = totalCents % participantIds.length

  return participantIds.map((userId, index) => {
    // Last participant gets the remainder
    const amount = index === participantIds.length - 1 
      ? baseAmount + remainder 
      : baseAmount
    
    return {
      userId,
      amount,
    }
  })
}

/**
 * Calculate EXACT split
 * Validates that the sum of exact amounts equals the total
 */
export function calculateExactSplit(
  totalCents: number,
  exactAmounts: { userId: string; amount: number }[]
): SplitResult[] {
  if (exactAmounts.length === 0) {
    throw new Error('At least one participant is required')
  }

  const sum = exactAmounts.reduce((acc, item) => acc + item.amount, 0)
  
  if (sum !== totalCents) {
    throw new Error(
      `Exact amounts sum to ${formatCents(sum)} but total is ${formatCents(totalCents)}`
    )
  }

  return exactAmounts.map(({ userId, amount }) => ({
    userId,
    amount,
  }))
}

/**
 * Calculate PERCENTAGE split
 * Validates that percentages sum to 100
 */
export function calculatePercentageSplit(
  totalCents: number,
  percentages: { userId: string; percentage: number }[]
): SplitResult[] {
  if (percentages.length === 0) {
    throw new Error('At least one participant is required')
  }

  const sum = percentages.reduce((acc, item) => acc + item.percentage, 0)
  
  // Allow small floating point errors (e.g., 99.99 vs 100.01)
  if (Math.abs(sum - 100) > 0.01) {
    throw new Error(`Percentages sum to ${sum}% but must equal 100%`)
  }

  let allocated = 0
  const results: SplitResult[] = []

  // Calculate amounts, rounding down for all but the last
  for (let i = 0; i < percentages.length; i++) {
    const { userId, percentage } = percentages[i]
    const isLast = i === percentages.length - 1
    
    if (isLast) {
      // Last participant gets the remainder to ensure total matches
      const amount = totalCents - allocated
      results.push({
        userId,
        amount,
        percentage,
      })
    } else {
      // Round down to avoid exceeding total
      const amount = Math.floor((totalCents * percentage) / 100)
      allocated += amount
      results.push({
        userId,
        amount,
        percentage,
      })
    }
  }

  return results
}

/**
 * Calculate SHARE split (ratio-based)
 * Example: 2:1:1 means first person pays 2 parts, others pay 1 part each
 */
export function calculateShareSplit(
  totalCents: number,
  shares: { userId: string; share: number }[]
): SplitResult[] {
  if (shares.length === 0) {
    throw new Error('At least one participant is required')
  }

  // Validate all shares are positive integers
  for (const { share } of shares) {
    if (!Number.isInteger(share) || share <= 0) {
      throw new Error('All shares must be positive integers')
    }
  }

  const totalShares = shares.reduce((acc, item) => acc + item.share, 0)
  
  if (totalShares === 0) {
    throw new Error('Total shares cannot be zero')
  }

  let allocated = 0
  const results: SplitResult[] = []

  // Calculate amounts based on share ratio
  for (let i = 0; i < shares.length; i++) {
    const { userId, share } = shares[i]
    const isLast = i === shares.length - 1
    
    if (isLast) {
      // Last participant gets the remainder
      const amount = totalCents - allocated
      results.push({
        userId,
        amount,
        share,
      })
    } else {
      // Calculate proportional amount, rounding down
      const amount = Math.floor((totalCents * share) / totalShares)
      allocated += amount
      results.push({
        userId,
        amount,
        share,
      })
    }
  }

  return results
}

/**
 * Main split calculation function
 */
export function calculateSplit(
  splitType: SplitType,
  totalCents: number,
  participants: {
    userId: string
    amount?: number // for EXACT
    percentage?: number // for PERCENTAGE
    share?: number // for SHARE
  }[]
): SplitResult[] {
  switch (splitType) {
    case 'EQUAL':
      return calculateEqualSplit(
        totalCents,
        participants.map(p => p.userId)
      )
    
    case 'EXACT':
      return calculateExactSplit(
        totalCents,
        participants.map(p => ({
          userId: p.userId,
          amount: p.amount!,
        }))
      )
    
    case 'PERCENTAGE':
      return calculatePercentageSplit(
        totalCents,
        participants.map(p => ({
          userId: p.userId,
          percentage: p.percentage!,
        }))
      )
    
    case 'SHARE':
      return calculateShareSplit(
        totalCents,
        participants.map(p => ({
          userId: p.userId,
          share: p.share!,
        }))
      )
    
    default:
      throw new Error(`Unknown split type: ${splitType}`)
  }
}
