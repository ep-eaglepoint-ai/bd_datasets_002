using Microsoft.EntityFrameworkCore;
using FluentAssertions;
using Xunit;
using EcommerceCart;

namespace EcommerceCart.Tests;

/// <summary>
/// Base test fixture implementing IDisposable pattern for proper cleanup (Requirement 4)
/// Uses unique database names per test instance (Requirement 3)
/// </summary>
public abstract class TestBase : IDisposable
{
    protected readonly EcommerceDbContext Context;
    protected readonly InventoryService InventoryService;
    protected readonly CartService CartService;
    protected readonly CheckoutService CheckoutService;
    private readonly string _databaseName;

    protected TestBase()
    {
        _databaseName = $"TestDb_{Guid.NewGuid()}";
        var options = new DbContextOptionsBuilder<EcommerceDbContext>()
            .UseInMemoryDatabase(_databaseName)
            .Options;

        Context = new EcommerceDbContext(options);
        Context.Database.EnsureCreated();

        InventoryService = new InventoryService(Context);
        CartService = new CartService(Context, InventoryService);
        CheckoutService = new CheckoutService(Context, InventoryService);
    }

    protected Product CreateProduct(
        string name = "Test Product",
        decimal price = 100m,
        int stock = 10,
        int reserved = 0,
        bool isActive = true)
    {
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = name,
            Price = price,
            StockQuantity = stock,
            ReservedQuantity = reserved,
            IsActive = isActive
        };
        Context.Products.Add(product);
        Context.SaveChanges();
        return product;
    }

    protected Cart CreateCart(Guid? userId = null, string? sessionId = null)
    {
        var cart = new Cart
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SessionId = sessionId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Status = CartStatus.Active
        };
        Context.Carts.Add(cart);
        Context.SaveChanges();
        return cart;
    }

    public void Dispose()
    {
        Context.Database.EnsureDeleted();
        Context.Dispose();
        GC.SuppressFinalize(this);
    }
}

#region CartService Tests (Requirements 5-9)

/// <summary>
/// Requirement 5: Test CartService.GetOrCreateCartAsync
/// </summary>
public class CartServiceGetOrCreateTests : TestBase
{
    [Fact]
    public async Task GetOrCreateCartAsync_CreatesNewCart_ForUserId()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var cart = await CartService.GetOrCreateCartAsync(userId, null);

        // Assert
        cart.Should().NotBeNull();
        cart.UserId.Should().Be(userId);
        cart.Status.Should().Be(CartStatus.Active);

        // Verify database state (Requirement 23)
        var dbCart = await Context.Carts.FindAsync(cart.Id);
        dbCart.Should().NotBeNull();
        dbCart!.UserId.Should().Be(userId);
    }

    [Fact]
    public async Task GetOrCreateCartAsync_CreatesNewCart_ForSessionId()
    {
        // Arrange
        var sessionId = "session-123";

        // Act
        var cart = await CartService.GetOrCreateCartAsync(null, sessionId);

        // Assert
        cart.Should().NotBeNull();
        cart.SessionId.Should().Be(sessionId);
        cart.UserId.Should().BeNull();

        // Verify database state
        var dbCart = await Context.Carts.FindAsync(cart.Id);
        dbCart.Should().NotBeNull();
        dbCart!.SessionId.Should().Be(sessionId);
    }

    [Fact]
    public async Task GetOrCreateCartAsync_ReturnsExistingCart_OnSubsequentCalls()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var cart1 = await CartService.GetOrCreateCartAsync(userId, null);
        var cart2 = await CartService.GetOrCreateCartAsync(userId, null);

        // Assert
        cart1.Id.Should().Be(cart2.Id);

        // Verify only one cart in database
        var cartCount = await Context.Carts.CountAsync(c => c.UserId == userId);
        cartCount.Should().Be(1);
    }

    [Fact]
    public async Task GetOrCreateCartAsync_CreatesSeparateCarts_ForDifferentUsers()
    {
        // Arrange
        var userId1 = Guid.NewGuid();
        var userId2 = Guid.NewGuid();

        // Act
        var cart1 = await CartService.GetOrCreateCartAsync(userId1, null);
        var cart2 = await CartService.GetOrCreateCartAsync(userId2, null);

        // Assert
        cart1.Id.Should().NotBe(cart2.Id);
    }
}

