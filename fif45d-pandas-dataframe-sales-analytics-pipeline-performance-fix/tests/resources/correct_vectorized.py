"""
CORRECT IMPLEMENTATION EXAMPLE: Vectorized pandas operations

This demonstrates the correct approach:
- Uses vectorized operations (no loops)
- Handles duplicate keys by keeping first occurrence
- Only rounds final values
- Preserves row order
"""

import pandas as pd
import numpy as np

def calculate_discounts_correct(transactions_df, customer_tiers_df, tax_rates_df):
    """Correct vectorized implementation"""
    
    # Create a copy to avoid modifying input
    result_df = transactions_df.copy()
    
    # ✅ FIX: Handle duplicate keys - keep only first occurrence
    # This prevents row explosion in merge operations
    customer_tiers_df_clean = customer_tiers_df.drop_duplicates(
        subset=['customer_id'], 
        keep='first'
    ).copy()
    tax_rates_df_clean = tax_rates_df.drop_duplicates(
        subset=['state'], 
        keep='first'
    ).copy()
    
    # ✅ FIX: Create tier to discount rate mapping
    tier_discount_map = {
        'platinum': 0.20,
        'gold': 0.15,
        'silver': 0.10,
        'bronze': 0.05
    }
    
    # ✅ FIX: Vectorized merge (left join preserves all transactions)
    result_df = result_df.merge(
        customer_tiers_df_clean[['customer_id', 'tier']],
        on='customer_id',
        how='left'
    )
    result_df['tier'] = result_df['tier'].fillna('bronze')
    
    # ✅ FIX: Vectorized mapping
    result_df['discount_rate'] = result_df['tier'].map(tier_discount_map).fillna(0.05)
    
    # ✅ FIX: Vectorized bulk bonus calculation
    bulk_bonus = (result_df['quantity'] >= 10).astype(float) * 0.05
    result_df['discount_rate'] = result_df['discount_rate'] + bulk_bonus
    
    # ✅ FIX: Vectorized base price calculation
    base_price = result_df['product_price'] * result_df['quantity']
    
    # ✅ FIX: Calculate discount amount (unrounded intermediate)
    discount_amount_unrounded = base_price * result_df['discount_rate']
    
    # ✅ FIX: Calculate subtotal (unrounded intermediate)
    subtotal_unrounded = base_price - discount_amount_unrounded
    
    # ✅ FIX: Vectorized merge for tax rates
    result_df = result_df.merge(
        tax_rates_df_clean[['state', 'tax_rate']],
        on='state',
        how='left'
    )
    result_df['tax_rate'] = result_df['tax_rate'].fillna(0.0)
    
    # ✅ FIX: Calculate tax using unrounded subtotal (vectorized)
    tax_amount_unrounded = subtotal_unrounded * result_df['tax_rate']
    
    # ✅ FIX: Calculate final price using unrounded values (vectorized)
    final_price_unrounded = subtotal_unrounded + tax_amount_unrounded
    
    # ✅ FIX: Round only final values to 2 decimal places
    result_df['discount_amount'] = discount_amount_unrounded.round(2)
    result_df['subtotal'] = subtotal_unrounded.round(2)
    result_df['tax_amount'] = tax_amount_unrounded.round(2)
    result_df['final_price'] = final_price_unrounded.round(2)
    
    # Drop temporary columns
    result_df = result_df.drop(columns=['tier', 'tax_rate'])
    
    # Ensure correct column order
    expected_columns = ['order_id', 'customer_id', 'product_price', 'quantity', 'state',
                       'discount_rate', 'discount_amount', 'subtotal', 'tax_amount', 'final_price']
    result_df = result_df[expected_columns]
    
    return result_df
