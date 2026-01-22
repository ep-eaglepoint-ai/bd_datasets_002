"""
BROKEN IMPLEMENTATION EXAMPLE: iterrows() based approach

This demonstrates the performance issues:
- Uses iterrows() which is extremely slow
- Uses loc[] assignments in loop causing copy-on-write memory issues
- Does not handle duplicate keys properly (may cause row explosion)
- Rounds intermediate values causing precision errors
"""

import pandas as pd

def calculate_discounts_broken(transactions_df, customer_tiers_df, tax_rates_df):
    """Broken implementation using iterrows()"""
    for idx, row in transactions_df.iterrows():  # ❌ SLOW: iterrows() is row-by-row
        customer_id = row['customer_id']
        
        # ❌ SLOW: DataFrame filtering in loop
        tier_row = customer_tiers_df[customer_tiers_df['customer_id'] == customer_id]
        if len(tier_row) > 0:
            tier = tier_row.iloc[0]['tier']  # ❌ May not be first occurrence if duplicates exist
        else:
            tier = 'bronze'
        
        if tier == 'platinum':
            discount_rate = 0.20
        elif tier == 'gold':
            discount_rate = 0.15
        elif tier == 'silver':
            discount_rate = 0.10
        else:
            discount_rate = 0.05
        
        if row['quantity'] >= 10:
            discount_rate = discount_rate + 0.05
        
        # ❌ MEMORY ISSUE: loc[] assignment in loop causes copy-on-write
        transactions_df.loc[idx, 'discount_rate'] = discount_rate
        
        base_price = row['product_price'] * row['quantity']
        discount_amount_unrounded = base_price * discount_rate
        subtotal_unrounded = base_price - discount_amount_unrounded
        
        # ❌ PRECISION ISSUE: Rounding intermediate values
        transactions_df.loc[idx, 'discount_amount'] = round(discount_amount_unrounded, 2)
        transactions_df.loc[idx, 'subtotal'] = round(subtotal_unrounded, 2)  # ❌ Rounded before tax calculation
        
        state = row['state']
        tax_row = tax_rates_df[tax_rates_df['state'] == state]
        if len(tax_row) > 0:
            tax_rate = tax_row.iloc[0]['tax_rate']  # ❌ May not be first occurrence
        else:
            tax_rate = 0.0
        
        # ❌ PRECISION ISSUE: Using rounded subtotal for tax calculation
        tax_amount_unrounded = subtotal_unrounded * tax_rate
        final_price_unrounded = subtotal_unrounded + tax_amount_unrounded
        
        transactions_df.loc[idx, 'tax_amount'] = round(tax_amount_unrounded, 2)
        transactions_df.loc[idx, 'final_price'] = round(final_price_unrounded, 2)
    
    return transactions_df