/// <summary>
/// Requirement 6: Test CartService.AddItemAsync
/// </summary>
public class CartServiceAddItemTests : TestBase
{
    [Fact]
    public async Task AddItemAsync_AddsItemToCart_AndReservesStock()
    {
        // Arrange
        var product = CreateProduct(stock: 10, reserved: 0);
        var cart = CreateCart(userId: Guid.NewGuid());

        // Act
        var item = await CartService.AddItemAsync(cart.Id, product.Id, 3);

        // Assert
        item.Should().NotBeNull();
        item.ProductId.Should().Be(product.Id);
        item.Quantity.Should().Be(3);

        // Verify database state (Requirement 23)
        var dbProduct = await Context.Products.FindAsync(product.Id);
        dbProduct!.ReservedQuantity.Should().Be(3);

        var dbCart = await Context.Carts.Include(c => c.Items).FirstAsync(c => c.Id == cart.Id);
        dbCart.Items.Should().HaveCount(1);
    }

    [Fact]
    public async Task AddItemAsync_UpdatesExistingItemQuantity_WhenProductAlreadyInCart()
    {
        // Arrange
        var product = CreateProduct(stock: 20, reserved: 0);
        var cart = CreateCart(userId: Guid.NewGuid());

        // Act
        await CartService.AddItemAsync(cart.Id, product.Id, 3);
        var item = await CartService.AddItemAsync(cart.Id, product.Id, 2);

        // Assert
        item.Quantity.Should().Be(5);

        // Verify database state
        var dbProduct = await Context.Products.FindAsync(product.Id);
        dbProduct!.ReservedQuantity.Should().Be(5);

        var dbCart = await Context.Carts.Include(c => c.Items).FirstAsync(c => c.Id == cart.Id);
        dbCart.Items.Should().HaveCount(1);
        dbCart.Items.First().Quantity.Should().Be(5);
    }

    [Fact]
    public async Task AddItemAsync_ReservesStockInInventory()
    {
        // Arrange
        var product = CreateProduct(stock: 10, reserved: 2);
        var cart = CreateCart(userId: Guid.NewGuid());

        // Act
        await CartService.AddItemAsync(cart.Id, product.Id, 3);

        // Assert - Verify inventory reservation
        var dbProduct = await Context.Products.FindAsync(product.Id);
        dbProduct!.ReservedQuantity.Should().Be(5); // 2 + 3
    }
}

/// <summary>
/// Requirement 7: Test CartService.RemoveItemAsync
/// </summary>
public class CartServiceRemoveItemTests : TestBase
{
    [Fact]
    public async Task RemoveItemAsync_RemovesItemFromCart_AndReleasesStock()
    {
        // Arrange
        var product = CreateProduct(stock: 10, reserved: 0);
        var cart = CreateCart(userId: Guid.NewGuid());
        var item = await CartService.AddItemAsync(cart.Id, product.Id, 3);

        // Act
        await CartService.RemoveItemAsync(cart.Id, item.Id);

        // Assert
        var dbCart = await Context.Carts.Include(c => c.Items).FirstAsync(c => c.Id == cart.Id);
        dbCart.Items.Should().BeEmpty();

        // Verify stock released (Requirement 23)
        var dbProduct = await Context.Products.FindAsync(product.Id);
        dbProduct!.ReservedQuantity.Should().Be(0);
    }

    [Fact]
    public async Task RemoveItemAsync_ThrowsException_WhenItemNotFound()
    {
        // Arrange
        var cart = CreateCart(userId: Guid.NewGuid());

        // Act & Assert
        var act = () => CartService.RemoveItemAsync(cart.Id, Guid.NewGuid());
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Item not found");
    }
}

