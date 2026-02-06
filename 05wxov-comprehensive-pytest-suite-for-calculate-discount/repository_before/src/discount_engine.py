from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

@dataclass(frozen=True)
class DiscountResult:
    subtotal: Decimal
    bulk_discount: Decimal
    coupon_discount: Decimal
    total: Decimal

@dataclass(frozen=True)
class Coupon:
    code: str
    amount_off: Decimal
    expires_on: date
    min_subtotal: Decimal = Decimal("0")
    stackable: bool = True

class CouponRepository:
    def get(self, code: str) -> Coupon | None:
        raise NotImplementedError

def money(x) -> Decimal:
    # rounding rules centralized
    return Decimal(x).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def calculate_discount(
    price: float,
    quantity: int,
    coupon_code: str | None = None,
    *,
    tiers=None,
    coupon_repo: CouponRepository | None = None,
    today: date | None = None,
) -> DiscountResult:
    if today is None:
        today = date.today()

    if quantity < 0:
        raise ValueError("quantity must be >= 0")
    if price < 0:
        raise ValueError("price must be >= 0")

    tiers = tiers or [
        {"min_qty": 101, "percent": Decimal("0.10")},
        {"min_qty": 51, "percent": Decimal("0.05")},
    ]

    subtotal = money(Decimal(price) * Decimal(quantity))

    # choose highest applicable tier
    bulk_rate = Decimal("0")
    for t in tiers:
        if quantity >= t["min_qty"]:
            bulk_rate = max(bulk_rate, t["percent"])

    bulk_discount = money(subtotal * bulk_rate)
    after_bulk = subtotal - bulk_discount

    coupon_discount = Decimal("0.00")
    if coupon_code:
        if coupon_repo is None:
            raise ValueError("coupon_repo required when coupon_code is provided")
        coupon = coupon_repo.get(coupon_code)

        if coupon and today <= coupon.expires_on and after_bulk >= coupon.min_subtotal:
            if coupon.stackable or bulk_discount == 0:
                coupon_discount = min(coupon.amount_off, after_bulk)  # prevent negative totals

    total = money(after_bulk - coupon_discount)
    return DiscountResult(subtotal, bulk_discount, money(coupon_discount), total)