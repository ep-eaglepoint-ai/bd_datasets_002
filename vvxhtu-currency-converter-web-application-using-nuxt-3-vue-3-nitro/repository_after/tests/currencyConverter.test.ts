/**
 * Test suite for Currency Converter
 * Tests arbitrary-precision math, cross-rate conversion, and proper rounding
 * 
 * These tests FAIL on repository_before (floating-point issues)
 * These tests PASS on repository_after (arbitrary-precision math)
 */

import {
  CurrencyConverter,
  DecimalMath,
  CrossRateEngine,
  RateFetcher,
  CURRENCY_MINOR_UNITS,
  SUPPORTED_CURRENCIES,
} from '../currencyConverter';

describe('Currency Converter Application', () => {

  describe('Requirement 1: Currency Selection and Conversion UI', () => {
    let converter: CurrencyConverter;

    beforeEach(async () => {
      converter = new CurrencyConverter();
      await converter.initialize();
    });

    test('should validate currency codes correctly', () => {
      expect(converter.isValidCurrencyCode('USD')).toBe(true);
      expect(converter.isValidCurrencyCode('eur')).toBe(true); // lowercase should be valid
      expect(converter.isValidCurrencyCode('USDD')).toBe(false); // too long
      expect(converter.isValidCurrencyCode('US')).toBe(false); // too short
      expect(converter.isValidCurrencyCode('')).toBe(false); // empty
      expect(converter.isValidCurrencyCode('123')).toBe(false); // numbers
    });

    test('should check if currency is supported', () => {
      expect(converter.isCurrencySupported('EUR')).toBe(true);
      expect(converter.isCurrencySupported('USD')).toBe(true);
      expect(converter.isCurrencySupported('XYZ')).toBe(false);
    });

    test('should return list of available currencies', () => {
      const currencies = converter.getAvailableCurrencies();
      expect(currencies).toContain('EUR');
      expect(currencies).toContain('USD');
      expect(currencies.length).toBeGreaterThan(2);
    });

    test('should search currencies by code or name', () => {
      const results = converter.searchCurrencies('dol');
      expect(results.some(c => c.code === 'USD')).toBe(true);
    });

    test('should swap currencies correctly', async () => {
      const result = converter.convert('100', 'EUR', 'USD');
      const swapped = converter.swap('100', 'EUR', 'USD');
      
      expect(result.fromCurrency).toBe('EUR');
      expect(result.toCurrency).toBe('USD');
      expect(swapped.fromCurrency).toBe('USD');
      expect(swapped.toCurrency).toBe('EUR');
    });

    test('should provide last updated timestamp', () => {
      const timestamp = converter.getLastUpdated();
      expect(timestamp).toBeGreaterThan(0);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });

    test('should detect stale data', () => {
      // Fresh data should not be stale
      expect(converter.isDataStale(3600000)).toBe(false);
      // With 0ms max age, should be stale
      expect(converter.isDataStale(0)).toBe(true);
    });

    test('should provide rate metadata', () => {
      const metadata = converter.getRateMetadata();
      expect(metadata).not.toBeNull();
      expect(metadata!.base).toBe('EUR');
      expect(metadata!.source).toBeDefined();
      expect(metadata!.date).toBeDefined();
    });
  });

  describe('Requirement 2: Server-side Rate Fetching (Nitro API)', () => {
    test('RateFetcher should fetch rates with proper structure', async () => {
      const fetcher = new RateFetcher();
      const rates = await fetcher.fetchRates();
      
      expect(rates.base).toBe('EUR');
      expect(rates.rates).toBeDefined();
      expect(typeof rates.timestamp).toBe('number');
      expect(rates.source).toBeDefined();
    });

    test('RateFetcher should cache rates', async () => {
      const fetcher = new RateFetcher();
      await fetcher.fetchRates();
      
      const status = fetcher.getCacheStatus();
      expect(status.cached).toBe(true);
      expect(status.ttl).toBeGreaterThan(0);
    });

    test('RateFetcher should respect force refresh', async () => {
      const fetcher = new RateFetcher();
      const rates1 = await fetcher.fetchRates();
      const rates2 = await fetcher.fetchRates(true);
      
      // Timestamps should be different on force refresh
      expect(rates2.timestamp).toBeGreaterThanOrEqual(rates1.timestamp);
    });

    test('RateFetcher should clear cache', async () => {
      const fetcher = new RateFetcher();
      await fetcher.fetchRates();
      fetcher.clearCache();
      
      const status = fetcher.getCacheStatus();
      expect(status.cached).toBe(false);
    });

    test('Rate data should have valid string rates', async () => {
      const fetcher = new RateFetcher();
      const rates = await fetcher.fetchRates();
      
      for (const [code, rate] of Object.entries(rates.rates)) {
        expect(typeof rate).toBe('string');
        expect(DecimalMath.isValidNumber(rate)).toBe(true);
      }
    });
  });

  describe('Requirement 3: Arbitrary-Precision Decimal Math', () => {
    test('DecimalMath should validate number strings', () => {
      expect(DecimalMath.isValidNumber('123.45')).toBe(true);
      expect(DecimalMath.isValidNumber('-123.45')).toBe(true);
      expect(DecimalMath.isValidNumber('0.001')).toBe(true);
      expect(DecimalMath.isValidNumber('')).toBe(false);
      expect(DecimalMath.isValidNumber('abc')).toBe(false);
      expect(DecimalMath.isValidNumber('12.34.56')).toBe(false);
    });

    test('DecimalMath should add with precision', () => {
      // Classic floating-point failure case: 0.1 + 0.2 = 0.30000000000000004
      const result = DecimalMath.add('0.1', '0.2');
      expect(result).toBe('0.3');
    });

    test('DecimalMath should subtract with precision', () => {
      const result = DecimalMath.subtract('1.0', '0.9');
      // Floating point would give 0.09999999999999998
      expect(parseFloat(result)).toBeCloseTo(0.1, 10);
    });

    test('DecimalMath should multiply with precision', () => {
      const result = DecimalMath.multiply('0.1', '0.2');
      // Floating point would give 0.020000000000000004
      expect(result).toBe('0.02');
    });

    test('DecimalMath should divide with precision', () => {
      const result = DecimalMath.divide('1', '3', 10);
      expect(result.startsWith('0.333333')).toBe(true);
    });

    test('DecimalMath should handle large numbers without overflow', () => {
      const large = '99999999999999999999.99';
      const result = DecimalMath.add(large, '0.01');
      expect(result).toBe('100000000000000000000');
    });

    test('DecimalMath should detect zero correctly', () => {
      expect(DecimalMath.isZero('0')).toBe(true);
      expect(DecimalMath.isZero('0.0')).toBe(true);
      expect(DecimalMath.isZero('0.00')).toBe(true);
      expect(DecimalMath.isZero('0.001')).toBe(false);
    });

    test('DecimalMath should detect negative correctly', () => {
      expect(DecimalMath.isNegative('-1')).toBe(true);
      expect(DecimalMath.isNegative('1')).toBe(false);
      expect(DecimalMath.isNegative('-0')).toBe(false);
    });

    test('DecimalMath should round with HALF_UP strategy', () => {
      expect(DecimalMath.round('1.235', 2, 'HALF_UP')).toBe('1.24');
      expect(DecimalMath.round('1.234', 2, 'HALF_UP')).toBe('1.23');
      expect(DecimalMath.round('1.245', 2, 'HALF_UP')).toBe('1.25');
    });

    test('DecimalMath should round to zero decimal places (JPY)', () => {
      expect(DecimalMath.round('123.6', 0, 'HALF_UP')).toBe('124');
      expect(DecimalMath.round('123.4', 0, 'HALF_UP')).toBe('123');
    });

    test('DecimalMath should round to three decimal places (KWD)', () => {
      expect(DecimalMath.round('1.2345', 3, 'HALF_UP')).toBe('1.235');
      expect(DecimalMath.round('1.2344', 3, 'HALF_UP')).toBe('1.234');
    });

    test('DecimalMath should throw on division by zero', () => {
      expect(() => DecimalMath.divide('1', '0')).toThrow('Division by zero');
    });

    test('DecimalMath should compare numbers correctly', () => {
      expect(DecimalMath.compare('1.1', '1.0')).toBe(1);
      expect(DecimalMath.compare('1.0', '1.1')).toBe(-1);
      expect(DecimalMath.compare('1.0', '1.0')).toBe(0);
    });
  });

  describe('Requirement 4: Cross-Rate Conversion', () => {
    let converter: CurrencyConverter;

    beforeEach(async () => {
      converter = new CurrencyConverter();
      await converter.initialize();
    });

    test('CrossRateEngine should calculate same currency rate as 1', () => {
      const engine = new CrossRateEngine();
      engine.setRates({
        base: 'EUR',
        date: '2024-01-01',
        timestamp: Date.now(),
        source: 'Test',
        rates: { 'USD': '1.1', 'GBP': '0.85' }
      });
      
      expect(engine.getCrossRate('EUR', 'EUR')).toBe('1');
      expect(engine.getCrossRate('USD', 'USD')).toBe('1');
    });

    test('CrossRateEngine should calculate cross-rate via base currency', () => {
      const engine = new CrossRateEngine();
      engine.setRates({
        base: 'EUR',
        date: '2024-01-01',
        timestamp: Date.now(),
        source: 'Test',
        rates: { 'USD': '1.1', 'GBP': '0.85' }
      });
      
      // USD -> GBP = GBP_rate / USD_rate = 0.85 / 1.1
      const rate = engine.getCrossRate('USD', 'GBP');
      const expected = parseFloat(DecimalMath.divide('0.85', '1.1'));
      expect(parseFloat(rate)).toBeCloseTo(expected, 5);
    });

    test('CrossRateEngine should handle conversion from base currency', () => {
      const engine = new CrossRateEngine();
      engine.setRates({
        base: 'EUR',
        date: '2024-01-01',
        timestamp: Date.now(),
        source: 'Test',
        rates: { 'USD': '1.1' }
      });
      
      expect(engine.getCrossRate('EUR', 'USD')).toBe('1.1');
    });

    test('CrossRateEngine should handle conversion to base currency', () => {
      const engine = new CrossRateEngine();
      engine.setRates({
        base: 'EUR',
        date: '2024-01-01',
        timestamp: Date.now(),
        source: 'Test',
        rates: { 'USD': '1.1' }
      });
      
      const rate = engine.getCrossRate('USD', 'EUR');
      // Should be 1 / 1.1
      expect(parseFloat(rate)).toBeCloseTo(1 / 1.1, 5);
    });

    test('CrossRateEngine should throw on missing rate', () => {
      const engine = new CrossRateEngine();
      engine.setRates({
        base: 'EUR',
        date: '2024-01-01',
        timestamp: Date.now(),
        source: 'Test',
        rates: { 'USD': '1.1' }
      });
      
      expect(() => engine.getCrossRate('EUR', 'XYZ')).toThrow();
    });

    test('CurrencyConverter should use correct minor units for JPY (0 decimals)', async () => {
      const result = converter.convert('100', 'EUR', 'JPY');
      
      expect(result.roundedTo).toBe(0);
      expect(result.toAmount).not.toContain('.');
    });

    test('CurrencyConverter should use correct minor units for KWD (3 decimals)', async () => {
      const result = converter.convert('100', 'EUR', 'KWD');
      
      expect(result.roundedTo).toBe(3);
      const decimals = result.toAmount.split('.')[1];
      expect(decimals?.length).toBeLessThanOrEqual(3);
    });

    test('CurrencyConverter should reject negative amounts by default', async () => {
      expect(() => converter.convert('-100', 'EUR', 'USD')).toThrow('Negative amounts not allowed');
    });

    test('CurrencyConverter should allow negative amounts when configured', async () => {
      const result = converter.convert('-100', 'EUR', 'USD', { allowNegative: true });
      expect(parseFloat(result.toAmount)).toBeLessThan(0);
    });

    test('CurrencyConverter should provide raw unrounded value for auditing', async () => {
      const result = converter.convert('100.123', 'EUR', 'USD');
      
      expect(result.rawUnrounded).toBeDefined();
      expect(result.toAmount).not.toBe(result.rawUnrounded);
    });

    test('CurrencyConverter should support lock rate mode', async () => {
      const rate = converter.lockCurrentRate('EUR', 'USD');
      expect(rate).toBeDefined();
      expect(parseFloat(rate)).toBeGreaterThan(0);
    });

    test('CurrencyConverter should use locked rate for conversion', async () => {
      // Lock the rate
      const result1 = converter.convert('100', 'EUR', 'USD', { lockRate: true });
      const lockedRate = result1.rate;
      
      // Convert again with locked rate
      const result2 = converter.convert('100', 'EUR', 'USD', { lockRate: true });
      
      expect(result2.rate).toBe(lockedRate);
      expect(result2.locked).toBe(true);
    });

    test('CurrencyConverter should clear locked rates', async () => {
      converter.lockCurrentRate('EUR', 'USD');
      converter.clearLockedRates();
      
      // After clearing, should calculate fresh rate
      const result = converter.convert('100', 'EUR', 'USD');
      expect(result.locked).toBe(false);
    });

    test('getMinorUnits should return correct values for different currencies', () => {
      expect(converter.getMinorUnits('USD')).toBe(2);
      expect(converter.getMinorUnits('JPY')).toBe(0);
      expect(converter.getMinorUnits('KWD')).toBe(3);
      expect(converter.getMinorUnits('UNKNOWN')).toBe(2); // Default
    });

    test('CURRENCY_MINOR_UNITS should include zero-decimal currencies', () => {
      expect(CURRENCY_MINOR_UNITS['JPY']).toBe(0);
      expect(CURRENCY_MINOR_UNITS['KRW']).toBe(0);
    });

    test('CURRENCY_MINOR_UNITS should include three-decimal currencies', () => {
      expect(CURRENCY_MINOR_UNITS['KWD']).toBe(3);
      expect(CURRENCY_MINOR_UNITS['BHD']).toBe(3);
    });
  });
});