/// <summary>
/// Requirement 8: Test CartService.UpdateQuantityAsync
/// </summary>
public class CartServiceUpdateQuantityTests : TestBase
{
    [Fact]
    public async Task UpdateQuantityAsync_IncreasesQuantity_AndReservesMoreStock()
    {
        // Arrange
        var product = CreateProduct(stock: 20, reserved: 0);
        var cart = CreateCart(userId: Guid.NewGuid());
        var item = await CartService.AddItemAsync(cart.Id, product.Id, 3);

        // Act
        await CartService.UpdateQuantityAsync(cart.Id, item.Id, 7);

        // Assert
        var dbItem = await Context.CartItems.FindAsync(item.Id);
        dbItem!.Quantity.Should().Be(7);

        // Verify increased reservation
        var dbProduct = await Context.Products.FindAsync(product.Id);
        dbProduct!.ReservedQuantity.Should().Be(7);
    }

    [Fact]
    public async Task UpdateQuantityAsync_DecreasesQuantity_AndReleasesExcessStock()
    {
        // Arrange
        var product = CreateProduct(stock: 20, reserved: 0);
        var cart = CreateCart(userId: Guid.NewGuid());
        var item = await CartService.AddItemAsync(cart.Id, product.Id, 10);

        // Act
        await CartService.UpdateQuantityAsync(cart.Id, item.Id, 4);

        // Assert
        var dbItem = await Context.CartItems.FindAsync(item.Id);
        dbItem!.Quantity.Should().Be(4);

        // Verify released reservation
        var dbProduct = await Context.Products.FindAsync(product.Id);
        dbProduct!.ReservedQuantity.Should().Be(4);
    }
}

/// <summary>
/// Requirement 9: Test CartService.ClearCartAsync
/// </summary>
public class CartServiceClearCartTests : TestBase
{
    [Fact]
    public async Task ClearCartAsync_RemovesAllItems_AndReleasesAllReservations()
    {
        // Arrange
        var product1 = CreateProduct("Product 1", stock: 20);
        var product2 = CreateProduct("Product 2", stock: 20);
        var cart = CreateCart(userId: Guid.NewGuid());

        await CartService.AddItemAsync(cart.Id, product1.Id, 5);
        await CartService.AddItemAsync(cart.Id, product2.Id, 3);

        // Act
        await CartService.ClearCartAsync(cart.Id);

        // Assert
        var dbCart = await Context.Carts.Include(c => c.Items).FirstAsync(c => c.Id == cart.Id);
        dbCart.Items.Should().BeEmpty();

        // Verify all reservations released
        var dbProduct1 = await Context.Products.FindAsync(product1.Id);
        var dbProduct2 = await Context.Products.FindAsync(product2.Id);
        dbProduct1!.ReservedQuantity.Should().Be(0);
        dbProduct2!.ReservedQuantity.Should().Be(0);
    }
}

#endregion

#region InventoryService Tests (Requirements 10-13)

/// <summary>
/// Requirement 10: Test InventoryService.CheckAvailabilityAsync
/// </summary>
public class InventoryServiceCheckAvailabilityTests : TestBase
{
    [Fact]
    public async Task CheckAvailabilityAsync_ReturnsTrue_WhenSufficientStock()
    {
        // Arrange
        var product = CreateProduct(stock: 10, reserved: 3);

        // Act
        var result = await InventoryService.CheckAvailabilityAsync(product.Id, 5);

        // Assert
        result.Should().BeTrue(); // 10 - 3 = 7 available, need 5
    }

    [Fact]
    public async Task CheckAvailabilityAsync_ReturnsFalse_WhenInsufficientStock()
    {
        // Arrange
        var product = CreateProduct(stock: 10, reserved: 8);

        // Act
        var result = await InventoryService.CheckAvailabilityAsync(product.Id, 5);

        // Assert
        result.Should().BeFalse(); // 10 - 8 = 2 available, need 5
    }

