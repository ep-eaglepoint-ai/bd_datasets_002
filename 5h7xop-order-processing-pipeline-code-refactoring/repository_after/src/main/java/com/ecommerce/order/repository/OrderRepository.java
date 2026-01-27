package com.ecommerce.order.repository;

import com.ecommerce.order.Order;

public interface OrderRepository {
    void save(Order order);
    Order findById(String id);
    void updateStatus(String orderId, String status);
    // Add other methods as needed to replace direct JDBC
}
