package com.ecommerce.order.repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class JdbcCustomerRepository implements CustomerRepository {
    
    private final Connection connection;

    public JdbcCustomerRepository(Connection connection) {
        this.connection = connection;
    }

    @Override
    public boolean isValid(String customerId) {
        return findBoolean(customerId, "SELECT 1 FROM customers WHERE customer_id = ?");
    }

    @Override
    public boolean isActive(String customerId) {
        return findBoolean(customerId, "SELECT is_active FROM customers WHERE customer_id = ?");
    }

    @Override
    public boolean isBlocked(String customerId) {
        return findBoolean(customerId, "SELECT is_blocked FROM customers WHERE customer_id = ?");
    }

    @Override
    public String getCustomerTier(String customerId) {
        try (PreparedStatement stmt = connection.prepareStatement("SELECT loyalty_tier FROM customers WHERE customer_id = ?")) {
            stmt.setString(1, customerId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getString("loyalty_tier");
                }
            }
        } catch (SQLException e) {
            System.err.println("Error fetching customer tier: " + e.getMessage());
        }
        return null;
    }

    private boolean findBoolean(String customerId, String query) {
        try (PreparedStatement stmt = connection.prepareStatement(query)) {
            stmt.setString(1, customerId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    // If the column is boolean, getBoolean, else if just checking existence (SELECT 1) return true
                    try {
                        return rs.getBoolean(1); 
                    } catch (SQLException ex) {
                        return true; // Fallback for SELECT 1
                    }
                }
            }
        } catch (SQLException e) {
            System.err.println("Database error in CustomerRepository: " + e.getMessage());
        }
        return false;
    }
    
    public void addLoyaltyPoints(String customerId, int points) {
        try (PreparedStatement stmt = connection.prepareStatement(
                "UPDATE customers SET loyalty_points = loyalty_points + ? WHERE customer_id = ?")) {
            stmt.setInt(1, points);
            stmt.setString(2, customerId);
            stmt.executeUpdate();
        } catch (SQLException e) {
            System.err.println("Failed to add loyalty points: " + e.getMessage());
        }
    }
    
    public void deductLoyaltyPoints(String customerId, int points) {
        try (PreparedStatement stmt = connection.prepareStatement(
                "UPDATE customers SET loyalty_points = GREATEST(0, loyalty_points - ?) WHERE customer_id = ?")) {
            stmt.setInt(1, points);
            stmt.setString(2, customerId);
            stmt.executeUpdate();
        } catch (SQLException e) {
            System.err.println("Failed to deduct loyalty points: " + e.getMessage());
        }
    }
}
