# MFM757 - .NET Integration Tests for E-commerce Shopping Cart Service

**Category:** sft

## Overview
- Task ID: MFM757
- Title: .NET Integration Tests for E-commerce Shopping Cart Service
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: mfm757-net-integration-tests-for-e-commerce-shopping-cart-service

## Requirements
- Create a test project using xUnit framework with FluentAssertions for readable assertions.
- Use Entity Framework Core InMemory provider to create isolated database instances for each test.
- Each test must be independent with no shared state between tests. Use unique database names per test instance.
- Implement IDisposable pattern to properly clean up database context after each test.
- Test CartService.GetOrCreateCartAsync creates new cart for user ID or session ID, and returns existing cart on subsequent calls.
- Test CartService.AddItemAsync adds item to cart, reserves stock in inventory, and updates existing item quantity if product already in cart.
- Test CartService.RemoveItemAsync removes item from cart and releases reserved stock back to inventory.
- Test CartService.UpdateQuantityAsync adjusts item quantity and updates inventory reservation accordingly (reserve more or release excess).
- Test CartService.ClearCartAsync removes all items and releases all inventory reservations.
- Test InventoryService.CheckAvailabilityAsync returns true when stock minus reserved quantity is sufficient, false otherwise.
- Test InventoryService.ReserveStockAsync increases reserved quantity and throws when insufficient stock available.
- Test InventoryService.ReleaseStockAsync decreases reserved quantity and handles releasing more than reserved gracefully.
- Test InventoryService.ConfirmReservationsAsync deducts from both stock quantity and reserved quantity when order is confirmed.
- Test CheckoutService.CalculateTotal computes subtotal, applies 5% discount when subtotal >= 500, calculates 8% tax on discounted amount, and rounds to 2 decimal places.
- Test CheckoutService.ProcessCheckoutAsync creates order with Confirmed status, marks cart as CheckedOut, and confirms inventory reservations on success.
- Test CheckoutService.ProcessCheckoutAsync throws exception when cart is empty.
- Test CheckoutService.ProcessCheckoutAsync throws UnauthorizedAccessException when user ID does not match cart owner.
- Test CheckoutService.ProcessCheckoutAsync creates order with Failed status when payment fails (total >= 10000) and cart remains Active.
- Test adding item with zero, negative, or quantity exceeding 99 throws ArgumentException.
- Test adding inactive product throws InvalidOperationException with message "Product unavailable".
- Test adding non-existent product throws InvalidOperationException with message "Product not found".
- Test concurrent add-to-cart operations for limited stock item where only available quantity can be reserved.
- Verify database state after each operation by querying the DbContext directly to confirm changes are persisted correctly.
- All tests must complete in under 30 seconds total execution time.

## Metadata
- Programming Languages: C#
- Frameworks: .NET
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Run tests locally: `python -m pytest -q tests`
- With Docker: `docker compose up --build --abort-on-container-exit`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
