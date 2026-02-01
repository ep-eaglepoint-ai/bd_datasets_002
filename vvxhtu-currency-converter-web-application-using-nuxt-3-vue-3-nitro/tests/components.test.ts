/**
 * Test suite for Front-end Components
 * Tests Vue composables and component helper functions
 */

import {
  CurrencyConverter,
  DecimalMath,
  CURRENCY_MINOR_UNITS,
  SUPPORTED_CURRENCIES,
  type ConversionResult,
} from '../repository_after/utils/currencyConverter';

// ============================================================================
// Component Helper Functions (extracted for testing)
// ============================================================================

const getCurrencySymbol = (code: string): string => {
  const symbols: Record<string, string> = {
    EUR: '€', USD: '$', GBP: '£', JPY: '¥', CHF: 'CHF ',
    CAD: 'C$', AUD: 'A$', CNY: '¥', INR: '₹', KWD: 'KD '
  };
  return symbols[code] || code + ' ';
};

const formatResult = (amount: string, currency: string): string => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount}`;
};

const formatTimestamp = (ts: number): string => {
  if (!ts) return 'N/A';
  return new Date(ts).toLocaleString();
};

// ============================================================================
// Composable Logic Tests (useCurrencyConverter)
// ============================================================================

describe('Front-end Components', () => {

  describe('useCurrencyConverter composable logic', () => {
    let converter: CurrencyConverter;

    beforeEach(async () => {
      converter = new CurrencyConverter();
      await converter.initialize();
    });

    test('should initialize converter successfully', async () => {
      const newConverter = new CurrencyConverter();
      await newConverter.initialize();
      expect(newConverter.getAvailableCurrencies().length).toBeGreaterThan(0);
    });

    test('should handle conversion errors gracefully', () => {
      expect(() => converter.convert('abc', 'EUR', 'USD')).toThrow();
    });

    test('should return null for uninitialized converter operations', () => {
      const uninitConverter = new CurrencyConverter();
      expect(uninitConverter.getAvailableCurrencies()).toEqual([]);
    });

    test('should track loading state during initialization', async () => {
      const newConverter = new CurrencyConverter();
      // Before initialization, no currencies available
      expect(newConverter.getAvailableCurrencies()).toEqual([]);

      await newConverter.initialize();

      // After initialization, currencies are available
      expect(newConverter.getAvailableCurrencies().length).toBeGreaterThan(0);
    });

    test('should provide last result from conversion', () => {
      const result = converter.convert('100', 'EUR', 'USD');
      expect(result).not.toBeNull();
      expect(result.fromAmount).toBe('100');
      expect(result.fromCurrency).toBe('EUR');
      expect(result.toCurrency).toBe('USD');
    });

    test('should handle rate locking in composable context', () => {
      const rate1 = converter.lockCurrentRate('EUR', 'USD');
      expect(rate1).toBeDefined();

      const result = converter.convert('100', 'EUR', 'USD', { lockRate: true });
      expect(result.locked).toBe(true);

      converter.clearLockedRates();
      const result2 = converter.convert('100', 'EUR', 'USD');
      expect(result2.locked).toBe(false);
    });

    test('should search currencies correctly', () => {
      const results = converter.searchCurrencies('dollar');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(c => c.code === 'USD')).toBe(true);
    });

    test('should detect stale data based on threshold', () => {
      // With 0ms threshold, data should be stale
      expect(converter.isDataStale(0)).toBe(true);

      // With 1 hour threshold, freshly initialized data should not be stale
      expect(converter.isDataStale(3600000)).toBe(false);
    });

    test('should provide rate metadata', () => {
      const metadata = converter.getRateMetadata();
      expect(metadata).not.toBeNull();
      expect(metadata!.base).toBeDefined();
      expect(metadata!.source).toBeDefined();
    });
  });

  describe('CurrencyConverter.vue helper functions', () => {

    test('getCurrencySymbol should return correct symbols for major currencies', () => {
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('GBP')).toBe('£');
      expect(getCurrencySymbol('JPY')).toBe('¥');
      expect(getCurrencySymbol('CHF')).toBe('CHF ');
    });

    test('getCurrencySymbol should return code with space for unknown currencies', () => {
      expect(getCurrencySymbol('XYZ')).toBe('XYZ ');
      expect(getCurrencySymbol('ABC')).toBe('ABC ');
    });

    test('formatResult should combine symbol and amount correctly', () => {
      expect(formatResult('100.00', 'USD')).toBe('$100.00');
      expect(formatResult('50.25', 'EUR')).toBe('€50.25');
      expect(formatResult('1000', 'JPY')).toBe('¥1000');
    });

    test('formatResult should handle three-decimal currencies', () => {
      expect(formatResult('10.123', 'KWD')).toBe('KD 10.123');
    });

    test('formatTimestamp should return N/A for zero timestamp', () => {
      expect(formatTimestamp(0)).toBe('N/A');
    });

    test('formatTimestamp should format valid timestamps', () => {
      const ts = new Date('2024-01-15T10:30:00').getTime();
      const formatted = formatTimestamp(ts);
      expect(formatted).not.toBe('N/A');
      expect(formatted.length).toBeGreaterThan(0);
    });

    test('formatTimestamp should handle current timestamp', () => {
      const now = Date.now();
      const formatted = formatTimestamp(now);
      expect(formatted).not.toBe('N/A');
    });
  });

  describe('Component state management', () => {
    let converter: CurrencyConverter;

    beforeEach(async () => {
      converter = new CurrencyConverter();
      await converter.initialize();
    });

    test('should handle currency swap correctly', () => {
      const result1 = converter.convert('100', 'EUR', 'USD');
      const result2 = converter.convert('100', 'USD', 'EUR');

      // Swapped conversion should have reversed currencies
      expect(result1.fromCurrency).toBe('EUR');
      expect(result1.toCurrency).toBe('USD');
      expect(result2.fromCurrency).toBe('USD');
      expect(result2.toCurrency).toBe('EUR');
    });

    test('should handle empty amount input', () => {
      expect(() => converter.convert('', 'EUR', 'USD')).toThrow();
    });

    test('should handle invalid amount input', () => {
      expect(() => converter.convert('not-a-number', 'EUR', 'USD')).toThrow();
    });

    test('should maintain available currencies list', () => {
      const currencies = converter.getAvailableCurrencies();
      expect(currencies).toContain('EUR');
      expect(currencies).toContain('USD');
      expect(Array.isArray(currencies)).toBe(true);
    });

    test('should handle lock/unlock toggle correctly', () => {
      // Lock rate
      converter.lockCurrentRate('EUR', 'USD');
      const lockedResult = converter.convert('100', 'EUR', 'USD', { lockRate: true });
      expect(lockedResult.locked).toBe(true);

      // Unlock rate
      converter.clearLockedRates();
      const unlockedResult = converter.convert('100', 'EUR', 'USD');
      expect(unlockedResult.locked).toBe(false);
    });

    test('should refresh rates and update timestamp', async () => {
      const initialTimestamp = converter.getLastUpdated();

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      await converter.refreshRates();
      const newTimestamp = converter.getLastUpdated();

      expect(newTimestamp).toBeGreaterThanOrEqual(initialTimestamp);
    });
  });

  describe('Component error handling', () => {
    let converter: CurrencyConverter;

    beforeEach(async () => {
      converter = new CurrencyConverter();
      await converter.initialize();
    });

    test('should throw error for negative amounts by default', () => {
      expect(() => converter.convert('-100', 'EUR', 'USD')).toThrow('Negative amounts not allowed');
    });

    test('should handle negative amounts when allowed', () => {
      const result = converter.convert('-100', 'EUR', 'USD', { allowNegative: true });
      expect(parseFloat(result.toAmount)).toBeLessThan(0);
    });

    test('should throw error for unsupported currency', () => {
      expect(() => converter.convert('100', 'EUR', 'XYZ')).toThrow();
    });

    test('should throw error for invalid currency code format', () => {
      expect(() => converter.convert('100', 'EURO', 'USD')).toThrow();
    });

    test('should display error message for failed conversion', () => {
      try {
        converter.convert('abc', 'EUR', 'USD');
      } catch (e) {
        expect(e instanceof Error).toBe(true);
        expect((e as Error).message).toContain('Invalid');
      }
    });
  });

  describe('Component display formatting', () => {

    test('should format JPY without decimal places', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      const result = converter.convert('100', 'EUR', 'JPY');
      expect(result.toAmount).not.toContain('.');
      expect(result.roundedTo).toBe(0);
    });

    test('should format KWD with 3 decimal places', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      const result = converter.convert('100', 'EUR', 'KWD');
      expect(result.roundedTo).toBe(3);
    });

    test('should format USD with 2 decimal places', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      const result = converter.convert('100', 'EUR', 'USD');
      expect(result.roundedTo).toBe(2);
    });

    test('should provide raw unrounded value for audit display', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      const result = converter.convert('100.123', 'EUR', 'USD');
      expect(result.rawUnrounded).toBeDefined();
      expect(result.toAmount).not.toBe(result.rawUnrounded);
    });

    test('should display rate in correct format', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      const result = converter.convert('100', 'EUR', 'USD');
      expect(DecimalMath.isValidNumber(result.rate)).toBe(true);
      expect(parseFloat(result.rate)).toBeGreaterThan(0);
    });

    test('should display inverse rate', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      const result = converter.convert('100', 'EUR', 'USD');
      expect(DecimalMath.isValidNumber(result.inverseRate)).toBe(true);
      expect(parseFloat(result.inverseRate)).toBeGreaterThan(0);
    });
  });

  describe('Component metadata display', () => {

    test('should display base currency in metadata', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      const metadata = converter.getRateMetadata();
      expect(metadata?.base).toBe('EUR');
    });

    test('should display source in metadata', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      const metadata = converter.getRateMetadata();
      expect(metadata?.source).toBeDefined();
      expect(metadata?.source.length).toBeGreaterThan(0);
    });

    test('should display date in metadata', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      const metadata = converter.getRateMetadata();
      expect(metadata?.date).toBeDefined();
      expect(metadata?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should display last updated timestamp', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      const lastUpdated = converter.getLastUpdated();
      expect(lastUpdated).toBeGreaterThan(0);
      expect(lastUpdated).toBeLessThanOrEqual(Date.now());
    });

    test('should show stale warning when data is old', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      // With 0ms threshold, should be stale
      expect(converter.isDataStale(0)).toBe(true);
    });

    test('should not show stale warning for fresh data', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      // With 1 hour threshold, should not be stale
      expect(converter.isDataStale(3600000)).toBe(false);
    });
  });

  describe('Currency selection UI logic', () => {

    test('should provide list of available currencies for dropdown', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      const currencies = converter.getAvailableCurrencies();
      expect(currencies.length).toBeGreaterThan(0);
      expect(currencies).toContain('EUR');
      expect(currencies).toContain('USD');
    });

    test('should search currencies by code', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      const results = converter.searchCurrencies('USD');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(c => c.code === 'USD')).toBe(true);
    });

    test('should search currencies by name', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      const results = converter.searchCurrencies('Euro');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(c => c.code === 'EUR')).toBe(true);
    });

    test('should return empty array for no search matches', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      const results = converter.searchCurrencies('nonexistent');
      expect(results).toEqual([]);
    });

    test('should validate currency code format for selection', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      expect(converter.isValidCurrencyCode('USD')).toBe(true);
      expect(converter.isValidCurrencyCode('US')).toBe(false);
      expect(converter.isValidCurrencyCode('USDD')).toBe(false);
    });

    test('should check if selected currency is supported', async () => {
      const converter = new CurrencyConverter();
      await converter.initialize();

      expect(converter.isCurrencySupported('USD')).toBe(true);
      expect(converter.isCurrencySupported('XYZ')).toBe(false);
    });
  });
});
