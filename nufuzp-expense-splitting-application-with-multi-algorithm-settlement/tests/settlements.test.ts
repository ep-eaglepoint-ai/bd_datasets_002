import { describe, it, expect } from 'vitest'
import { calculateMinimumSettlements } from '@/lib/settlement'

describe('Requirement 5: Settlement Algorithm Efficiency', () => {
  it('should produce at most 3 transactions for [+5000, +3000, -4000, -4000]', () => {
    const balances = [
      { userId: 'u1', amount: 5000 },
      { userId: 'u2', amount: 3000 },
      { userId: 'u3', amount: -4000 },
      { userId: 'u4', amount: -4000 }
    ]
    
    const transactions = calculateMinimumSettlements(balances)
    
    // Algorithm matches largest debtor with largest creditor
    // 1. u3 pays u1 (4000) -> u1 remains +1000, u3 settled
    // 2. u4 pays u1 (1000) -> u1 settled, u4 remains -3000
    // 3. u4 pays u2 (3000) -> u2 settled, u4 settled
    expect(transactions.length).toBeLessThanOrEqual(3)
    
    const checkBalances = new Map(balances.map(b => [b.userId, b.amount]))
    transactions.forEach(t => {
      checkBalances.set(t.fromUserId, (checkBalances.get(t.fromUserId) || 0) + t.amount) // Paying back debt
      checkBalances.set(t.toUserId, (checkBalances.get(t.toUserId) || 0) - t.amount) // Receiving payment
    })
    
    checkBalances.forEach(amount => expect(amount).toBe(0))
  })
})