    [Fact]
    public async Task CheckAvailabilityAsync_ReturnsFalse_WhenProductInactive()
    {
        // Arrange
        var product = CreateProduct(stock: 10, reserved: 0, isActive: false);

        // Act
        var result = await InventoryService.CheckAvailabilityAsync(product.Id, 1);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task CheckAvailabilityAsync_ReturnsFalse_WhenProductNotFound()
    {
        // Act
        var result = await InventoryService.CheckAvailabilityAsync(Guid.NewGuid(), 1);

        // Assert
        result.Should().BeFalse();
    }
}

/// <summary>
/// Requirement 11: Test InventoryService.ReserveStockAsync
/// </summary>
public class InventoryServiceReserveStockTests : TestBase
{
    [Fact]
    public async Task ReserveStockAsync_IncreasesReservedQuantity()
    {
        // Arrange
        var product = CreateProduct(stock: 10, reserved: 2);

        // Act
        await InventoryService.ReserveStockAsync(product.Id, 3);

        // Assert
        var dbProduct = await Context.Products.FindAsync(product.Id);
        dbProduct!.ReservedQuantity.Should().Be(5);
    }

    [Fact]
    public async Task ReserveStockAsync_ThrowsException_WhenInsufficientStock()
    {
        // Arrange
        var product = CreateProduct(stock: 10, reserved: 8);

        // Act & Assert
        var act = () => InventoryService.ReserveStockAsync(product.Id, 5);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Insufficient stock");
    }
}

/// <summary>
/// Requirement 12: Test InventoryService.ReleaseStockAsync
/// </summary>
public class InventoryServiceReleaseStockTests : TestBase
{
    [Fact]
    public async Task ReleaseStockAsync_DecreasesReservedQuantity()
    {
        // Arrange
        var product = CreateProduct(stock: 10, reserved: 5);

        // Act
        await InventoryService.ReleaseStockAsync(product.Id, 3);

        // Assert
        var dbProduct = await Context.Products.FindAsync(product.Id);
        dbProduct!.ReservedQuantity.Should().Be(2);
    }

    [Fact]
    public async Task ReleaseStockAsync_HandlesReleasingMoreThanReserved_Gracefully()
    {
        // Arrange
        var product = CreateProduct(stock: 10, reserved: 3);

        // Act - Release more than reserved
        await InventoryService.ReleaseStockAsync(product.Id, 10);

        // Assert - Should not go negative
        var dbProduct = await Context.Products.FindAsync(product.Id);
        dbProduct!.ReservedQuantity.Should().Be(0);
    }
}

/// <summary>
/// Requirement 13: Test InventoryService.ConfirmReservationsAsync
/// </summary>
public class InventoryServiceConfirmReservationsTests : TestBase
{
    [Fact]
    public async Task ConfirmReservationsAsync_DeductsFromBothStockAndReserved()
    {
        // Arrange
        var product = CreateProduct(stock: 20, reserved: 0);
        var userId = Guid.NewGuid();
        var cart = await CartService.GetOrCreateCartAsync(userId, null);
        await CartService.AddItemAsync(cart.Id, product.Id, 5);

        // Act
        await InventoryService.ConfirmReservationsAsync(cart.Id);

        // Assert
        var dbProduct = await Context.Products.FindAsync(product.Id);
        dbProduct!.StockQuantity.Should().Be(15); // 20 - 5
        dbProduct!.ReservedQuantity.Should().Be(0); // 5 - 5
    }
}

#endregion

#region CheckoutService Tests (Requirements 14-18)

/// <summary>
/// Requirement 14: Test CheckoutService.CalculateTotal
/// </summary>
public class CheckoutServiceCalculateTotalTests : TestBase
{
    [Fact]
    public void CalculateTotal_ComputesCorrectSubtotal()
    {
        // Arrange
        var cart = new Cart
        {
            Items = new List<CartItem>
            {
                new() { Quantity = 2, UnitPrice = 50m },
                new() { Quantity = 1, UnitPrice = 100m }
            }
        };

        // Act
        var result = CheckoutService.CalculateTotal(cart);

        // Assert
        result.Subtotal.Should().Be(200m); // (2*50) + (1*100)
    }

