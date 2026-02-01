/**
 * Currency Converter - Production-grade implementation
 * Uses arbitrary-precision decimal math for financial correctness
 * Supports cross-rate conversion via canonical base currency (EUR)
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CurrencyRate {
  code: string;
  rate: string;
  date: string;
  source: string;
}

export interface ExchangeRateData {
  base: string;
  date: string;
  timestamp: number;
  source: string;
  rates: Record<string, string>;
}

export interface ConversionResult {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  inverseRate: string;
  rawUnrounded: string;
  roundedTo: number;
  timestamp: number;
  locked: boolean;
}

export interface CurrencyMetadata {
  code: string;
  name: string;
  symbol: string;
  minorUnits: number;
}

export interface ConversionOptions {
  roundingStrategy?: 'HALF_UP' | 'HALF_DOWN' | 'FLOOR' | 'CEIL';
  allowNegative?: boolean;
  lockRate?: boolean;
  lockedRateValue?: string;
}

// ============================================================================
// CURRENCY METADATA - ISO 4217 Minor Units
// ============================================================================

export const CURRENCY_MINOR_UNITS: Record<string, number> = {
  'JPY': 0, 'KRW': 0, 'VND': 0, 'CLP': 0, 'ISK': 0, 'HUF': 0,
  'USD': 2, 'EUR': 2, 'GBP': 2, 'CAD': 2, 'AUD': 2, 'CHF': 2,
  'CNY': 2, 'INR': 2, 'MXN': 2, 'BRL': 2, 'ZAR': 2, 'SGD': 2,
  'HKD': 2, 'NOK': 2, 'SEK': 2, 'DKK': 2, 'NZD': 2, 'PLN': 2,
  'THB': 2, 'MYR': 2, 'PHP': 2, 'IDR': 2, 'TRY': 2, 'RUB': 2,
  'AED': 2, 'SAR': 2, 'EGP': 2, 'NGN': 2, 'KES': 2, 'GHS': 2,
  'KWD': 3, 'BHD': 3, 'OMR': 3, 'TND': 3, 'LYD': 3, 'JOD': 3,
};

export const SUPPORTED_CURRENCIES: CurrencyMetadata[] = [
  { code: 'EUR', name: 'Euro', symbol: '€', minorUnits: 2 },
  { code: 'USD', name: 'US Dollar', symbol: '$', minorUnits: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', minorUnits: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', minorUnits: 0 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', minorUnits: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', minorUnits: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', minorUnits: 2 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', minorUnits: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', minorUnits: 2 },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', minorUnits: 3 },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD', minorUnits: 3 },
];

// ============================================================================
// DECIMAL MATH - Arbitrary Precision (No Floating Point)
// ============================================================================

export class DecimalMath {
  private static readonly DEFAULT_PRECISION = 20;

  static isValidNumber(value: string): boolean {
    if (typeof value !== 'string' || value.trim() === '') {
      return false;
    }
    const pattern = /^-?\d+(\.\d+)?$/;
    return pattern.test(value.trim());
  }

  static add(a: string, b: string): string {
    this.validateInputs(a, b);
    const [aInt, aDec] = this.splitDecimal(a);
    const [bInt, bDec] = this.splitDecimal(b);
    const maxDecLen = Math.max(aDec.length, bDec.length);
    const aPadded = aDec.padEnd(maxDecLen, '0');
    const bPadded = bDec.padEnd(maxDecLen, '0');
    const aFull = BigInt(aInt + aPadded);
    const bFull = BigInt(bInt + bPadded);
    const sum = aFull + bFull;
    return this.insertDecimalPoint(sum.toString(), maxDecLen);
  }

  static subtract(a: string, b: string): string {
    this.validateInputs(a, b);
    const [aInt, aDec] = this.splitDecimal(a);
    const [bInt, bDec] = this.splitDecimal(b);
    const maxDecLen = Math.max(aDec.length, bDec.length);
    const aPadded = aDec.padEnd(maxDecLen, '0');
    const bPadded = bDec.padEnd(maxDecLen, '0');
    const aFull = BigInt(aInt + aPadded);
    const bFull = BigInt(bInt + bPadded);
    const diff = aFull - bFull;
    return this.insertDecimalPoint(diff.toString(), maxDecLen);
  }

  static multiply(a: string, b: string): string {
    this.validateInputs(a, b);
    const [aInt, aDec] = this.splitDecimal(a);
    const [bInt, bDec] = this.splitDecimal(b);
    const totalDecLen = aDec.length + bDec.length;
    const aFull = BigInt(aInt + aDec);
    const bFull = BigInt(bInt + bDec);
    const product = aFull * bFull;
    return this.insertDecimalPoint(product.toString(), totalDecLen);
  }

  static divide(a: string, b: string, precision: number = this.DEFAULT_PRECISION): string {
    this.validateInputs(a, b);
    if (this.isZero(b)) {
      throw new Error('Division by zero');
    }
    const [aInt, aDec] = this.splitDecimal(a);
    const [bInt, bDec] = this.splitDecimal(b);
    const scale = precision + bDec.length;
    const aScaled = BigInt(aInt + aDec) * BigInt(10 ** scale);
    const bScaled = BigInt(bInt + bDec);
    const quotient = aScaled / bScaled;
    const totalDecLen = scale - bDec.length + aDec.length;
    return this.insertDecimalPoint(quotient.toString(), totalDecLen);
  }

  static isZero(value: string): boolean {
    const cleaned = value.replace(/^-/, '').replace(/^0+/, '').replace(/\.?0+$/, '');
    return cleaned === '' || cleaned === '.';
  }

  static isNegative(value: string): boolean {
    return value.trim().startsWith('-') && !this.isZero(value);
  }

  static compare(a: string, b: string): number {
    const diff = this.subtract(a, b);
    if (this.isZero(diff)) return 0;
    return this.isNegative(diff) ? -1 : 1;
  }

  static round(value: string, decimalPlaces: number, strategy: string = 'HALF_UP'): string {
    if (!this.isValidNumber(value)) {
      throw new Error(`Invalid number for rounding: ${value}`);
    }
    const [intPart, decPart] = this.splitDecimal(value);
    if (decPart.length <= decimalPlaces) {
      return intPart + (decimalPlaces > 0 ? '.' + decPart.padEnd(decimalPlaces, '0') : '');
    }
    const isNeg = intPart.startsWith('-');
    const absInt = isNeg ? intPart.slice(1) : intPart;
    const keepDec = decPart.slice(0, decimalPlaces);
    const nextDigit = parseInt(decPart[decimalPlaces], 10);
    let rounded = BigInt(absInt + keepDec);
    let shouldRoundUp = false;
    switch (strategy) {
      case 'HALF_UP': shouldRoundUp = nextDigit >= 5; break;
      case 'HALF_DOWN': shouldRoundUp = nextDigit > 5; break;
      case 'FLOOR': shouldRoundUp = false; break;
      case 'CEIL': shouldRoundUp = nextDigit > 0; break;
      default: shouldRoundUp = nextDigit >= 5;
    }
    if (shouldRoundUp) {
      rounded += BigInt(1);
    }
    let result = rounded.toString();
    if (decimalPlaces > 0) {
      result = result.padStart(decimalPlaces + 1, '0');
      const intLen = result.length - decimalPlaces;
      result = result.slice(0, intLen) + '.' + result.slice(intLen);
    }
    return (isNeg ? '-' : '') + result;
  }

  private static validateInputs(a: string, b: string): void {
    if (!this.isValidNumber(a)) throw new Error(`Invalid number: ${a}`);
    if (!this.isValidNumber(b)) throw new Error(`Invalid number: ${b}`);
  }

  private static splitDecimal(value: string): [string, string] {
    const parts = value.split('.');
    return [parts[0], parts[1] || ''];
  }

  private static insertDecimalPoint(value: string, decimalPlaces: number): string {
    if (decimalPlaces === 0) return value;
    const isNeg = value.startsWith('-');
    let abs = isNeg ? value.slice(1) : value;
    abs = abs.padStart(decimalPlaces + 1, '0');
    const intLen = abs.length - decimalPlaces;
    const result = abs.slice(0, intLen) + '.' + abs.slice(intLen);
    const cleaned = result.replace(/\.?0+$/, '').replace(/^0+(?=\d)/, '');
    return (isNeg ? '-' : '') + (cleaned || '0');
  }
}

// ============================================================================
// CROSS-RATE ENGINE
// ============================================================================

export class CrossRateEngine {
  private rates: ExchangeRateData | null = null;
  private lockedRates: Map<string, string> = new Map();

  setRates(data: ExchangeRateData): void {
    this.rates = data;
  }

  getRates(): ExchangeRateData | null {
    return this.rates;
  }

  lockRate(fromCurrency: string, toCurrency: string, rate: string): void {
    const key = `${fromCurrency}_${toCurrency}`;
    this.lockedRates.set(key, rate);
  }

  getLockedRate(fromCurrency: string, toCurrency: string): string | null {
    const key = `${fromCurrency}_${toCurrency}`;
    return this.lockedRates.get(key) || null;
  }

  clearLockedRates(): void {
    this.lockedRates.clear();
  }

  getCrossRate(fromCurrency: string, toCurrency: string): string {
    if (!this.rates) {
      throw new Error('Exchange rates not loaded');
    }
    const base = this.rates.base;
    if (fromCurrency === toCurrency) return '1';
    if (fromCurrency === base) {
      const rate = this.rates.rates[toCurrency];
      if (!rate) throw new Error(`Rate not available for ${toCurrency}`);
      return rate;
    }
    if (toCurrency === base) {
      const rate = this.rates.rates[fromCurrency];
      if (!rate) throw new Error(`Rate not available for ${fromCurrency}`);
      return DecimalMath.divide('1', rate);
    }
    const rateA = this.rates.rates[fromCurrency];
    const rateB = this.rates.rates[toCurrency];
    if (!rateA) throw new Error(`Rate not available for ${fromCurrency}`);
    if (!rateB) throw new Error(`Rate not available for ${toCurrency}`);
    if (DecimalMath.isZero(rateA)) throw new Error(`Invalid zero rate for ${fromCurrency}`);
    return DecimalMath.divide(rateB, rateA);
  }
}

// ============================================================================
// RATE FETCHER
// ============================================================================

export class RateFetcher {
  private cache: ExchangeRateData | null = null;
  private cacheTimestamp: number = 0;
  private readonly cacheTTL: number = 60000;

  private static readonly MOCK_RATES: Record<string, string> = {
    'USD': '1.0856', 'GBP': '0.8567', 'JPY': '162.34', 'CHF': '0.9423',
    'CAD': '1.4789', 'AUD': '1.6543', 'CNY': '7.8234', 'INR': '90.5678',
    'KWD': '0.3342', 'BHD': '0.4102',
  };

  async fetchRates(forceRefresh: boolean = false): Promise<ExchangeRateData> {
    if (!forceRefresh && this.cache && Date.now() - this.cacheTimestamp < this.cacheTTL) {
      return this.cache;
    }
    const data: ExchangeRateData = {
      base: 'EUR',
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      source: 'European Central Bank (simulated)',
      rates: { ...RateFetcher.MOCK_RATES },
    };
    this.validateRateData(data);
    this.cache = data;
    this.cacheTimestamp = Date.now();
    return data;
  }

  private validateRateData(data: ExchangeRateData): void {
    if (!data || typeof data !== 'object') throw new Error('Invalid rate data');
    if (typeof data.base !== 'string' || data.base.length !== 3) throw new Error('Invalid base');
    if (!data.rates || typeof data.rates !== 'object') throw new Error('Missing rates');
    for (const [code, rate] of Object.entries(data.rates)) {
      if (typeof code !== 'string' || code.length !== 3) throw new Error(`Invalid code: ${code}`);
      if (typeof rate !== 'string' || !DecimalMath.isValidNumber(rate)) throw new Error(`Invalid rate: ${rate}`);
    }
  }

  getCacheStatus(): { cached: boolean; age: number; ttl: number } {
    return {
      cached: this.cache !== null,
      age: this.cache ? Date.now() - this.cacheTimestamp : 0,
      ttl: this.cacheTTL,
    };
  }

  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}

// ============================================================================
// CURRENCY CONVERTER
// ============================================================================

export class CurrencyConverter {
  private crossRateEngine: CrossRateEngine;
  private rateFetcher: RateFetcher;
  private lastUpdated: number = 0;

  constructor() {
    this.crossRateEngine = new CrossRateEngine();
    this.rateFetcher = new RateFetcher();
  }

  async initialize(): Promise<void> {
    const rates = await this.rateFetcher.fetchRates();
    this.crossRateEngine.setRates(rates);
    this.lastUpdated = rates.timestamp;
  }

  async refreshRates(): Promise<ExchangeRateData> {
    const rates = await this.rateFetcher.fetchRates(true);
    this.crossRateEngine.setRates(rates);
    this.lastUpdated = rates.timestamp;
    return rates;
  }

  getLastUpdated(): number {
    return this.lastUpdated;
  }

  isValidCurrencyCode(code: string): boolean {
    if (typeof code !== 'string') return false;
    const trimmed = code.trim().toUpperCase();
    return /^[A-Z]{3}$/.test(trimmed);
  }

  isCurrencySupported(code: string): boolean {
    if (!this.isValidCurrencyCode(code)) return false;
    const rates = this.crossRateEngine.getRates();
    if (!rates) return false;
    const upperCode = code.toUpperCase();
    return upperCode === rates.base || upperCode in rates.rates;
  }

  getMinorUnits(currencyCode: string): number {
    const code = currencyCode.toUpperCase();
    return CURRENCY_MINOR_UNITS[code] ?? 2;
  }

  convert(
    amount: string,
    fromCurrency: string,
    toCurrency: string,
    options: ConversionOptions = {}
  ): ConversionResult {
    const { roundingStrategy = 'HALF_UP', allowNegative = false, lockRate = false, lockedRateValue } = options;

    if (!DecimalMath.isValidNumber(amount)) throw new Error(`Invalid amount: ${amount}`);
    if (!this.isValidCurrencyCode(fromCurrency)) throw new Error(`Invalid currency code: ${fromCurrency}`);
    if (!this.isValidCurrencyCode(toCurrency)) throw new Error(`Invalid currency code: ${toCurrency}`);

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (!this.isCurrencySupported(from)) throw new Error(`Unsupported currency: ${from}`);
    if (!this.isCurrencySupported(to)) throw new Error(`Unsupported currency: ${to}`);
    if (!allowNegative && DecimalMath.isNegative(amount)) throw new Error('Negative amounts not allowed');

    let rate: string;
    if (lockedRateValue) {
      rate = lockedRateValue;
    } else if (lockRate) {
      const locked = this.crossRateEngine.getLockedRate(from, to);
      if (locked) {
        rate = locked;
      } else {
        rate = this.crossRateEngine.getCrossRate(from, to);
        this.crossRateEngine.lockRate(from, to, rate);
      }
    } else {
      rate = this.crossRateEngine.getCrossRate(from, to);
    }

    const rawResult = DecimalMath.multiply(amount, rate);
    const minorUnits = this.getMinorUnits(to);
    const roundedResult = DecimalMath.round(rawResult, minorUnits, roundingStrategy);
    const inverseRate = DecimalMath.divide('1', rate);

    return {
      fromCurrency: from,
      toCurrency: to,
      fromAmount: amount,
      toAmount: roundedResult,
      rate,
      inverseRate,
      rawUnrounded: rawResult,
      roundedTo: minorUnits,
      timestamp: Date.now(),
      locked: lockRate,
    };
  }

  swap(amount: string, fromCurrency: string, toCurrency: string, options: ConversionOptions = {}): ConversionResult {
    return this.convert(amount, toCurrency, fromCurrency, options);
  }

  getAvailableCurrencies(): string[] {
    const rates = this.crossRateEngine.getRates();
    if (!rates) return [];
    return [rates.base, ...Object.keys(rates.rates)];
  }

  searchCurrencies(query: string): CurrencyMetadata[] {
    const q = query.toLowerCase();
    return SUPPORTED_CURRENCIES.filter(
      (c: CurrencyMetadata) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }

  getRateMetadata(): { base: string; date: string; source: string; timestamp: number } | null {
    const rates = this.crossRateEngine.getRates();
    if (!rates) return null;
    return { base: rates.base, date: rates.date, source: rates.source, timestamp: rates.timestamp };
  }

  isDataStale(maxAgeMs: number = 3600000): boolean {
    if (!this.lastUpdated) return true;
    return Date.now() - this.lastUpdated >= maxAgeMs;
  }

  lockCurrentRate(fromCurrency: string, toCurrency: string): string {
    const rate = this.crossRateEngine.getCrossRate(fromCurrency.toUpperCase(), toCurrency.toUpperCase());
    this.crossRateEngine.lockRate(fromCurrency.toUpperCase(), toCurrency.toUpperCase(), rate);
    return rate;
  }

  clearLockedRates(): void {
    this.crossRateEngine.clearLockedRates();
  }
}
