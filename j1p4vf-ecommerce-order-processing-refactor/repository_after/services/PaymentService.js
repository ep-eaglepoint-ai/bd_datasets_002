/**
 * PaymentService - Handles payment processing operations
 * Requirement 1: Service Decoupling
 * Requirement 3: Standardized Error Handling
 */

const gateway = require('../infra/gateway');
const { PaymentDeclinedError, InsufficientFundsError } = require('../errors/OrderProcessingError');

async function authorizePayment(paymentToken, amount) {
  if (!paymentToken) {
    throw new PaymentDeclinedError('Invalid payment token', { errorType: 'INVALID_TOKEN' });
  }
  
  if (typeof amount !== 'number' || amount <= 0) {
    throw new PaymentDeclinedError('Invalid payment amount', { errorType: 'INVALID_AMOUNT' });
  }
  
  try {
    const result = await gateway.authorize(paymentToken, amount);
    
    if (result.status === 'APPROVED') {
      return {
        success: true,
        authorizationCode: result.authorizationCode,
        amount: result.amount,
        status: 'AUTHORIZED'
      };
    }
    
    if (result.error === 'INSUFFICIENT_FUNDS') {
      throw new InsufficientFundsError(0, amount);
    }
    
    if (result.error === 'CARD_DECLINED') {
      throw new PaymentDeclinedError('Card was declined', { errorType: 'CARD_DECLINED' });
    }
    
    if (result.error === 'CARD_EXPIRED') {
      throw new PaymentDeclinedError('Card has expired', { errorType: 'CARD_EXPIRED' });
    }
    
    throw new PaymentDeclinedError(result.message || 'Payment declined', { errorType: 'UNKNOWN' });
    
  } catch (error) {
    if (error instanceof PaymentDeclinedError || error instanceof InsufficientFundsError) {
      throw error;
    }
    throw new PaymentDeclinedError('Payment processing failed', { errorType: 'GATEWAY_ERROR' });
  }
}

async function capturePayment(authorizationCode) {
  const result = await gateway.capture(authorizationCode);
  return { success: true, status: result.status };
}

async function voidPayment(authorizationCode) {
  const result = await gateway.voidPayment(authorizationCode);
  return { success: true, status: result.status };
}

async function refundPayment(transactionId, amount) {
  const result = await gateway.refund(transactionId, amount);
  return { success: true, status: result.status };
}

module.exports = {
  authorizePayment,
  capturePayment,
  voidPayment,
  refundPayment
};