    [Fact]
    public void CalculateTotal_Applies5PercentDiscount_WhenSubtotalIsAtLeast500()
    {
        // Arrange
        var cart = new Cart
        {
            Items = new List<CartItem>
            {
                new() { Quantity = 5, UnitPrice = 100m } // 500 subtotal
            }
        };

        // Act
        var result = CheckoutService.CalculateTotal(cart);

        // Assert
        result.Subtotal.Should().Be(500m);
        result.DiscountAmount.Should().Be(25m); // 5% of 500
    }

    [Fact]
    public void CalculateTotal_NoDiscount_WhenSubtotalBelow500()
    {
        // Arrange
        var cart = new Cart
        {
            Items = new List<CartItem>
            {
                new() { Quantity = 4, UnitPrice = 100m } // 400 subtotal
            }
        };

        // Act
        var result = CheckoutService.CalculateTotal(cart);

        // Assert
        result.Subtotal.Should().Be(400m);
        result.DiscountAmount.Should().Be(0m);
    }

    [Fact]
    public void CalculateTotal_Calculates8PercentTax_OnDiscountedAmount()
    {
        // Arrange
        var cart = new Cart
        {
            Items = new List<CartItem>
            {
                new() { Quantity = 10, UnitPrice = 100m } // 1000 subtotal
            }
        };

        // Act
        var result = CheckoutService.CalculateTotal(cart);

        // Assert
        result.Subtotal.Should().Be(1000m);
        result.DiscountAmount.Should().Be(50m); // 5% of 1000
        var taxable = 1000m - 50m; // 950
        result.TaxAmount.Should().Be(76m); // 8% of 950
        result.TotalAmount.Should().Be(1026m); // 950 + 76
    }

    [Fact]
    public void CalculateTotal_RoundsToTwoDecimalPlaces()
    {
        // Arrange
        var cart = new Cart
        {
            Items = new List<CartItem>
            {
                new() { Quantity = 3, UnitPrice = 33.33m } // 99.99 subtotal
            }
        };

        // Act
        var result = CheckoutService.CalculateTotal(cart);

        // Assert
        result.Subtotal.Should().Be(99.99m);
        result.TaxAmount.Should().Be(8m); // 8% of 99.99 = 7.9992 ≈ 8.00
    }
}

/// <summary>
/// Requirement 15: Test CheckoutService.ProcessCheckoutAsync success
/// </summary>
public class CheckoutServiceProcessCheckoutSuccessTests : TestBase
{
    [Fact]
    public async Task ProcessCheckoutAsync_CreatesConfirmedOrder_OnSuccess()
    {
        // Arrange
        var product = CreateProduct(price: 100m, stock: 10);
        var userId = Guid.NewGuid();
        var cart = await CartService.GetOrCreateCartAsync(userId, null);
        await CartService.AddItemAsync(cart.Id, product.Id, 2);

        // Act
        var order = await CheckoutService.ProcessCheckoutAsync(cart.Id, userId);

        // Assert
        order.Status.Should().Be(OrderStatus.Confirmed);
        order.UserId.Should().Be(userId);

        // Verify cart status (Requirement 23)
        var dbCart = await Context.Carts.FindAsync(cart.Id);
        dbCart!.Status.Should().Be(CartStatus.CheckedOut);

        // Verify order in database
        var dbOrder = await Context.Orders.FindAsync(order.Id);
        dbOrder.Should().NotBeNull();
        dbOrder!.Status.Should().Be(OrderStatus.Confirmed);
    }

    [Fact]
    public async Task ProcessCheckoutAsync_ConfirmsInventoryReservations()
    {
        // Arrange
        var product = CreateProduct(price: 100m, stock: 10, reserved: 0);
        var userId = Guid.NewGuid();
        var cart = await CartService.GetOrCreateCartAsync(userId, null);
        await CartService.AddItemAsync(cart.Id, product.Id, 3);

        // Act
        await CheckoutService.ProcessCheckoutAsync(cart.Id, userId);

        // Assert - Stock and reserved both reduced
        var dbProduct = await Context.Products.FindAsync(product.Id);
        dbProduct!.StockQuantity.Should().Be(7); // 10 - 3
        dbProduct!.ReservedQuantity.Should().Be(0); // 3 - 3
    }
}

/// <summary>
/// Requirement 16: Test ProcessCheckoutAsync with empty cart
/// </summary>
public class CheckoutServiceEmptyCartTests : TestBase
{
    [Fact]
    public async Task ProcessCheckoutAsync_ThrowsException_WhenCartIsEmpty()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var cart = await CartService.GetOrCreateCartAsync(userId, null);

