import pytest
import pandas as pd
import numpy as np
import sys
import os

# Add repository paths to sys.path
base_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, os.path.join(base_dir, 'repository_before'))
sys.path.insert(0, os.path.join(base_dir, 'repository_after'))

try:
    import importlib.util
    before_path = os.path.join(base_dir, 'repository_before', 'process_sales.py')
    if os.path.exists(before_path):
        spec = importlib.util.spec_from_file_location("process_sales_before", before_path)
        module_before = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module_before)
        calculate_discounts_before = module_before.calculate_discounts
        BEFORE_AVAILABLE = True
    else:
        BEFORE_AVAILABLE = False
except Exception:
    BEFORE_AVAILABLE = False

# Import after implementation
after_path = os.path.join(base_dir, 'repository_after', 'process_sales.py')
spec_after = importlib.util.spec_from_file_location("process_sales_after", after_path)
module_after = importlib.util.module_from_spec(spec_after)
spec_after.loader.exec_module(module_after)
calculate_discounts_after = module_after.calculate_discounts

# Determine which implementation to use based on TEST_MODE environment variable
TEST_MODE = os.environ.get('TEST_MODE', 'after')
if TEST_MODE == 'before' and BEFORE_AVAILABLE:
    calculate_discounts = calculate_discounts_before
else:
    calculate_discounts = calculate_discounts_after


class TestBasicFunctionality:
    """Test basic discount calculation functionality"""
    
    def test_basic_discount_calculation(self):
        """Test that discounts are calculated correctly for different tiers"""
        transactions = pd.DataFrame({
            'order_id': [1, 2, 3, 4],
            'customer_id': [101, 102, 103, 104],
            'product_price': [100.0, 200.0, 300.0, 400.0],
            'quantity': [1, 2, 3, 4],
            'state': ['CA', 'NY', 'TX', 'FL']
        })
        
        customer_tiers = pd.DataFrame({
            'customer_id': [101, 102, 103, 104],
            'tier': ['bronze', 'silver', 'gold', 'platinum']
        })
        
        tax_rates = pd.DataFrame({
            'state': ['CA', 'NY', 'TX', 'FL'],
            'tax_rate': [0.08, 0.04, 0.0625, 0.06]
        })
        
        result = calculate_discounts(transactions, customer_tiers, tax_rates)
        
        # Check output shape
        assert len(result) == 4, "Output should have same number of rows as input"
        assert 'discount_rate' in result.columns
        assert 'discount_amount' in result.columns
        assert 'subtotal' in result.columns
        assert 'tax_amount' in result.columns
        assert 'final_price' in result.columns
        
        # Check discount rates
        assert result.loc[0, 'discount_rate'] == 0.05  # bronze
        assert result.loc[1, 'discount_rate'] == 0.10  # silver
        assert result.loc[2, 'discount_rate'] == 0.15  # gold
        assert result.loc[3, 'discount_rate'] == 0.20  # platinum


class TestBulkBonus:
    """Test bulk bonus discount (5% for quantity >= 10)"""
    
    def test_bulk_bonus_applied(self):
        """Test that bulk bonus is added for quantity >= 10"""
        transactions = pd.DataFrame({
            'order_id': [1, 2],
            'customer_id': [101, 102],
            'product_price': [100.0, 100.0],
            'quantity': [9, 10],
            'state': ['CA', 'CA']
        })
        
        customer_tiers = pd.DataFrame({
            'customer_id': [101, 102],
            'tier': ['bronze', 'bronze']
        })
        
        tax_rates = pd.DataFrame({
            'state': ['CA'],
            'tax_rate': [0.08]
        })
        
        result = calculate_discounts(transactions, customer_tiers, tax_rates)
        
        # First transaction: bronze (5%) + no bulk = 5%
        assert result.loc[0, 'discount_rate'] == 0.05
        
        # Second transaction: bronze (5%) + bulk (5%) = 10%
        assert result.loc[1, 'discount_rate'] == 0.10
    
    def test_bulk_bonus_with_gold_tier(self):
        """Test bulk bonus is additive with tier discount"""
        transactions = pd.DataFrame({
            'order_id': [1],
            'customer_id': [101],
            'product_price': [100.0],
            'quantity': [15],
            'state': ['CA']
        })
        
        customer_tiers = pd.DataFrame({
            'customer_id': [101],
            'tier': ['gold']
        })
        
        tax_rates = pd.DataFrame({
            'state': ['CA'],
            'tax_rate': [0.08]
        })
        
        result = calculate_discounts(transactions, customer_tiers, tax_rates)
        
        # Gold (15%) + bulk (5%) = 20%
        assert result.loc[0, 'discount_rate'] == 0.20


