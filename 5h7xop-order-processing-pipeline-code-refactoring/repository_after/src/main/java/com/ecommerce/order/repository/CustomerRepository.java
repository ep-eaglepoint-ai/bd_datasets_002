package com.ecommerce.order.repository;

public interface CustomerRepository {
    boolean isValid(String customerId);
    boolean isActive(String customerId);
    boolean isBlocked(String customerId);
    String getCustomerTier(String customerId); // For loyalty
    // Add logic to fetch customer details if needed
}