        // Act & Assert
        var act = () => CheckoutService.ProcessCheckoutAsync(cart.Id, userId);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Cart is empty");
    }
}

/// <summary>
/// Requirement 17: Test ProcessCheckoutAsync with wrong user
/// </summary>
public class CheckoutServiceUnauthorizedTests : TestBase
{
    [Fact]
    public async Task ProcessCheckoutAsync_ThrowsUnauthorizedAccessException_WhenUserMismatch()
    {
        // Arrange
        var product = CreateProduct(price: 100m, stock: 10);
        var cartOwner = Guid.NewGuid();
        var otherUser = Guid.NewGuid();
        var cart = await CartService.GetOrCreateCartAsync(cartOwner, null);
        await CartService.AddItemAsync(cart.Id, product.Id, 1);

        // Act & Assert
        var act = () => CheckoutService.ProcessCheckoutAsync(cart.Id, otherUser);
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Not your cart");
    }
}

/// <summary>
/// Requirement 18: Test ProcessCheckoutAsync payment failure
/// </summary>
public class CheckoutServicePaymentFailureTests : TestBase
{
    [Fact]
    public async Task ProcessCheckoutAsync_CreatesFailedOrder_WhenPaymentFails()
    {
        // Arrange - Create expensive cart (total >= 10000)
        var product = CreateProduct(price: 5000m, stock: 10);
        var userId = Guid.NewGuid();
        var cart = await CartService.GetOrCreateCartAsync(userId, null);
        await CartService.AddItemAsync(cart.Id, product.Id, 3); // 15000 total

        // Act & Assert
        var act = () => CheckoutService.ProcessCheckoutAsync(cart.Id, userId);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Payment failed");

        // Verify cart remains Active
        var dbCart = await Context.Carts.FindAsync(cart.Id);
        dbCart!.Status.Should().Be(CartStatus.Active);

        // Verify order has Failed status
        var dbOrder = await Context.Orders.FirstOrDefaultAsync(o => o.CartId == cart.Id);
        dbOrder.Should().NotBeNull();
        dbOrder!.Status.Should().Be(OrderStatus.Failed);
    }
}

#endregion

#region Validation Tests (Requirements 19-21)

/// <summary>
/// Requirement 19: Test invalid quantities
/// </summary>
public class InvalidQuantityTests : TestBase
{
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-100)]
    public async Task AddItemAsync_ThrowsArgumentException_ForZeroOrNegativeQuantity(int quantity)
    {
        // Arrange
        var product = CreateProduct(stock: 100);
        var cart = CreateCart(userId: Guid.NewGuid());

        // Act & Assert
        var act = () => CartService.AddItemAsync(cart.Id, product.Id, quantity);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Invalid quantity");
    }

    [Fact]
    public async Task AddItemAsync_ThrowsArgumentException_WhenQuantityExceeds99()
    {
        // Arrange
        var product = CreateProduct(stock: 200);
        var cart = CreateCart(userId: Guid.NewGuid());

        // Act & Assert
        var act = () => CartService.AddItemAsync(cart.Id, product.Id, 100);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Invalid quantity");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    [InlineData(100)]
    public async Task UpdateQuantityAsync_ThrowsArgumentException_ForInvalidQuantity(int quantity)
    {
        // Arrange
        var product = CreateProduct(stock: 200);
        var cart = CreateCart(userId: Guid.NewGuid());
        var item = await CartService.AddItemAsync(cart.Id, product.Id, 5);

        // Act & Assert
        var act = () => CartService.UpdateQuantityAsync(cart.Id, item.Id, quantity);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Invalid quantity");
    }
}

