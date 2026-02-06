from datetime import date
from decimal import Decimal
import pytest

from repository_before.src.discount_engine import calculate_discount, Coupon, CouponRepository, money


class FakeCouponRepository(CouponRepository):
    def __init__(self, coupons: dict[str, Coupon]):
        self.coupons = coupons

    def get(self, code: str) -> Coupon | None:
        return self.coupons.get(code)


@pytest.fixture
def today():
    return date(2025, 6, 15)


@pytest.fixture
def default_tiers():
    return [
        {"min_qty": 51, "percent": Decimal("0.05")},
        {"min_qty": 101, "percent": Decimal("0.10")},
    ]


@pytest.fixture
def repo_with_coupons(today):
    return FakeCouponRepository(
        {
            "WELCOME10": Coupon(
                code="WELCOME10",
                amount_off=Decimal("10.00"),
                expires_on=date(2025, 12, 31),
                min_subtotal=Decimal("50.00"),
                stackable=True,
            ),
            "FIXED20": Coupon(
                code="FIXED20",
                amount_off=Decimal("20.00"),
                expires_on=date(2025, 12, 31),
                min_subtotal=Decimal("0.00"),
                stackable=False,
            ),
            "EXPIRED": Coupon(
                code="EXPIRED",
                amount_off=Decimal("15.00"),
                expires_on=date(2025, 6, 14),
                min_subtotal=Decimal("0.00"),
                stackable=True,
            ),
            "MIN100": Coupon(
                code="MIN100",
                amount_off=Decimal("25.00"),
                expires_on=date(2025, 12, 31),
                min_subtotal=Decimal("100.00"),
                stackable=True,
            ),
        }
    )


def test_negative_quantity_raises_value_error():
    with pytest.raises(ValueError, match="quantity must be >= 0"):
        calculate_discount(price=10.0, quantity=-1)


def test_negative_price_raises_value_error():
    with pytest.raises(ValueError, match="price must be >= 0"):
        calculate_discount(price=-5.0, quantity=10)


def test_coupon_code_without_repository_raises_value_error():
    with pytest.raises(ValueError, match="coupon_repo required when coupon_code is provided"):
        calculate_discount(price=100.0, quantity=10, coupon_code="WELCOME10")


@pytest.mark.parametrize(
    "quantity, expected_bulk_rate",
    [
        (0, Decimal("0")),
        (1, Decimal("0")),
        (50, Decimal("0")),
        (51, Decimal("0.05")),
        (100, Decimal("0.05")),
        (101, Decimal("0.10")),
    ],
)
def test_bulk_discount_tier_boundaries(quantity, expected_bulk_rate, today, default_tiers):
    #  Audit exact transition points for bulk discount tiers
    price = 10.0
    result = calculate_discount(
        price=price,
        quantity=quantity,
        today=today,
        tiers=default_tiers,
    )
    expected_subtotal = money(Decimal(price) * Decimal(quantity))
    expected_bulk = money(expected_subtotal * expected_bulk_rate)
    expected_total = expected_subtotal - expected_bulk

    assert result.subtotal == expected_subtotal
    assert result.bulk_discount == expected_bulk
    assert result.coupon_discount == Decimal("0.00")
    assert result.total == expected_total


def test_zero_quantity():
    result = calculate_discount(price=100.0, quantity=0)
    assert result.subtotal == Decimal("0.00")
    assert result.bulk_discount == Decimal("0.00")
    assert result.coupon_discount == Decimal("0.00")
    assert result.total == Decimal("0.00")


@pytest.mark.parametrize("price", [99999999.99, 0.001])
def test_extreme_prices(price, today, default_tiers):
    qty = 150
    result = calculate_discount(price=price, quantity=qty, today=today, tiers=default_tiers)
    subtotal = money(Decimal(price) * Decimal(qty))
    bulk = money(subtotal * Decimal("0.10"))
    total = subtotal - bulk

    assert result.subtotal == subtotal
    assert result.bulk_discount == bulk
    assert result.total == total
    assert result.total >= 0


def test_extremely_large_quantity():
    #  Verify invariant stability with high-scale inputs
    result = calculate_discount(price=1.0, quantity=10**9)
    subtotal = money(Decimal("1") * Decimal(10**9))
    bulk = money(subtotal * Decimal("0.10"))
    total = subtotal - bulk

    assert result.subtotal == subtotal
    assert result.bulk_discount == bulk
    assert result.total == total


