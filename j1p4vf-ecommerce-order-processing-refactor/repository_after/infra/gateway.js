/**
 * Mock payment gateway for credit card processing
 */
async function authorize(paymentToken, amount) {
  await new Promise(resolve => setTimeout(resolve, 20));
  
  if (paymentToken === 'declined') {
    return { status: 'DECLINED', error: 'CARD_DECLINED' };
  }
  
  if (paymentToken === 'insufficient_funds') {
    return { status: 'DECLINED', error: 'INSUFFICIENT_FUNDS' };
  }
  
  if (paymentToken === 'expired') {
    return { status: 'DECLINED', error: 'CARD_EXPIRED' };
  }
  
  if (paymentToken === 'invalid') {
    return { status: 'DECLINED', error: 'INVALID_TOKEN' };
  }
  
  return {
    status: 'APPROVED',
    authorizationCode: `AUTH-${Date.now()}`,
    amount: amount,
    timestamp: new Date().toISOString()
  };
}

async function capture(authorizationCode) {
  await new Promise(resolve => setTimeout(resolve, 10));
  return { status: 'CAPTURED', authorizationCode };
}

async function voidPayment(authorizationCode) {
  await new Promise(resolve => setTimeout(resolve, 10));
  return { status: 'VOIDED', authorizationCode };
}

async function refund(transactionId, amount) {
  await new Promise(resolve => setTimeout(resolve, 10));
  return { status: 'REFUNDED', transactionId, amount };
}

function reset() {}

module.exports = { authorize, capture, voidPayment, refund, reset };
