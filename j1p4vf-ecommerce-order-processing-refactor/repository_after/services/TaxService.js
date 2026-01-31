/**
 * TaxService - Handles tax calculation with externalized tax rules
 * Requirement 5: Tax Rule Externalization
 */

const TAX_RATES = {
  DEFAULT: 0.0825,
  CA: 0.0925,
  NY: 0.08875,
  TX: 0.0825,
  FL: 0.07,
  WA: 0.065,
  IL: 0.0625,
  PA: 0.06,
  HI: 0.04,
  LA: 0.095
};

function getTaxRate(stateCode) {
  if (!stateCode) return TAX_RATES.DEFAULT;
  const normalizedState = stateCode.toUpperCase();
  return TAX_RATES[normalizedState] || TAX_RATES.DEFAULT;
}

function calculateSubtotal(items) {
  if (!items || !Array.isArray(items) || items.length === 0) return 0;
  return items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
}

function calculateTax(orderData, subtotal) {
  const { shippingAddress } = orderData;
  
  if (!shippingAddress || !shippingAddress.state) {
    const rate = TAX_RATES.DEFAULT;
    return { rate, taxAmount: Math.round(subtotal * rate * 10000) / 10000, state: 'DEFAULT' };
  }
  
  const stateCode = shippingAddress.state.toUpperCase();
  const rate = getTaxRate(stateCode);
  // Return 'DEFAULT' for unknown states, otherwise return the state code
  const state = rate === TAX_RATES.DEFAULT && !TAX_RATES[stateCode] ? 'DEFAULT' : stateCode;
  return { rate, taxAmount: Math.round(subtotal * rate * 10000) / 10000, state };
}

function getTaxRates() {
  return { ...TAX_RATES };
}

function setTaxRate(stateCode, rate) {
  TAX_RATES[stateCode.toUpperCase()] = rate;
}

module.exports = {
  calculateSubtotal,
  calculateTax,
  getTaxRate,
  getTaxRates,
  setTaxRate,
  TAX_RATES
};
