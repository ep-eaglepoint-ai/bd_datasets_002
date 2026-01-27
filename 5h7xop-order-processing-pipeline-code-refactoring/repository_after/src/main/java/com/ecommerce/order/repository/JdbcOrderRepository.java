package com.ecommerce.order.repository;

import com.ecommerce.order.Order;
import com.ecommerce.order.OrderItem;
import com.ecommerce.order.OrderState;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;

public class JdbcOrderRepository implements OrderRepository {
    
    private final Connection connection;

    public JdbcOrderRepository(Connection connection) {
        this.connection = connection;
    }

    @Override
    public void save(Order order) {
        // Insert Order
        try (PreparedStatement stmt = connection.prepareStatement(
                "INSERT INTO orders (order_id, customer_id, status, subtotal, discount_amount, " +
                "shipping_cost, tax_amount, total_amount, payment_method, transaction_id, " +
                "shipping_address, billing_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
            
            stmt.setString(1, order.getOrderId());
            stmt.setString(2, order.getCustomerId());
            stmt.setString(3, order.getStatus());
            // We assume these values are set in the order object before save
            // Note: In the refactor, we should ensure the Order object holds these values.
            // The logic calculates them and might not set them all back on the Order object 
            // in the original code until the very end.
            // But we will ensure they are set.
            // Wait, the original code sets calculated values to local variables until the end.
            // For this repository to work, the Order DTO must be populated.
            stmt.setDouble(4, 0.0); // Placeholder if not in Order
            stmt.setDouble(5, order.getDiscountAmount());
            stmt.setDouble(6, 0.0); // Shipping? Order class has no shipping field? 
            // Looking at Order.java: 
            // private double totalAmount;
            // private double discountAmount;
            // It does NOT have shippingCost or taxAmount fields!
            // The original code calculated them and inserted them. 
            // Constraint: "Use ... records ... where appropriate". 
            // I should probably update Order.java or handle this by adding fields to Order.java
            // OR pass a "OrderContext" or "OrderSummary" object to save.
            
            // Checking Order.java again...
            // It has: subtotal (NO), tax (NO), shipping (NO).
            // It ONLY has totalAmount and discountAmount.
            // The original code was inserting columns that didn't map to the `Order` class fields directly 
            // (it used local variables).
            // "INSERT INTO orders ... shipping_cost, tax_amount"
            
            // To fix this without modifying schema:
            // I should add these fields to the Order class so I can pass them here.
            
        } catch (SQLException e) {
             throw new RuntimeException("Failed to save order", e);
        }
    }

    @Override
    public Order findById(String id) {
        // Implementation for hydration if needed
        return null;
    }

    @Override
    public void updateStatus(String orderId, String status) {
        // Implementation
        try (PreparedStatement stmt = connection.prepareStatement("UPDATE orders SET status = ? WHERE order_id = ?")) {
            stmt.setString(1, status);
            stmt.setString(2, orderId);
            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to update status", e);
        }
    }
}
