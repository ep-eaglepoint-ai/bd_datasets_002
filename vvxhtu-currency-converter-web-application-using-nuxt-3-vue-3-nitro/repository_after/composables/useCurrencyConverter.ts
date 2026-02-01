/**
 * Composable for currency conversion functionality
 * Provides reactive state and methods for Vue components
 */

import { ref, computed } from 'vue'
import {
  CurrencyConverter,
  type ConversionResult,
  type ConversionOptions
} from '~/utils/currencyConverter'

export const useCurrencyConverter = () => {
  const converter = ref<CurrencyConverter | null>(null)
  const isInitialized = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastResult = ref<ConversionResult | null>(null)

  const initialize = async () => {
    if (isInitialized.value) return

    isLoading.value = true
    error.value = null

    try {
      converter.value = new CurrencyConverter()
      await converter.value.initialize()
      isInitialized.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to initialize converter'
    } finally {
      isLoading.value = false
    }
  }

  const convert = (
    amount: string,
    from: string,
    to: string,
    options?: ConversionOptions
  ): ConversionResult | null => {
    if (!converter.value) {
      error.value = 'Converter not initialized'
      return null
    }

    error.value = null

    try {
      const result = converter.value.convert(amount, from, to, options)
      lastResult.value = result
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Conversion failed'
      return null
    }
  }

  const refreshRates = async () => {
    if (!converter.value) return

    isLoading.value = true
    error.value = null

    try {
      await converter.value.refreshRates()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to refresh rates'
    } finally {
      isLoading.value = false
    }
  }

  const availableCurrencies = computed(() => {
    return converter.value?.getAvailableCurrencies() || []
  })

  const isStale = computed(() => {
    return converter.value?.isDataStale() || false
  })

  const lastUpdated = computed(() => {
    return converter.value?.getLastUpdated() || 0
  })

  const rateMetadata = computed(() => {
    return converter.value?.getRateMetadata() || null
  })

  const lockRate = (from: string, to: string) => {
    return converter.value?.lockCurrentRate(from, to)
  }

  const clearLockedRates = () => {
    converter.value?.clearLockedRates()
  }

  const searchCurrencies = (query: string) => {
    return converter.value?.searchCurrencies(query) || []
  }

  return {
    // State
    isInitialized,
    isLoading,
    error,
    lastResult,

    // Computed
    availableCurrencies,
    isStale,
    lastUpdated,
    rateMetadata,

    // Methods
    initialize,
    convert,
    refreshRates,
    lockRate,
    clearLockedRates,
    searchCurrencies
  }
}