/// <summary>
/// Requirement 20: Test inactive product
/// </summary>
public class InactiveProductTests : TestBase
{
    [Fact]
    public async Task AddItemAsync_ThrowsInvalidOperationException_ForInactiveProduct()
    {
        // Arrange
        var product = CreateProduct(stock: 10, isActive: false);
        var cart = CreateCart(userId: Guid.NewGuid());

        // Act & Assert
        var act = () => CartService.AddItemAsync(cart.Id, product.Id, 1);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Product unavailable");
    }
}

/// <summary>
/// Requirement 21: Test non-existent product
/// </summary>
public class NonExistentProductTests : TestBase
{
    [Fact]
    public async Task AddItemAsync_ThrowsInvalidOperationException_ForNonExistentProduct()
    {
        // Arrange
        var cart = CreateCart(userId: Guid.NewGuid());
        var nonExistentProductId = Guid.NewGuid();

        // Act & Assert
        var act = () => CartService.AddItemAsync(cart.Id, nonExistentProductId, 1);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Product not found");
    }
}

#endregion

#region Concurrency Tests (Requirement 22)

/// <summary>
/// Requirement 22: Test concurrent operations
/// </summary>
public class ConcurrencyTests : TestBase
{
    [Fact]
    public async Task ConcurrentAddToCart_OnlyReservesAvailableStock()
    {
        // Arrange
        var product = CreateProduct(stock: 5, reserved: 0);
        var tasks = new List<Task<CartItem?>>();

        // Act - 10 concurrent attempts to add 1 item each
        for (int i = 0; i < 10; i++)
        {
            var userId = Guid.NewGuid();
            tasks.Add(Task.Run(async () =>
            {
                try
                {
                    var cart = await CartService.GetOrCreateCartAsync(userId, null);
                    return await CartService.AddItemAsync(cart.Id, product.Id, 1);
                }
                catch
                {
                    return null;
                }
            }));
        }

        var results = await Task.WhenAll(tasks);

        // Assert - Only 5 should succeed (limited stock)
        var successCount = results.Count(r => r != null);
        successCount.Should().BeLessOrEqualTo(5);

        // Verify database state
        var dbProduct = await Context.Products.FindAsync(product.Id);
        dbProduct!.ReservedQuantity.Should().BeLessOrEqualTo(5);
    }

    [Fact]
    public async Task ConcurrentUpdateQuantity_MaintainsDataIntegrity()
    {
        // Arrange
        var product = CreateProduct(stock: 100, reserved: 0);
        var userId = Guid.NewGuid();
        var cart = await CartService.GetOrCreateCartAsync(userId, null);
        var item = await CartService.AddItemAsync(cart.Id, product.Id, 10);

        // Act - Concurrent quantity updates
        var tasks = new List<Task>();
        for (int i = 0; i < 5; i++)
        {
            var newQty = 10 + i;
            tasks.Add(Task.Run(async () =>
            {
                try
                {
                    await CartService.UpdateQuantityAsync(cart.Id, item.Id, newQty);
                }
                catch { }
            }));
        }

        await Task.WhenAll(tasks);

        // Assert - Final state should be consistent
        var dbItem = await Context.CartItems.FindAsync(item.Id);
        dbItem!.Quantity.Should().BeInRange(10, 14);
    }
}

#endregion

#region Database State Verification (Requirement 23)

/// <summary>
/// Requirement 23: Verify database state after operations
/// </summary>
public class DatabaseStateVerificationTests : TestBase
{
    [Fact]
    public async Task AddItem_PersistsChangesCorrectly()
    {
        // Arrange
        var product = CreateProduct(name: "TestProduct", price: 99.99m, stock: 50);
        var userId = Guid.NewGuid();

        // Act
        var cart = await CartService.GetOrCreateCartAsync(userId, null);
        await CartService.AddItemAsync(cart.Id, product.Id, 5);

        // Assert - Direct database query
        var dbCart = await Context.Carts
            .Include(c => c.Items)
            .FirstAsync(c => c.Id == cart.Id);

        dbCart.UserId.Should().Be(userId);
        dbCart.Items.Should().HaveCount(1);
        dbCart.Items.First().ProductName.Should().Be("TestProduct");
        dbCart.Items.First().UnitPrice.Should().Be(99.99m);
        dbCart.Items.First().Quantity.Should().Be(5);

        var dbProduct = await Context.Products.FindAsync(product.Id);
        dbProduct!.ReservedQuantity.Should().Be(5);
    }

