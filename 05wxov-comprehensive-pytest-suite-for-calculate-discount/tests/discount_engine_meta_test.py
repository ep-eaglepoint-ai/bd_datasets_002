import pytest
from decimal import Decimal
from datetime import date

from repository_before.src.discount_engine import calculate_discount, Coupon, money

def test_meta_traceability_stacking_rule():
    """
    ANALYSIS: Requirement 5 (Stackable vs Non-stackable).
    STRATEGY: Use a manual fake to verify that the logic correctly 
    blocks non-stackable coupons when bulk discounts exist[cite: 242].
    PEDAGOGY: Ensures the model's test suite handles 'Interaction of Constraints'[cite: 365, 463].
    """
    class ManualFakeRepo:
        def get(self, code):
            # Returns a non-stackable coupon
            return Coupon("NON_STACK", Decimal("10.00"), date(2025, 12, 31), stackable=False)

    # Qty 60 triggers the 5% bulk tier
    result = calculate_discount(
        price=100.0,
        quantity=60,
        coupon_code="NON_STACK",
        coupon_repo=ManualFakeRepo(),
        today=date(2025, 6, 1)
    )

    # Assert: Bulk discount must be present, Coupon MUST be 0 [cite: 358, 362]
    assert result.bulk_discount > 0 
    assert result.coupon_discount == Decimal("0.00")

def test_meta_boundary_verification_tier_jump():
    """
    ANALYSIS: Requirement 2 & 3 (Tier Boundaries).
    STRATEGY: Verify the logic jump exactly at the 100 to 101 threshold[cite: 382].
    REPRODUCIBILITY: Uses fixed inputs to ensure identical results across executions[cite: 37, 271].
    """
    # Test point: 100 (5% tier)
    res_100 = calculate_discount(price=10.0, quantity=100)
    assert res_100.bulk_discount == money(Decimal("1000.00") * Decimal("0.05"))

    # Test point: 101 (10% tier)
    res_101 = calculate_discount(price=10.0, quantity=101)
    assert res_101.bulk_discount == money(Decimal("1010.00") * Decimal("0.10"))

def test_meta_determinism_expiration_check():
    """
    ANALYSIS: Requirement 5 (Temporal behavior).
    STRATEGY: Validate the exact expiration boundary without using system clock[cite: 37, 308].
    """
    class ExpiryRepo:
        def get(self, code):
            return Coupon("EXPIRE_SOON", Decimal("5.00"), date(2025, 12, 31))

    repo = ExpiryRepo()
    
    # Valid: Exactly on expiration date
    res_on = calculate_discount(100.0, 1, "EXPIRE_SOON", coupon_repo=repo, today=date(2025, 12, 31))
    assert res_on.coupon_discount == Decimal("5.00")

    # Invalid: One day after
    res_after = calculate_discount(100.0, 1, "EXPIRE_SOON", coupon_repo=repo, today=date(2026, 1, 1))
    assert res_after.coupon_discount == Decimal("0.00")

def test_meta_invariant_stress_large_scale():
    """
    ANALYSIS: Requirement 9 (Physical Invariants).
    STRATEGY: Ensure the total never exceeds subtotal even at high scale[cite: 376, 379].
    """
    # Stress scale: 1M items [cite: 376]
    result = calculate_discount(price=9999.99, quantity=1_000_000)
    
    assert result.total >= 0 
    assert result.total <= result.subtotal 
    # Verify bit-level equivalence of the breakdown [cite: 44, 283]
    assert result.total == money(result.subtotal - result.bulk_discount - result.coupon_discount)