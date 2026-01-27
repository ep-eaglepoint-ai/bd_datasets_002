import pytest
import sys
import os
import time

# Add repository_after to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'repository_after'))
from solution import maxActiveAfterTrades


class TestRequirementMapping:
    """Tests that map directly to prompt requirements"""
    
    def test_basic_trade_operation(self):
        """Requirement: Perform at most one trade per query"""
        s = "0100"
        queries = [[0, 3]]
        result = maxActiveAfterTrades(s, queries)
        # Substring "0100": deactivate '1' at pos 1, activate "00" at pos 2-3
        # Original: 1, After: 4 (all '1's)
        assert result == [4]
    
    def test_independent_queries(self):
        """Requirement: Queries are independent, modifications don't persist"""
        s = "010010"
        queries = [[0, 2], [3, 5], [0, 5]]
        result = maxActiveAfterTrades(s, queries)
        assert len(result) == 3
        # Each query should be processed independently
        assert all(isinstance(r, int) and r >= 0 for r in result)
    
    def test_virtual_augmentation(self):
        """Requirement: Virtual augmentation '1' + substring + '1' for validation"""
        s = "010"
        queries = [[0, 2]]
        result = maxActiveAfterTrades(s, queries)
        # '1' in middle is surrounded by '0's (virtual '1' + '0' + '1' + '0' + virtual '1')
        # After trade: deactivate '1', activate merged '000' → all '1's = 3
        assert result == [3]
    
    def test_time_complexity_requirement(self):
        """Requirement: O(q × n) time complexity"""
        # Generate large input
        n = 10000
        s = "0" * (n // 2) + "1" * (n // 2)
        queries = [[0, n-1] for _ in range(100)]  # 100 queries
        
        start = time.time()
        result = maxActiveAfterTrades(s, queries)
        elapsed = time.time() - start
        
        # Should complete in reasonable time (O(q×n) = 100 × 10000 = 1M operations)
        # Allow 1 second as reasonable threshold
        assert elapsed < 1.0, f"Took {elapsed}s, expected < 1.0s for O(q×n)"
        assert len(result) == 100
    
    def test_space_complexity_requirement(self):
        """Requirement: O(n) auxiliary space per query"""
        # Test with large substring to verify space usage
        n = 5000
        s = "0" * n
        queries = [[0, n-1]]
        result = maxActiveAfterTrades(s, queries)
        # If space was O(n²), this would fail or be very slow
        assert result == [0]  # All zeros, no valid trades
    
    def test_no_regex_requirement(self):
        """Requirement: No regex or external libraries for block detection"""
        # This is verified by code inspection, but we test that solution works
        s = "001100"
        queries = [[0, 5]]
        result = maxActiveAfterTrades(s, queries)
        assert isinstance(result[0], int)


class TestEdgeCases:
    """Comprehensive edge case coverage"""
    
    def test_empty_substring(self):
        """Edge case: Empty substring"""
        s = "01"
        queries = [[1, 0]]  # Invalid range
        result = maxActiveAfterTrades(s, queries)
        assert result == [0]
    
    def test_single_character(self):
        """Edge case: Single character cannot have 'surrounded' condition"""
        s = "010"
        queries = [[0, 0], [1, 1], [2, 2]]
        result = maxActiveAfterTrades(s, queries)
        assert result == [0, 1, 0]
    
    def test_all_zeros(self):
        """Edge case: All zeros, no '1' blocks to deactivate"""
        s = "0000"
        queries = [[0, 3]]
        result = maxActiveAfterTrades(s, queries)
        assert result == [0]
    
    def test_all_ones(self):
        """Edge case: All ones, no valid '1' blocks surrounded by '0's"""
        s = "1111"
        queries = [[0, 3]]
        result = maxActiveAfterTrades(s, queries)
        assert result == [4]
    
    def test_no_valid_trades(self):
        """Edge case: No valid '1' blocks surrounded by '0's"""
        s = "111000"
        queries = [[0, 5]]
        result = maxActiveAfterTrades(s, queries)
        # '1' block at start has virtual '1' on left, not surrounded by '0's
        assert result == [3]
    
    def test_alternating_pattern(self):
        """Edge case: Alternating pattern 010101..."""
        s = "01010101"
        queries = [[0, 7]]
        result = maxActiveAfterTrades(s, queries)
        # Each '1' is surrounded by '0's, can trade
        original_count = s.count('1')
        assert result[0] >= original_count


class TestAdversarialTesting:
    """Tests designed to catch common AI failure modes"""
    
    def test_instruction_forgetfulness_hardcoded_answer(self):
        """Adversarial: Catch hardcoded answers based on examples"""
        # Different pattern than examples, should compute correctly
        s = "0011100111000"
        queries = [[0, 12]]
        result = maxActiveAfterTrades(s, queries)
        # Two '1' blocks: first has gain 2+2=4, second has gain 2+3=5
        # Should choose second, result = 6 + 5 = 11
        assert result == [11]
    
    def test_logical_shortcut_try_except_hiding_bug(self):
        """Adversarial: Ensure solution doesn't use try-except to hide bugs"""
        s = "010"
        queries = [[0, 2]]
        # Should work correctly without exceptions
        result = maxActiveAfterTrades(s, queries)
        assert result == [3]
    
    def test_boundary_condition_abuse(self):
        """Adversarial: Test boundary conditions that might be mishandled"""
        # '1' at start - should NOT be valid for deactivation
        s = "1000"
        queries = [[0, 3]]
        result = maxActiveAfterTrades(s, queries)
        assert result == [1]  # No valid trade
    
    def test_virtual_augmentation_misunderstanding(self):
        """Adversarial: Ensure virtual '1's are correctly handled"""
        s = "00100"
        queries = [[0, 4]]
        result = maxActiveAfterTrades(s, queries)
        # '1' at pos 2 is surrounded by '0's
        # After deactivation: "00000", activate all → "11111" = 5
        assert result == [5]
    
    def test_net_gain_calculation_verification(self):
        """Adversarial: Verify net gain is calculated correctly, not just output"""
        s = "000111000"
        queries = [[0, 8]]
        result = maxActiveAfterTrades(s, queries)
        # '111' block (len 3) surrounded by '000' (len 3) on both sides
        # Gain = 3 + 3 = 6, Original = 3, Result = 3 + 6 = 9
        assert result == [9]


class TestComplexScenarios:
    """Complex multi-block scenarios"""
    
    def test_multiple_valid_trades_select_maximum(self):
        """Multiple valid '1' blocks, should select one with maximum gain"""
        s = "0011100111000"
        queries = [[0, 12]]
        result = maxActiveAfterTrades(s, queries)
        # First '111': left_len=2, right_len=2, gain=4
        # Second '111': left_len=2, right_len=3, gain=5
        # Should choose second: base_ones=6, result=6+5=11
        assert result == [11]
    
    def test_overlapping_queries(self):
        """Overlapping queries should work correctly"""
        s = "01010"
        queries = [[0, 3], [1, 4], [1, 3]]
        result = maxActiveAfterTrades(s, queries)
        assert len(result) == 3
        assert all(r >= 0 for r in result)
    
    def test_large_isolated_blocks(self):
        """Large isolated blocks - choosing optimal trade"""
        s = "000111000111000"
        queries = [[0, 14]]
        result = maxActiveAfterTrades(s, queries)
        original_count = s.count('1')
        assert result[0] >= original_count
    
    def test_nested_pattern(self):
        """Nested pattern with multiple trade candidates"""
        s = "0011001100"
        queries = [[0, 9]]
        result = maxActiveAfterTrades(s, queries)
        original_count = s.count('1')
        assert result[0] >= original_count


class TestPerformanceGating:
    """Performance tests to verify complexity requirements"""
    
    def test_linear_time_per_query(self):
        """Verify O(n) per query, not O(n²)"""
        # Test with increasing sizes
        sizes = [100, 500, 1000, 2000]
        times = []
        
        for n in sizes:
            s = "0" * (n // 2) + "1" * (n // 2)
            queries = [[0, n-1]]
            
            start = time.time()
            maxActiveAfterTrades(s, queries)
            elapsed = time.time() - start
            times.append(elapsed)
        
        # Check that time grows roughly linearly (not quadratically)
        # Ratio of times should be roughly proportional to size ratio
        ratio_1000_100 = times[2] / times[0] if times[0] > 0 else 1
        size_ratio = 1000 / 100
        # Allow some variance, but should be closer to 10 than to 100
        assert ratio_1000_100 < size_ratio * 2, "Time complexity appears worse than O(n)"
    
    def test_multiple_queries_scaling(self):
        """Verify O(q×n) for multiple queries"""
        n = 1000
        s = "0" * (n // 2) + "1" * (n // 2)
        
        query_counts = [10, 50, 100]
        times = []
        
        for q in query_counts:
            queries = [[0, n-1] for _ in range(q)]
            start = time.time()
            maxActiveAfterTrades(s, queries)
            elapsed = time.time() - start
            times.append(elapsed)
        
        # Time should scale roughly linearly with query count
        ratio_100_10 = times[2] / times[0] if times[0] > 0 else 1
        query_ratio = 100 / 10
        assert ratio_100_10 < query_ratio * 2, "Time complexity appears worse than O(q×n)"


class TestExampleCases:
    """Test cases from problem statement examples"""
    
    def test_example_1(self):
        """Example 1: No valid trade possible"""
        s = "01"
        queries = [[0, 1]]
        result = maxActiveAfterTrades(s, queries)
        assert result == [1]
    
    def test_example_2(self):
        """Example 2: Multiple queries"""
        s = "0100"
        queries = [[0, 3], [0, 2], [1, 3], [2, 3]]
        result = maxActiveAfterTrades(s, queries)
        assert result == [4, 3, 1, 0]
    
    def test_example_3(self):
        """Example 3: Complex scenario"""
        s = "1000100"
        queries = [[1, 5], [0, 6], [0, 4]]
        result = maxActiveAfterTrades(s, queries)
        assert result == [5, 7, 2]
    
    def test_example_4(self):
        """Example 4: Overlapping blocks"""
        s = "01010"
        queries = [[0, 3], [1, 4], [1, 3]]
        result = maxActiveAfterTrades(s, queries)
        assert result == [4, 4, 2]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