    [Fact]
    public async Task Checkout_PersistsOrderAndUpdatesCart()
    {
        // Arrange
        var product = CreateProduct(price: 100m, stock: 20);
        var userId = Guid.NewGuid();
        var cart = await CartService.GetOrCreateCartAsync(userId, null);
        await CartService.AddItemAsync(cart.Id, product.Id, 2);

        // Act
        var order = await CheckoutService.ProcessCheckoutAsync(cart.Id, userId);

        // Assert - Verify all database changes
        var dbOrder = await Context.Orders.FindAsync(order.Id);
        dbOrder.Should().NotBeNull();
        dbOrder!.Status.Should().Be(OrderStatus.Confirmed);
        dbOrder.TotalAmount.Should().BeGreaterThan(0);

        var dbCart = await Context.Carts.FindAsync(cart.Id);
        dbCart!.Status.Should().Be(CartStatus.CheckedOut);

        var dbProduct = await Context.Products.FindAsync(product.Id);
        dbProduct!.StockQuantity.Should().Be(18);
        dbProduct.ReservedQuantity.Should().Be(0);
    }
}

#endregion

#region Edge Cases and Additional Tests

public class EdgeCaseTests : TestBase
{
    [Fact]
    public async Task AddItem_ThrowsException_WhenInsufficientStock()
    {
        // Arrange
        var product = CreateProduct(stock: 5, reserved: 3);
        var cart = CreateCart(userId: Guid.NewGuid());

        // Act & Assert
        var act = () => CartService.AddItemAsync(cart.Id, product.Id, 5);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Insufficient stock");
    }

    [Fact]
    public async Task UpdateQuantity_ThrowsException_WhenInsufficientStock()
    {
        // Arrange
        var product = CreateProduct(stock: 10, reserved: 0);
        var cart = CreateCart(userId: Guid.NewGuid());
        var item = await CartService.AddItemAsync(cart.Id, product.Id, 5);

        // Act & Assert
        var act = () => CartService.UpdateQuantityAsync(cart.Id, item.Id, 15);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Insufficient stock");
    }

    [Fact]
    public async Task RemoveItem_ThrowsException_WhenCartNotFound()
    {
        // Act & Assert
        var act = () => CartService.RemoveItemAsync(Guid.NewGuid(), Guid.NewGuid());
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Cart not found");
    }

    [Fact]
    public async Task UpdateQuantity_ThrowsException_WhenCartNotFound()
    {
        // Act & Assert
        var act = () => CartService.UpdateQuantityAsync(Guid.NewGuid(), Guid.NewGuid(), 5);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Cart not found");
    }

    [Fact]
    public async Task UpdateQuantity_ThrowsException_WhenItemNotFound()
    {
        // Arrange
        var cart = CreateCart(userId: Guid.NewGuid());

        // Act & Assert
        var act = () => CartService.UpdateQuantityAsync(cart.Id, Guid.NewGuid(), 5);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Item not found");
    }

    [Fact]
    public void CalculateTotal_HandlesEmptyCart()
    {
        // Arrange
        var cart = new Cart { Items = new List<CartItem>() };

        // Act
        var result = CheckoutService.CalculateTotal(cart);

        // Assert
        result.Subtotal.Should().Be(0);
        result.DiscountAmount.Should().Be(0);
        result.TaxAmount.Should().Be(0);
        result.TotalAmount.Should().Be(0);
    }

    [Fact]
    public async Task AddItem_ExceedingMaxQuantity_WithExistingItem_Throws()
    {
        // Arrange
        var product = CreateProduct(stock: 200);
        var cart = CreateCart(userId: Guid.NewGuid());
        await CartService.AddItemAsync(cart.Id, product.Id, 90);

        // Act & Assert - Adding 15 more would exceed 99
        var act = () => CartService.AddItemAsync(cart.Id, product.Id, 15);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Max quantity exceeded");
    }
}

#endregion