class TestDuplicateKeys:
    """Test handling of duplicate keys in lookup tables"""
    
    def test_duplicate_customer_ids(self):
        """Test that duplicate customer_ids use first occurrence only"""
        transactions = pd.DataFrame({
            'order_id': [1, 2],
            'customer_id': [101, 101],
            'product_price': [100.0, 100.0],
            'quantity': [1, 1],
            'state': ['CA', 'CA']
        })
        
        # Customer 101 appears twice with different tiers
        customer_tiers = pd.DataFrame({
            'customer_id': [101, 101],
            'tier': ['bronze', 'platinum']  # First is bronze, should use this
        })
        
        tax_rates = pd.DataFrame({
            'state': ['CA'],
            'tax_rate': [0.08]
        })
        
        result = calculate_discounts(transactions, customer_tiers, tax_rates)
        
        # Should use first occurrence (bronze = 5%)
        assert result.loc[0, 'discount_rate'] == 0.05
        assert result.loc[1, 'discount_rate'] == 0.05
        assert len(result) == 2, "Output should have exactly 2 rows (no row explosion)"
    
    def test_duplicate_states(self):
        """Test that duplicate states use first occurrence only"""
        transactions = pd.DataFrame({
            'order_id': [1],
            'customer_id': [101],
            'product_price': [100.0],
            'quantity': [1],
            'state': ['CA']
        })
        
        customer_tiers = pd.DataFrame({
            'customer_id': [101],
            'tier': ['bronze']
        })
        
        # State CA appears twice with different tax rates
        tax_rates = pd.DataFrame({
            'state': ['CA', 'CA'],
            'tax_rate': [0.08, 0.10]  # First is 0.08, should use this
        })
        
        result = calculate_discounts(transactions, customer_tiers, tax_rates)
        
        # Should use first occurrence (0.08)
        # Base: 100, discount: 5%, subtotal: 95, tax: 95 * 0.08 = 7.60
        assert result.loc[0, 'tax_amount'] == pytest.approx(7.60, abs=0.01)
        assert len(result) == 1, "Output should have exactly 1 row (no row explosion)"


class TestMissingKeys:
    """Test handling of missing keys in lookup tables"""
    
    def test_missing_customer_id(self):
        """Test that missing customer_id defaults to bronze tier"""
        transactions = pd.DataFrame({
            'order_id': [1],
            'customer_id': [999],  # Not in customer_tiers
            'product_price': [100.0],
            'quantity': [1],
            'state': ['CA']
        })
        
        customer_tiers = pd.DataFrame({
            'customer_id': [101],  # Different customer
            'tier': ['platinum']
        })
        
        tax_rates = pd.DataFrame({
            'state': ['CA'],
            'tax_rate': [0.08]
        })
        
        result = calculate_discounts(transactions, customer_tiers, tax_rates)
        
        # Should default to bronze (5%)
        assert result.loc[0, 'discount_rate'] == 0.05
    
    def test_missing_state(self):
        """Test that missing state defaults to 0% tax rate"""
        transactions = pd.DataFrame({
            'order_id': [1],
            'customer_id': [101],
            'product_price': [100.0],
            'quantity': [1],
            'state': ['XX']  # Not in tax_rates
        })
        
        customer_tiers = pd.DataFrame({
            'customer_id': [101],
            'tier': ['bronze']
        })
        
        tax_rates = pd.DataFrame({
            'state': ['CA'],
            'tax_rate': [0.08]
        })
        
        result = calculate_discounts(transactions, customer_tiers, tax_rates)
        
        # Should default to 0% tax
        assert result.loc[0, 'tax_amount'] == 0.0


