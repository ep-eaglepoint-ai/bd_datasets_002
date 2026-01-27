package com.ecommerce.order.service;

public interface PaymentGateway {
    String charge(double amount, String token, String currency);
    String refund(String transactionId, double amount);
    boolean supports(String paymentMethod);
}
