import pandas as pd
import numpy as np
from datetime import datetime

def calculate_discounts(transactions_df, customer_tiers_df, tax_rates_df):
    for idx, row in transactions_df.iterrows():
        customer_id = row['customer_id']
        
        tier_row = customer_tiers_df[customer_tiers_df['customer_id'] == customer_id]
        if len(tier_row) > 0:
            tier = tier_row.iloc[0]['tier']
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
        
        transactions_df.loc[idx, 'discount_rate'] = discount_rate
        
        base_price = row['product_price'] * row['quantity']
        discount_amount_unrounded = base_price * discount_rate
        subtotal_unrounded = base_price - discount_amount_unrounded
        
        transactions_df.loc[idx, 'discount_amount'] = round(discount_amount_unrounded, 2)
        transactions_df.loc[idx, 'subtotal'] = round(subtotal_unrounded, 2)
        
        state = row['state']
        tax_row = tax_rates_df[tax_rates_df['state'] == state]
        if len(tax_row) > 0:
            tax_rate = tax_row.iloc[0]['tax_rate']
        else:
            tax_rate = 0.0
        
        tax_amount_unrounded = subtotal_unrounded * tax_rate
        final_price_unrounded = subtotal_unrounded + tax_amount_unrounded
        
        transactions_df.loc[idx, 'tax_amount'] = round(tax_amount_unrounded, 2)
        transactions_df.loc[idx, 'final_price'] = round(final_price_unrounded, 2)
    
    return transactions_df


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