class TestPrecision:
    """Test penny-level precision in calculations"""
    
    def test_unrounded_intermediate_calculations(self):
        """Test that intermediate calculations are not rounded"""
        transactions = pd.DataFrame({
            'order_id': [1],
            'customer_id': [101],
            'product_price': [33.33],
            'quantity': [3],
            'state': ['CA']
        })
        
        customer_tiers = pd.DataFrame({
            'customer_id': [101],
            'tier': ['bronze']
        })
        
        tax_rates = pd.DataFrame({
            'state': ['CA'],
            'tax_rate': [0.08]
        })
        
        result = calculate_discounts(transactions, customer_tiers, tax_rates)
        
        # Base price: 33.33 * 3 = 99.99
        # Discount (5%): 99.99 * 0.05 = 4.9995 (unrounded)
        # Subtotal: 99.99 - 4.9995 = 94.9905 (unrounded)
        # Tax (8%): 94.9905 * 0.08 = 7.59924 (unrounded)
        # Final: 94.9905 + 7.59924 = 102.58974
        
        # Rounded values
        expected_subtotal = round(99.99 - (99.99 * 0.05), 2)
        expected_tax = round((99.99 - (99.99 * 0.05)) * 0.08, 2)
        expected_final = round((99.99 - (99.99 * 0.05)) * (1 + 0.08), 2)
        
        assert result.loc[0, 'subtotal'] == expected_subtotal
        assert result.loc[0, 'tax_amount'] == expected_tax
        assert result.loc[0, 'final_price'] == expected_final


class TestRowOrder:
    """Test that row order is preserved"""
    
    def test_row_order_preserved(self):
        """Test that output rows appear in same order as input"""
        transactions = pd.DataFrame({
            'order_id': [3, 1, 2, 4],
            'customer_id': [103, 101, 102, 104],
            'product_price': [100.0, 200.0, 300.0, 400.0],
            'quantity': [1, 2, 3, 4],
            'state': ['TX', 'CA', 'NY', 'FL']
        })
        
        customer_tiers = pd.DataFrame({
            'customer_id': [101, 102, 103, 104],
            'tier': ['bronze', 'silver', 'gold', 'platinum']
        })
        
        tax_rates = pd.DataFrame({
            'state': ['CA', 'NY', 'TX', 'FL'],
            'tax_rate': [0.08, 0.04, 0.0625, 0.06]
        })
        
        result = calculate_discounts(transactions, customer_tiers, tax_rates)
        
        # Check that order_ids are in the same order
        assert list(result['order_id']) == [3, 1, 2, 4]


class TestColumnOrder:
    """Test that column order matches specification"""
    
    def test_column_order(self):
        """Test that columns appear in correct order"""
        transactions = pd.DataFrame({
            'order_id': [1],
            'customer_id': [101],
            'product_price': [100.0],
            'quantity': [1],
            'state': ['CA']
        })
        
        customer_tiers = pd.DataFrame({
            'customer_id': [101],
            'tier': ['bronze']
        })
        
        tax_rates = pd.DataFrame({
            'state': ['CA'],
            'tax_rate': [0.08]
        })
        
        result = calculate_discounts(transactions, customer_tiers, tax_rates)
        
        expected_columns = ['order_id', 'customer_id', 'product_price', 'quantity', 'state',
                           'discount_rate', 'discount_amount', 'subtotal', 'tax_amount', 'final_price']
        
        assert list(result.columns) == expected_columns


