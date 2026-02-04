import pandas as pd
import numpy as np
from datetime import datetime

def calculate_discounts(transactions_df, customer_tiers_df, tax_rates_df):
    """
    Calculate discounts, taxes, and final prices for transactions using vectorized operations.
    
    Args:
        transactions_df: DataFrame with columns: order_id, customer_id, product_price, quantity, state
        customer_tiers_df: DataFrame with columns: customer_id, tier (may have duplicates - use first)
        tax_rates_df: DataFrame with columns: state, tax_rate (may have duplicates - use first)
    
    Returns:
        DataFrame with original columns plus: discount_rate, discount_amount, subtotal, tax_amount, final_price
    """
    # Create a copy to avoid modifying the input
    result_df = transactions_df.copy()
    
    # Handle duplicate keys in lookup tables - keep only first occurrence
    # This prevents row explosion in merge operations
    customer_tiers_df_clean = customer_tiers_df.drop_duplicates(subset=['customer_id'], keep='first').copy()
    tax_rates_df_clean = tax_rates_df.drop_duplicates(subset=['state'], keep='first').copy()
    
    # Create tier to discount rate mapping
    tier_discount_map = {
        'platinum': 0.20,
        'gold': 0.15,
        'silver': 0.10,
        'bronze': 0.05
    }
    
    # Merge customer tiers (left join to preserve all transactions)
    # Default to 'bronze' for missing customers
    result_df = result_df.merge(
        customer_tiers_df_clean[['customer_id', 'tier']],
        on='customer_id',
        how='left'
    )
    result_df['tier'] = result_df['tier'].fillna('bronze')
    
    # Map tier to base discount rate using vectorized operation
    result_df['discount_rate'] = result_df['tier'].map(tier_discount_map).fillna(0.05)
    
    # Add bulk bonus (5%) for quantity >= 10 (vectorized)
    bulk_bonus = (result_df['quantity'] >= 10).astype(float) * 0.05
    result_df['discount_rate'] = result_df['discount_rate'] + bulk_bonus
    
    # Calculate base price (vectorized)
    base_price = result_df['product_price'] * result_df['quantity']
    
    # Calculate discount amount (unrounded intermediate)
    discount_amount_unrounded = base_price * result_df['discount_rate']
    
    # Calculate subtotal (unrounded intermediate)
    subtotal_unrounded = base_price - discount_amount_unrounded
    
    # Merge tax rates (left join to preserve all transactions)
    # Default to 0.0 for missing states
    result_df = result_df.merge(
        tax_rates_df_clean[['state', 'tax_rate']],
        on='state',
        how='left'
    )
    result_df['tax_rate'] = result_df['tax_rate'].fillna(0.0)
    
    # Calculate tax amount using unrounded subtotal (vectorized)
    tax_amount_unrounded = subtotal_unrounded * result_df['tax_rate']
    
    # Calculate final price using unrounded values (vectorized)
    final_price_unrounded = subtotal_unrounded + tax_amount_unrounded
    
    # Round only final values to 2 decimal places
    result_df['discount_amount'] = discount_amount_unrounded.round(2)
    result_df['subtotal'] = subtotal_unrounded.round(2)
    result_df['tax_amount'] = tax_amount_unrounded.round(2)
    result_df['final_price'] = final_price_unrounded.round(2)
    
    # Drop temporary columns (tier, tax_rate) to match expected output schema
    result_df = result_df.drop(columns=['tier', 'tax_rate'])
    
    # Ensure column order matches specification exactly
    expected_columns = ['order_id', 'customer_id', 'product_price', 'quantity', 'state', 
                       'discount_rate', 'discount_amount', 'subtotal', 'tax_amount', 'final_price']
    
    # Verify all expected columns exist
    missing_columns = set(expected_columns) - set(result_df.columns)
    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")
    
    # Reorder columns to match specification
    result_df = result_df[expected_columns]
    
    return result_df


def load_and_process_sales(transactions_file, customers_file, tax_rates_file):
    print(f"Loading data at {datetime.now()}")
    
    transactions_df = pd.read_csv(transactions_file)
    customer_tiers_df = pd.read_csv(customers_file)
    tax_rates_df = pd.read_csv(tax_rates_file)
    
    print(f"Processing {len(transactions_df)} transactions...")
    start_time = datetime.now()
    
    result_df = calculate_discounts(transactions_df, customer_tiers_df, tax_rates_df)
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    print(f"Processing completed in {duration:.2f} seconds")
    
    return result_df


if __name__ == "__main__":
    result = load_and_process_sales(
        'data/transactions.csv',
        'data/customer_tiers.csv',
        'data/tax_rates.csv'
    )
    result.to_csv('data/processed_sales.csv', index=False)
    print("Results saved to processed_sales.csv")
