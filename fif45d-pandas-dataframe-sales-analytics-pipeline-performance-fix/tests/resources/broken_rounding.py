"""
BROKEN IMPLEMENTATION EXAMPLE: Incorrect rounding causing precision errors

This demonstrates the $0.01-$0.02 drift issue from rounding intermediate values.
"""

import pandas as pd

def calculate_discounts_broken_rounding(transactions_df, customer_tiers_df, tax_rates_df):
    """Broken implementation with incorrect rounding"""
    
    # Calculate base price
    base_price = transactions_df['product_price'] * transactions_df['quantity']
    
    # Calculate discount
    discount_rate = 0.10  # Example: 10%
    discount_amount = base_price * discount_rate
    
    # ❌ PROBLEM: Rounding intermediate value
    subtotal = round(base_price - discount_amount, 2)  # Rounded too early!
    
    # Calculate tax on rounded subtotal
    tax_rate = 0.08
    tax_amount = round(subtotal * tax_rate, 2)  # ❌ Using rounded value
    
    # Final price
    final_price = round(subtotal + tax_amount, 2)
    
    # Example of error:
    # Base: $100.00
    # Discount (10%): $10.00
    # Subtotal (rounded): $90.00
    # Tax (8% of $90.00): $7.20
    # Final: $97.20
    #
    # CORRECT calculation:
    # Base: $100.00
    # Discount (10%): $10.00
    # Subtotal (unrounded): $90.00
    # Tax (8% of $90.00): $7.20
    # Final (rounded): $97.20
    #
    # But with more precision:
    # Base: $33.33
    # Discount (10%): $3.333
    # Subtotal (rounded): $29.99  ❌ Lost precision
    # Tax (8% of $29.99): $2.3992 → $2.40
    # Final: $32.39
    #
    # CORRECT:
    # Base: $33.33
    # Discount (10%): $3.333
    # Subtotal (unrounded): $29.997
    # Tax (8% of $29.997): $2.39976
    # Final (rounded): $32.40  ✅ Correct
    
    return transactions_df