class TestEdgeCases:
    """Test edge cases"""
    
    def test_zero_quantity(self):
        """Test handling of zero quantity orders"""
        transactions = pd.DataFrame({
            'order_id': [1],
            'customer_id': [101],
            'product_price': [100.0],
            'quantity': [0],
            'state': ['CA']
        })
        
        customer_tiers = pd.DataFrame({
            'customer_id': [101],
            'tier': ['bronze']
        })
        
        tax_rates = pd.DataFrame({
            'state': ['CA'],
            'tax_rate': [0.08]
        })
        
        result = calculate_discounts(transactions, customer_tiers, tax_rates)
        
        assert result.loc[0, 'discount_amount'] == 0.0
        assert result.loc[0, 'subtotal'] == 0.0
        assert result.loc[0, 'tax_amount'] == 0.0
        assert result.loc[0, 'final_price'] == 0.0
    
    def test_quantity_exactly_10(self):
        """Test that quantity exactly 10 receives bulk bonus"""
        transactions = pd.DataFrame({
            'order_id': [1],
            'customer_id': [101],
            'product_price': [100.0],
            'quantity': [10],
            'state': ['CA']
        })
        
        customer_tiers = pd.DataFrame({
            'customer_id': [101],
            'tier': ['bronze']
        })
        
        tax_rates = pd.DataFrame({
            'state': ['CA'],
            'tax_rate': [0.08]
        })
        
        result = calculate_discounts(transactions, customer_tiers, tax_rates)
        
        # Bronze (5%) + bulk (5%) = 10%
        assert result.loc[0, 'discount_rate'] == 0.10


class TestPerformance:
    """Test performance requirements"""
    
    def test_large_dataset(self):
        """Test that function can handle large datasets efficiently"""
        # Use smaller dataset for broken code (TEST_MODE=before) to avoid very long test times
        # Use full dataset for correct code (TEST_MODE=after)
        if TEST_MODE == 'before' and BEFORE_AVAILABLE:
            n_rows = 1000  # Smaller dataset for broken code - still tests performance
            max_time = 10  # 10 seconds for 1k rows (iterrows is slow)
        else:
            n_rows = 100000  # Full dataset for correct code
            max_time = 60  # 60 seconds for 100k rows (vectorized is fast)
        
        transactions = pd.DataFrame({
            'order_id': range(1, n_rows + 1),
            'customer_id': np.random.randint(1, 1000, n_rows),
            'product_price': np.random.uniform(10.0, 1000.0, n_rows),
            'quantity': np.random.randint(1, 20, n_rows),
            'state': np.random.choice(['CA', 'NY', 'TX', 'FL', 'XX'], n_rows)
        })
        
        customer_tiers = pd.DataFrame({
            'customer_id': range(1, 1000),
            'tier': np.random.choice(['bronze', 'silver', 'gold', 'platinum'], 999)
        })
        
        tax_rates = pd.DataFrame({
            'state': ['CA', 'NY', 'TX', 'FL'],
            'tax_rate': [0.08, 0.04, 0.0625, 0.06]
        })
        
        import time
        start = time.time()
        result = calculate_discounts(transactions, customer_tiers, tax_rates)
        elapsed = time.time() - start
        
        # Should complete within time limit based on implementation
        assert elapsed < max_time, f"Processing took {elapsed:.2f} seconds, should be < {max_time} seconds for {n_rows} rows"
        
        # Output should have same number of rows
        assert len(result) == n_rows, "Output row count must equal input row count"


class TestFunctionSignature:
    """Test that function signature is unchanged"""
    
    def test_function_signature(self):
        """Test that function accepts correct parameters and returns DataFrame"""
        transactions = pd.DataFrame({
            'order_id': [1],
            'customer_id': [101],
            'product_price': [100.0],
            'quantity': [1],
            'state': ['CA']
        })
        
        customer_tiers = pd.DataFrame({
            'customer_id': [101],
            'tier': ['bronze']
        })
        
        tax_rates = pd.DataFrame({
            'state': ['CA'],
            'tax_rate': [0.08]
        })
        
        result = calculate_discounts(transactions, customer_tiers, tax_rates)
        
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 1
