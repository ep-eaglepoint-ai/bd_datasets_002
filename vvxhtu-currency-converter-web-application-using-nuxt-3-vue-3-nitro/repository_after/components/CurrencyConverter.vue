<template>
  <div class="converter-card">
    <h1 class="converter-title">Currency Converter</h1>

    <!-- From Currency -->
    <div class="input-group">
      <label for="from-amount">Amount</label>
      <div class="input-row">
        <input
          id="from-amount"
          v-model="fromAmount"
          type="text"
          class="amount-input"
          placeholder="Enter amount"
          aria-label="Amount to convert"
          @input="handleAmountChange"
        />
        <select
          v-model="fromCurrency"
          class="currency-select"
          aria-label="From currency"
          @change="handleConvert"
        >
          <option v-for="currency in availableCurrencies" :key="currency" :value="currency">
            {{ currency }}
          </option>
        </select>
      </div>
    </div>

    <!-- Swap Button -->
    <button
      class="swap-button"
      aria-label="Swap currencies"
      @click="handleSwap"
    >
      ⇅
    </button>

    <!-- To Currency -->
    <div class="input-group">
      <label for="to-currency">Convert to</label>
      <div class="input-row">
        <select
          id="to-currency"
          v-model="toCurrency"
          class="currency-select"
          style="width: 100%"
          aria-label="To currency"
          @change="handleConvert"
        >
          <option v-for="currency in availableCurrencies" :key="currency" :value="currency">
            {{ currency }}
          </option>
        </select>
      </div>
    </div>

    <!-- Result -->
    <div v-if="result" class="result-section">
      <div class="result-amount">
        {{ formatResult(result.toAmount, toCurrency) }}
        <span v-if="result.locked" class="lock-indicator">🔒 Locked</span>
      </div>
      <div class="result-rate">
        1 {{ fromCurrency }} = {{ result.rate }} {{ toCurrency }}
      </div>
      <div class="raw-value">
        Raw: {{ result.rawUnrounded }} (rounded to {{ result.roundedTo }} decimals)
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message" role="alert">
      {{ error }}
    </div>

    <!-- Stale Data Warning -->
    <div v-if="isStale" class="stale-warning">
      ⚠️ Rates may be outdated. Last updated: {{ formatTimestamp(lastUpdated) }}
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button class="action-button primary" @click="handleRefresh">
        Refresh Rates
      </button>
      <button class="action-button secondary" @click="toggleLock">
        {{ isLocked ? 'Unlock Rate' : 'Lock Rate' }}
      </button>
    </div>

    <!-- Metadata -->
    <div v-if="metadata" class="metadata-section">
      <div class="metadata-row">
        <span>Base:</span>
        <span>{{ metadata.base }}</span>
      </div>
      <div class="metadata-row">
        <span>Source:</span>
        <span>{{ metadata.source }}</span>
      </div>
      <div class="metadata-row">
        <span>Date:</span>
        <span>{{ metadata.date }}</span>
      </div>
      <div class="metadata-row">
        <span>Last Updated:</span>
        <span>{{ formatTimestamp(lastUpdated) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  CurrencyConverter,
  type ConversionResult,
  CURRENCY_MINOR_UNITS
} from '~/utils/currencyConverter'

// State
const converter = ref<CurrencyConverter | null>(null)
const fromAmount = ref('100')
const fromCurrency = ref('EUR')
const toCurrency = ref('USD')
const result = ref<ConversionResult | null>(null)
const error = ref('')
const isLocked = ref(false)
const lastUpdated = ref(0)
const metadata = ref<{ base: string; date: string; source: string } | null>(null)

// Computed
const availableCurrencies = computed(() => {
  return converter.value?.getAvailableCurrencies() || ['EUR', 'USD', 'GBP', 'JPY']
})

const isStale = computed(() => {
  return converter.value?.isDataStale(3600000) || false
})

// Methods
const handleConvert = () => {
  if (!converter.value || !fromAmount.value) {
    result.value = null
    return
  }

  error.value = ''

  try {
    result.value = converter.value.convert(
      fromAmount.value,
      fromCurrency.value,
      toCurrency.value,
      { lockRate: isLocked.value }
    )
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Conversion failed'
    result.value = null
  }
}

const handleAmountChange = () => {
  handleConvert()
}

const handleSwap = () => {
  const temp = fromCurrency.value
  fromCurrency.value = toCurrency.value
  toCurrency.value = temp
  handleConvert()
}

const handleRefresh = async () => {
  if (!converter.value) return

  try {
    await converter.value.refreshRates()
    lastUpdated.value = converter.value.getLastUpdated()
    metadata.value = converter.value.getRateMetadata()
    handleConvert()
  } catch (e) {
    error.value = 'Failed to refresh rates'
  }
}

const toggleLock = () => {
  if (!converter.value) return

  if (isLocked.value) {
    converter.value.clearLockedRates()
    isLocked.value = false
  } else {
    converter.value.lockCurrentRate(fromCurrency.value, toCurrency.value)
    isLocked.value = true
  }
  handleConvert()
}

const formatResult = (amount: string, currency: string) => {
  const minorUnits = CURRENCY_MINOR_UNITS[currency] ?? 2
  const symbol = getCurrencySymbol(currency)
  return `${symbol}${amount}`
}

const getCurrencySymbol = (code: string): string => {
  const symbols: Record<string, string> = {
    EUR: '€', USD: '$', GBP: '£', JPY: '¥', CHF: 'CHF ',
    CAD: 'C$', AUD: 'A$', CNY: '¥', INR: '₹', KWD: 'KD '
  }
  return symbols[code] || code + ' '
}

const formatTimestamp = (ts: number) => {
  if (!ts) return 'N/A'
  return new Date(ts).toLocaleString()
}

// Initialize on mount
onMounted(async () => {
  converter.value = new CurrencyConverter()
  await converter.value.initialize()
  lastUpdated.value = converter.value.getLastUpdated()
  metadata.value = converter.value.getRateMetadata()
  handleConvert()
})
</script>