@pytest.mark.parametrize(
    "subtotal_target, coupon_code, expected_coupon_discount, today",
    [
        (Decimal("200.00"), "WELCOME10", Decimal("10.00"), date(2025, 6, 15)),
        (Decimal("200.00"), "FIXED20", Decimal("20.00"), date(2025, 6, 15)),
        (Decimal("60.00"), "WELCOME10", Decimal("10.00"), date(2025, 6, 15)),
        (Decimal("80.00"), "MIN100", Decimal("0.00"), date(2025, 6, 15)),
    ],
    ids=["stackable-normal", "non-stackable-no-bulk", "above-min-subtotal", "below-min-subtotal"],
)
def test_coupon_scenarios(subtotal_target, coupon_code, expected_coupon_discount, today, repo_with_coupons):
    #  Isolate coupon behavior by using qty=1 to bypass bulk tiers
    price = float(subtotal_target)
    result = calculate_discount(
        price=price,
        quantity=1,
        coupon_code=coupon_code,
        coupon_repo=repo_with_coupons,
        today=today,
    )
    assert result.coupon_discount == expected_coupon_discount
    assert result.total == subtotal_target - expected_coupon_discount


def test_coupon_capping_to_prevent_negative(today):
    #  Ensure coupon discount does not exceed the remaining balance
    repo = FakeCouponRepository({
        "BIG": Coupon("BIG", Decimal("100.00"), date(2025, 12, 31))
    })
    result = calculate_discount(price=10.0, quantity=1, coupon_code="BIG", coupon_repo=repo, today=today)
    assert result.coupon_discount == Decimal("10.00")
    assert result.total == Decimal("0.00")


def test_expired_coupon_ignored(today, repo_with_coupons):
    #  Audit temporal logic to ensure expired coupons provide zero value
    result = calculate_discount(
        price=100.0,
        quantity=120,
        coupon_code="EXPIRED",
        coupon_repo=repo_with_coupons,
        today=today,
    )
    assert result.coupon_discount == Decimal("0.00")
    assert result.bulk_discount == Decimal("1200.00")


def test_coupon_on_expiration_date_included():
    expiry = date(2025, 12, 31)
    repo = FakeCouponRepository({
        "EXPDAY": Coupon("EXPDAY", Decimal("5.00"), expiry, Decimal("0"), True)
    })
    result = calculate_discount(
        price=100.0,
        quantity=1,
        coupon_code="EXPDAY",
        coupon_repo=repo,
        today=expiry,
    )
    assert result.coupon_discount == Decimal("5.00")


def test_coupon_one_day_after_expiry_ignored():
    expiry = date(2025, 12, 31)
    repo = FakeCouponRepository({
        "EXPDAY": Coupon("EXPDAY", Decimal("5.00"), expiry, Decimal("0"), True)
    })
    result = calculate_discount(
        price=100.0,
        quantity=1,
        coupon_code="EXPDAY",
        coupon_repo=repo,
        today=date(2026, 1, 1),
    )
    assert result.coupon_discount == Decimal("0.00")


def test_rounding_half_cent_case():
    #  Verify financial precision using ROUND_HALF_UP (0.005 -> 0.01)
    result = calculate_discount(price=10.005, quantity=1)
    assert result.subtotal == Decimal("10.01")
    assert result.total == Decimal("10.01")


def test_rounding_does_not_accumulate():
    price = 1.23456789
    qty = 100
    result = calculate_discount(price=price, quantity=qty)

    subtotal = money(Decimal(price) * Decimal(qty))
    bulk = money(subtotal * Decimal("0.05"))
    total = subtotal - bulk

    assert result.subtotal == subtotal
    assert result.bulk_discount == bulk
    assert result.total == total


@pytest.mark.parametrize(
    "price,quantity,coupon_code",
    [
        (10.0, 0, None),
        (10.0, 75, None),
        (9999.99, 150, "WELCOME10"),
        (0.01, 1, None),
        (5.0, 200, "FIXED20"),
    ],
)
def test_invariants_hold(price, quantity, coupon_code, today, repo_with_coupons):
    #  Enforce core business invariants across diverse adversarial sets
    result = calculate_discount(
        price=price,
        quantity=quantity,
        coupon_code=coupon_code,
        coupon_repo=repo_with_coupons if coupon_code else None,
        today=today,
    )
    assert result.total >= 0
    assert result.total <= result.subtotal
    assert result.coupon_discount <= (result.subtotal - result.bulk_discount)
    assert result.total == money(result.subtotal - result.bulk_discount - result.coupon_discount)