/**
 * Server-side API route for fetching exchange rates
 * Uses Nitro server engine
 *
 * This endpoint simulates fetching rates from ECB (European Central Bank)
 * In production, this would fetch from the actual ECB API
 */

import { defineEventHandler, createError } from 'h3'

// Mock exchange rates (simulates ECB data)
const MOCK_RATES: Record<string, string> = {
  'USD': '1.0856',
  'GBP': '0.8567',
  'JPY': '162.34',
  'CHF': '0.9423',
  'CAD': '1.4789',
  'AUD': '1.6543',
  'CNY': '7.8234',
  'INR': '90.5678',
  'KWD': '0.3342',
  'BHD': '0.4102',
}

// Cache
let cachedRates: {
  base: string
  date: string
  timestamp: number
  source: string
  rates: Record<string, string>
} | null = null

let cacheTimestamp = 0
const CACHE_TTL = 60000 // 1 minute

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const forceRefresh = query.refresh === 'true'

  // Check cache
  if (!forceRefresh && cachedRates && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedRates
  }

  try {
    // In production, fetch from ECB API:
    // const response = await fetch('https://api.exchangerate.host/latest?base=EUR')
    // const data = await response.json()

    // Simulated response
    const data = {
      base: 'EUR',
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      source: 'European Central Bank (simulated)',
      rates: { ...MOCK_RATES }
    }

    // Validate response
    if (!data.base || !data.rates) {
      throw createError({
        statusCode: 502,
        message: 'Invalid response from rate provider'
      })
    }

    // Update cache
    cachedRates = data
    cacheTimestamp = Date.now()

    return data
  } catch (error) {
    // Return cached data if available
    if (cachedRates) {
      return {
        ...cachedRates,
        stale: true,
        error: 'Using cached rates due to fetch failure'
      }
    }

    throw createError({
      statusCode: 503,
      message: 'Exchange rate service unavailable'
    })
  }
})

function getQuery(event: any): Record<string, string> {
  const url = event.node?.req?.url || ''
  const searchParams = new URLSearchParams(url.split('?')[1] || '')
  const query: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    query[key] = value
  })
  return query
}
