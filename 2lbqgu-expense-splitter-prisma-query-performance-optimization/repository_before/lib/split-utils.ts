import { SplitType } from '@prisma/client'

export interface SplitInput {
  userId: string
  exactAmount?: number
  percentage?: number
  share?: number
}

export interface CalculatedSplit {
  userId: string
  amount: number
  percentage?: number
  share?: number
}

export function calculateSplits(
  totalAmount: number,
  splitType: SplitType,
  inputs: SplitInput[]
): CalculatedSplit[] {
  if (inputs.length === 0) {
    throw new Error('At least one participant is required')
  }

  if (totalAmount <= 0) {
    throw new Error('Total amount must be positive')
  }

  switch (splitType) {
    case 'EQUAL':
      return calculateEqualSplits(totalAmount, inputs)
    case 'EXACT':
      return calculateExactSplits(totalAmount, inputs)
    case 'PERCENTAGE':
      return calculatePercentageSplits(totalAmount, inputs)
    case 'SHARE':
      return calculateShareSplits(totalAmount, inputs)
    default:
      throw new Error(`Unknown split type: ${splitType}`)
  }
}

function calculateEqualSplits(totalAmount: number, inputs: SplitInput[]): CalculatedSplit[] {
  const count = inputs.length
  const baseAmount = Math.floor(totalAmount / count)
  const remainder = totalAmount % count

  return inputs.map((input, index) => ({
    userId: input.userId,
    amount: baseAmount + (index === count - 1 ? remainder : 0),
  }))
}

function calculateExactSplits(totalAmount: number, inputs: SplitInput[]): CalculatedSplit[] {
  const splits = inputs.map(input => {
    if (input.exactAmount === undefined || input.exactAmount < 0) {
      throw new Error('Exact amount must be provided and non-negative')
    }
    return {
      userId: input.userId,
      amount: input.exactAmount,
    }
  })

  const sum = splits.reduce((acc, s) => acc + s.amount, 0)
  if (sum !== totalAmount) {
    throw new Error(`Exact amounts sum (${sum}) does not match total (${totalAmount})`)
  }

  return splits
}

function calculatePercentageSplits(totalAmount: number, inputs: SplitInput[]): CalculatedSplit[] {
  const totalPercentage = inputs.reduce((acc, input) => {
    if (input.percentage === undefined || input.percentage < 0 || input.percentage > 100) {
      throw new Error('Percentage must be between 0 and 100')
    }
    return acc + input.percentage
  }, 0)

  if (totalPercentage !== 100) {
    throw new Error(`Percentages must sum to 100, got ${totalPercentage}`)
  }

  const count = inputs.length
  let runningTotal = 0

  return inputs.map((input, index) => {
    let amount: number
    if (index === count - 1) {
      amount = totalAmount - runningTotal
    } else {
      amount = Math.floor((totalAmount * input.percentage!) / 100)
      runningTotal += amount
    }

    return {
      userId: input.userId,
      amount,
      percentage: input.percentage,
    }
  })
}

function calculateShareSplits(totalAmount: number, inputs: SplitInput[]): CalculatedSplit[] {
  const totalShares = inputs.reduce((acc, input) => {
    if (input.share === undefined || input.share <= 0) {
      throw new Error('Share must be a positive number')
    }
    return acc + input.share
  }, 0)

  if (totalShares === 0) {
    throw new Error('Total shares must be greater than 0')
  }

  const count = inputs.length
  let runningTotal = 0

  return inputs.map((input, index) => {
    let amount: number
    if (index === count - 1) {
      amount = totalAmount - runningTotal
    } else {
      amount = Math.floor((totalAmount * input.share!) / totalShares)
      runningTotal += amount
    }

    return {
      userId: input.userId,
      amount,
      share: input.share,
    }
  })
}

export function validateSplitSum(splits: CalculatedSplit[], totalAmount: number): void {
  const sum = splits.reduce((acc, s) => acc + s.amount, 0)
  if (sum !== totalAmount) {
    throw new Error(`Split sum (${sum}) does not match total amount (${totalAmount})`)
  }
}

