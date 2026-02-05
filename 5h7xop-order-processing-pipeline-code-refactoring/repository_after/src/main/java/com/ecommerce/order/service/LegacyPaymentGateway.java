package com.ecommerce.order.service;

public class LegacyPaymentGateway implements PaymentGateway {
    
    // In the future, this could dispatch to real gateways based on method.
    // For now, it keeps the simulation logic.

    @Override
    public String charge(double amount, String token, String currency) {
        // From original code:
        // return "TXN_" + System.currentTimeMillis();
        // Check for "fail" tokens? Original code just checks errors in logic before this.
        return "TXN_" + System.currentTimeMillis();
    }

    @Override
    public String refund(String transactionId, double amount) {
        return "REFUND_" + System.currentTimeMillis();
    }

    @Override
    public boolean supports(String paymentMethod) {
        if (paymentMethod == null) return false;
        String pm = paymentMethod.toUpperCase();
        return pm.equals("CREDIT_CARD") || pm.equals("DEBIT_CARD") || 
               pm.equals("PAYPAL") || pm.equals("BANK_TRANSFER") || pm.equals("CRYPTO");
    }
}
