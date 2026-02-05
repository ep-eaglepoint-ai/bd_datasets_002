package com.ecommerce.order.service;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class JdbcInventoryService implements InventoryService {

    private final Connection connection;

    public JdbcInventoryService(Connection connection) {
        this.connection = connection;
    }

    @Override
    public boolean checkInventory(String productId, int quantity) {
         try (PreparedStatement stmt = connection.prepareStatement(
                "SELECT quantity_available, reserved_quantity FROM inventory WHERE product_id = ?")) {
            stmt.setString(1, productId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    int available = rs.getInt("quantity_available");
                    int reserved = rs.getInt("reserved_quantity");
                    return (available - reserved) >= quantity;
                }
            }
        } catch (SQLException e) {
            System.err.println("Inventory check failed: " + e.getMessage());
        }
        return false;
    }

    @Override
    public void reserve(String productId, int quantity) {
        updateReserved(productId, quantity);
    }

    @Override
    public void release(String productId, int quantity) {
        updateReserved(productId, -quantity);
    }

    @Override
    public void commit(String productId, int quantity) {
        try (PreparedStatement stmt = connection.prepareStatement(
                "UPDATE inventory SET quantity_available = quantity_available - ?, reserved_quantity = reserved_quantity - ? WHERE product_id = ?")) {
            stmt.setInt(1, quantity);
            stmt.setInt(2, quantity);
            stmt.setString(3, productId);
            stmt.executeUpdate();
        } catch (SQLException e) {
             System.err.println("Inventory commit failed: " + e.getMessage());
             throw new RuntimeException("Inventory commit failed", e);
        }
    }
    
    private void updateReserved(String productId, int delta) {
        try (PreparedStatement stmt = connection.prepareStatement(
                "UPDATE inventory SET reserved_quantity = reserved_quantity + ? WHERE product_id = ?")) {
            stmt.setInt(1, delta);
            stmt.setString(2, productId);
            stmt.executeUpdate();
        } catch (SQLException e) {
             System.err.println("Inventory reservation update failed: " + e.getMessage());
             throw new RuntimeException("Inventory reservation failed", e);
        }
    }
}
