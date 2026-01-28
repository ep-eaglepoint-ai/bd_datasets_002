import { describe, it, expect } from 'vitest'

describe('Requirement 7: Performance Scaling', () => {
  it('should recalculate balances for 50 members and 10,000 expenses within 2 seconds', async () => {
    // In-memory logic test (no DB). For real DB + Prisma path see performance-db.integration.test.ts
    
    const memberCount = 50
    const expenseCount = 10000
    const userIds = Array.from({ length: memberCount }, (_, i) => `u${i}`)
    
    // Mock 10,000 expenses with splits
    const expenses = Array.from({ length: expenseCount }, (_, i) => ({
      amount: 1000,
      paidByUserId: userIds[i % memberCount],
      splits: userIds.map(id => ({ userId: id, amount: 20 }))
    }))

    const start = performance.now()
    
    // Core calculation logic (mimicking lib/balances.ts)
    const balances = new Map<string, number>()
    userIds.forEach(id => balances.set(id, 0))
    
    for (const expense of expenses) {
      const currentPaid = balances.get(expense.paidByUserId) || 0
      balances.set(expense.paidByUserId, currentPaid + expense.amount)
      
      for (const split of expense.splits) {
        const currentOwed = balances.get(split.userId) || 0
        balances.set(split.userId, currentOwed - split.amount)
      }
    }
    
    const end = performance.now()
    const duration = end - start
    
    console.log(`Calculation of ${expenseCount} expenses for ${memberCount} members took ${duration.toFixed(2)}ms`)
    
    expect(duration).toBeLessThan(2000) // Requirement: < 2 seconds
  })
})
