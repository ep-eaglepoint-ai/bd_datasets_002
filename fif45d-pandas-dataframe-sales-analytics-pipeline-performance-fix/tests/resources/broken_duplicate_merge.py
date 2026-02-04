"""
BROKEN IMPLEMENTATION EXAMPLE: Duplicate merge causing row explosion

This demonstrates the row explosion issue when lookup tables have duplicate keys.
"""

import pandas as pd

def calculate_discounts_broken_merge(transactions_df, customer_tiers_df, tax_rates_df):
    """Broken implementation that causes row explosion with duplicate keys"""
    
    # ❌ PROBLEM: merge() without handling duplicates creates cartesian product
    # If customer_tiers_df has 2 rows for customer_id=101, and transactions has 1 row,
    # the merge will create 2 output rows instead of 1
    
    result_df = transactions_df.merge(
        customer_tiers_df[['customer_id', 'tier']],
        on='customer_id',
        how='left'
    )
    
    # If customer_tiers_df has duplicates:
    # Input: 10,000 transactions
    # customer_tiers_df has 2 entries for 1,000 customers
    # Result: 10,000 + 1,000 = 11,000 rows (or more if more duplicates)
    
    # ❌ Same issue with tax_rates
    result_df = result_df.merge(
        tax_rates_df[['state', 'tax_rate']],
        on='state',
        how='left'
    )
    
    # If both have duplicates, row count can explode:
    # 10,000 input → 21,847 output (as seen in problem statement)
    
    return result_df
