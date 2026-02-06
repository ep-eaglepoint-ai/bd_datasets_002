#!/usr/bin/env python3
"""
Test runner that FAILS for repository_before and PASSES for repository_after
"""
import sys
import os
from decimal import Decimal

def run_tests(repo_name):
    print(f"Running tests against {repo_name}")
    print("=" * 50)
    
    # Clear any existing cart module
    modules_to_clear = [m for m in sys.modules.keys() if m.startswith('cart')]
    for m in modules_to_clear:
        del sys.modules[m]
    
    # Add the repository to path
    repo_path = os.path.join(os.path.dirname(__file__), '..', repo_name)
    if repo_path in sys.path:
        sys.path.remove(repo_path)
    sys.path.insert(0, repo_path)
    
    # Import modules
    from cart import ShoppingCart, Product, DiscountCode, DiscountCodeManager
    
    # Test results
    tests_passed = 0
    tests_failed = 0
    
    # Test 1: Discount Application Order - EXPECT CORRECT ORDER (fixed first, then percentage)
    print("Test 1: Discount application order...")
    try:
        if repo_name == 'repository_after':
            dm = DiscountCodeManager()
            cart = ShoppingCart('test', Decimal('0.08'), dm)
        else:
            cart = ShoppingCart('test', Decimal('0.08'))
        
        product = Product('1', 'Test Product', Decimal('100'), 'test')
        cart.add_item(product, 1)
        
        perc_disc = DiscountCode('PERC10', 'percentage', Decimal('10'))
        fixed_disc = DiscountCode('FIXED5', 'fixed', Decimal('5'))
        cart.apply_discount(perc_disc)
        cart.apply_discount(fixed_disc)
        result = cart.calculate_total()
        
        # EXPECT: Fixed first ($100-$5=$95), then percentage ($95*0.9=$85.50), tax ($85.50*0.08=$6.84), total=$92.34
        expected_total = 92.34
        actual_total = result['total']
        
        if abs(actual_total - expected_total) < 0.01:
            print(f"  PASS - Total: ${actual_total:.2f}")
            tests_passed += 1
        else:
            print(f"  FAIL - Total: ${actual_total:.2f} (expected ${expected_total:.2f})")
            tests_failed += 1
            
    except Exception as e:
        print(f"  ERROR - {e}")
        tests_failed += 1
    
    # Test 2: Item Removal - EXPECT items to be deleted when quantity <= 0
    print("Test 2: Item removal with over-quantity...")
    try:
        cart.clear()
        cart.add_item(product, 2)
        cart.remove_item('1', 5)  # Remove more than available
        
        expected_items = 0
        actual_items = len(cart.items)
        
        if actual_items == expected_items:
            print(f"  PASS - Items remaining: {actual_items}")
            tests_passed += 1
        else:
            print(f"  FAIL - Items remaining: {actual_items} (expected {expected_items})")
            tests_failed += 1
            
    except Exception as e:
        print(f"  ERROR - {e}")
        tests_failed += 1
    
    # Test 3: Negative Total Prevention - EXPECT totals >= 0
    print("Test 3: Negative total prevention...")
    try:
        cart.clear()
        cart.add_item(product, 1)  # $100
        large_disc = DiscountCode('LARGE', 'fixed', Decimal('150'))
        cart.apply_discount(large_disc)
        result = cart.calculate_total()
        
        actual_total = result['total']
        
        if actual_total >= 0:
            print(f"  PASS - Total: ${actual_total:.2f}")
            tests_passed += 1
        else:
            print(f"  FAIL - Total: ${actual_total:.2f} (should be >= 0)")
            tests_failed += 1
                
    except Exception as e:
        print(f"  ERROR - {e}")
        tests_failed += 1
    
    # Test 4: Add Item Validation - EXPECT rejection of quantity <= 0
    print("Test 4: Add item validation...")
    try:
        cart.clear()
        initial_count = len(cart.items)
        cart.add_item(product, 0)  # Should be rejected
        final_count = len(cart.items)
        
        items_added = final_count - initial_count
        
        if items_added == 0:
            print(f"  PASS - Items added: {items_added} (rejected zero quantity)")
            tests_passed += 1
        else:
            print(f"  FAIL - Items added: {items_added} (should reject zero quantity)")
            tests_failed += 1
                
    except Exception as e:
        print(f"  ERROR - {e}")
        tests_failed += 1
    
    # Summary
    total_tests = tests_passed + tests_failed
    print(f"\n{'='*50}")
    print(f"RESULTS for {repo_name}:")
    print(f"Tests passed: {tests_passed}/{total_tests}")
    print(f"Tests failed: {tests_failed}/{total_tests}")
    
    if tests_failed == 0:
        print("ALL TESTS PASSED")
        sys.exit(0)
    else:
        print("SOME TESTS FAILED")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        repo_name = sys.argv[1]
    else:
        repo_name = 'repository_before'  # default
    
    run_tests(repo_name)