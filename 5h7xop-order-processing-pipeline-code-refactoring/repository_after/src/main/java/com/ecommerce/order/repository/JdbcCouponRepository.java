package com.ecommerce.order.repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Optional;

public class JdbcCouponRepository implements CouponRepository {
    
    private final Connection connection;

    public JdbcCouponRepository(Connection connection) {
        this.connection = connection;
    }

    @Override
    public Optional<CouponDetails> findByCode(String code) {
        try (PreparedStatement stmt = connection.prepareStatement(
                "SELECT discount_type, discount_value, min_order_amount, max_discount, usage_count, usage_limit, expiry_date " +
                "FROM coupons WHERE code = ? AND is_active = true")) {
            stmt.setString(1, code);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(new CouponDetails(
                        rs.getString("discount_type"),
                        rs.getDouble("discount_value"),
                        rs.getDouble("min_order_amount"),
                        rs.getDouble("max_discount"),
                        rs.getInt("usage_count"),
                        rs.getInt("usage_limit"),
                        rs.getTimestamp("expiry_date") != null ? rs.getTimestamp("expiry_date").toLocalDateTime() : null
                    ));
                }
            }
        } catch (SQLException e) {
            System.err.println("Coupon lookup failed: " + e.getMessage());
        }
        return Optional.empty();
    }

    @Override
    public void incrementUsage(String code) {
         try (PreparedStatement stmt = connection.prepareStatement(
                "UPDATE coupons SET usage_count = usage_count + 1 WHERE code = ?")) {
            stmt.setString(1, code);
            stmt.executeUpdate();
        } catch (SQLException e) {
            System.err.println("Failed to update coupon usage: " + e.getMessage());
        }
    }
}
