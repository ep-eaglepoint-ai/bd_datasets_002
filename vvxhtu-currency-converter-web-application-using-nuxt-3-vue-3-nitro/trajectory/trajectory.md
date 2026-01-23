# Development Trajectory

## Task: Currency Converter with Arbitrary-Precision Math

### Phase 1: Analysis

**Problem Identified:**
- JavaScript floating-point causes precision errors
- 0.1 + 0.2 = 0.30000000000000004 (incorrect)
- Different currencies have different decimal places (JPY=0, USD=2, KWD=3)
- Cross-rate conversion needs proper calculation via base currency

**Code Review of `repository_before`:**
```typescript
static multiply(a: string, b: string): string {
  return String(parseFloat(a) * parseFloat(b)); // Faulty: floating point
}

convert(amount, fromCurrency, toCurrency) {
  const result = parseFloat(amount) * parseFloat(rate);
  return result.toFixed(2); // Faulty: always 2 decimals
}
```

Issues:
1. Floating-point arithmetic causes precision loss
2. Always rounds to 2 decimals (wrong for JPY, KWD)
3. No proper cross-rate calculation
4. No rate locking support

### Phase 2: Design

**Solution Architecture:**

1. **DecimalMath Class**
   - Uses BigInt for arbitrary precision
   - Preserves strings until computation
   - Proper rounding strategies (HALF_UP, etc.)
   - Handles large numbers without overflow

2. **CrossRateEngine Class**
   - Cross-rate via base currency: rB/rA
   - Rate locking for auditing
   - Handles missing rates gracefully

3. **RateFetcher Class**
   - Server-side API simulation
   - Caching with TTL
   - Validates rate data integrity

4. **CurrencyConverter Class**
   - Main conversion logic
   - Per-currency minor unit handling
   - Rate metadata for transparency

### Phase 3: Implementation

**Key Changes:**

1. **DecimalMath.multiply():** Uses BigInt multiplication
2. **DecimalMath.divide():** Uses scaled BigInt division
3. **DecimalMath.round():** Proper HALF_UP rounding
4. **CrossRateEngine.getCrossRate():** Calculates rB/rA
5. **CURRENCY_MINOR_UNITS:** Maps currency to decimal places
6. **CurrencyConverter.convert():** Uses correct minor units

**Precision Example:**
```typescript
// Before (floating-point)
0.1 * 0.2 = 0.020000000000000004

// After (BigInt)
DecimalMath.multiply('0.1', '0.2') = '0.02'
```

### Phase 4: Testing

**Test Categories:**

1. **Currency Selection UI (8 tests)**
   - Validate currency codes
   - Check currency support
   - List available currencies
   - Search functionality
   - Swap currencies
   - Last updated timestamp
   - Stale data detection
   - Rate metadata

2. **Rate Fetching (5 tests)**
   - Fetch rates structure
   - Cache rates
   - Force refresh
   - Clear cache
   - Validate rate strings

3. **Arbitrary-Precision Math (13 tests)**
   - Validate number strings
   - Add with precision
   - Subtract with precision
   - Multiply with precision
   - Divide with precision
   - Large numbers
   - Zero detection
   - Negative detection
   - HALF_UP rounding
   - Zero decimals (JPY)
   - Three decimals (KWD)
   - Division by zero
   - Compare numbers

4. **Cross-Rate Conversion (14 tests)**
   - Same currency rate = 1
   - Cross-rate calculation
   - From base currency
   - To base currency
   - Missing rate handling
   - JPY minor units (0)
   - KWD minor units (3)
   - Negative amount rejection
   - Negative amount allowed
   - Raw unrounded value
   - Lock rate mode
   - Use locked rate
   - Clear locked rates
   - Minor units lookup

### Phase 5: Verification

**Results:**
- All tests pass on `repository_after`
- Most tests fail on `repository_before` (floating-point issues)
- Precision verified: 0.1 + 0.2 = 0.3
- Cross-rates calculate correctly
- Rate locking works for auditing

### Conclusion

Successfully implemented production-grade currency converter:
- Arbitrary-precision math (no floating-point)
- ISO-4217 minor unit compliance
- Cross-rate conversion via base currency
- Rate locking for auditing
- Proper rounding strategies