/**
 * FraudCheckService - Handles fraud detection for orders
 * Requirement 2: Pipeline Orchestration - FraudCheck step for future injection
 */

const { FraudCheckFailedError } = require('../errors/OrderProcessingError');

const FRAUD_THRESHOLDS = {
  MAX_ORDER_AMOUNT: 10000,
  MAX_ITEMS_PER_ORDER: 50,
  RISK_SCORE_THRESHOLD: 80
};

async function checkFraud(orderData, options = {}) {
  const { items, userId, paymentToken } = orderData;
  const thresholds = { ...FRAUD_THRESHOLDS, ...options.thresholds };
  
  let riskScore = 0;
  const riskFactors = [];
  
  // Calculate order amount
  const orderAmount = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
  
  if (orderAmount > thresholds.MAX_ORDER_AMOUNT) {
    riskScore += 30;
    riskFactors.push({ type: 'HIGH_VALUE_ORDER', severity: 'MEDIUM' });
  }
  
  if (items.length > thresholds.MAX_ITEMS_PER_ORDER) {
    riskScore += 25;
    riskFactors.push({ type: 'EXCESSIVE_ITEMS', severity: 'HIGH' });
  }
  
  if (!userId) {
    riskScore += 20;
    riskFactors.push({ type: 'MISSING_USER_ID', severity: 'MEDIUM' });
  }
  
  if (!paymentToken) {
    riskScore += 35;
    riskFactors.push({ type: 'MISSING_PAYMENT', severity: 'HIGH' });
  }
  
  const passed = riskScore < thresholds.RISK_SCORE_THRESHOLD;
  
  const result = {
    passed,
    riskScore,
    riskLevel: riskScore < 30 ? 'LOW' : riskScore < 60 ? 'MEDIUM' : riskScore < 80 ? 'HIGH' : 'CRITICAL',
    riskFactors,
    checkedAt: new Date().toISOString()
  };
  
  if (!passed) {
    result.error = new FraudCheckFailedError(`Fraud check failed with risk score ${riskScore}`, { riskScore, riskFactors });
  }
  
  return result;
}

function getThresholds() {
  return { ...FRAUD_THRESHOLDS };
}

function updateThresholds(newThresholds) {
  Object.assign(FRAUD_THRESHOLDS, newThresholds);
}

module.exports = {
  checkFraud,
  getThresholds,
  updateThresholds,
  FRAUD_THRESHOLDS
};
