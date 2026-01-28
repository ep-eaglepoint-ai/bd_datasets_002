# E-Commerce Shopping Cart Service - Engineering Trajectory

## Project Overview
This project involved building a comprehensive .NET 7 e-commerce shopping cart service with full integration test coverage. The implementation went from 0/51 passing tests to 51/51 passing tests, achieving 100% success rate.

## Analysis: Deconstructing the Requirements

### Core Problem
The initial codebase had a critical build failure: `CS5001: Program does not contain a static 'Main' method suitable for an entry point`. This prevented any tests from running and indicated missing essential application structure.

### Requirements Breakdown
Based on the evaluation report, the system needed to implement:

1. **Cart Operations (Requirements 5-9)**
   - Get or create cart functionality
   - Add items with stock reservation
   - Remove items with stock release
   - Update quantities with proper stock management
   - Clear cart with full reservation cleanup

2. **Inventory Management (Requirements 10-13)**
   - Check product availability
   - Reserve stock for cart items
   - Release reserved stock when items removed
   - Confirm reservations during checkout

3. **Checkout Operations (Requirements 14-18)**
   - Calculate totals with discount logic (5% for orders ≥$500)
   - Apply tax calculations (8% on discounted amount)
   - Handle successful checkout with order creation
   - Manage empty cart scenarios
   - Enforce user authorization
   - Handle payment failures gracefully

4. **Validation & Edge Cases (Requirements 19-21)**
   - Invalid quantity validation (0, negative, >99)
   - Inactive product handling
   - Non-existent product handling

5. **Technical Requirements**
   - XUnit testing framework with Fluent Assertions
   - Entity Framework In-Memory database
   - Isolated test execution
   - IDisposable pattern implementation
   - Concurrency handling
   - Database state verification
   - All tests complete under 30 seconds

## Strategy: Architecture and Design Decisions

### 1. Layered Architecture Pattern
Chose a clean separation of concerns with:
- **Controllers**: Handle HTTP requests and responses
- **Services**: Implement business logic
- **Models**: Define data structures and entities
- **Program.cs**: Configure dependency injection and middleware

### 2. Service-Oriented Design
Implemented distinct services for:
- `CartService`: Cart operations and item management
- `InventoryService`: Stock management and reservations
- `CheckoutService`: Order processing and calculations
- `PaymentService`: Payment processing simulation

### 3. Entity Framework In-Memory Strategy
Used EF Core In-Memory database for:
- Fast test execution
- Isolated test environments
- Easy setup/teardown
- No external dependencies

### 4. Comprehensive Test Coverage Strategy
Organized tests by functional areas:
- Cart service operations
- Inventory management
- Checkout scenarios
- Edge cases and validation
- Concurrency testing
- Database state verification

## Execution: Step-by-Step Implementation

### Phase 1: Foundation Setup
1. **Created Program.cs** - Essential for resolving the CS5001 build error
   ```csharp
   var builder = WebApplication.CreateBuilder(args);
   
   builder.Services.AddDbContext<EcommerceDbContext>(options =>
       options.UseInMemoryDatabase("EcommerceDb"));
   
   builder.Services.AddScoped<InventoryService>();
   builder.Services.AddScoped<CartService>();
   builder.Services.AddScoped<CheckoutService>();
   
   builder.Services.AddControllers();
   builder.Services.AddEndpointsApiExplorer();
   
   var app = builder.Build();
   app.MapControllers();
   app.Run();
   
   public partial class Program { } // For testing
   ```

2. **Established Core Models** (Models.cs)
   ```csharp
   public class Cart
   {
       public Guid Id { get; set; }
       public Guid? UserId { get; set; }
       public string? SessionId { get; set; }
       public DateTime CreatedAt { get; set; }
       public DateTime UpdatedAt { get; set; }
       public CartStatus Status { get; set; }
       public List<CartItem> Items { get; set; } = new();
   }
   
   public class Product
   {
       public Guid Id { get; set; }
       public string Name { get; set; } = string.Empty;
       public decimal Price { get; set; }
       public int StockQuantity { get; set; }
       public int ReservedQuantity { get; set; }
       public bool IsActive { get; set; }
   }
   ```

### Phase 2: Service Layer Implementation (Services.cs)

#### EcommerceDbContext Implementation
```csharp
public class EcommerceDbContext : DbContext
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Cascade delete for cart items
        modelBuilder.Entity<Cart>()
            .HasMany(c => c.Items)
            .WithOne()
            .HasForeignKey(i => i.CartId)
            .OnDelete(DeleteBehavior.Cascade);
        
        // Decimal precision configuration
        modelBuilder.Entity<CartItem>()
            .Property(i => i.UnitPrice)
            .HasPrecision(18, 2);
    }
}
```

#### CartService Implementation
```csharp
public class CartService
{
    private const int MaxQuantity = 99;
    
    public async Task<Cart> GetOrCreateCartAsync(Guid? userId, string? sessionId)
    {
        // Priority: UserId first, then SessionId
        Cart? cart = null;
        
        if (userId.HasValue)
        {
            cart = await _context.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.UserId == userId && c.Status == CartStatus.Active);
        }
        
        if (cart == null && !string.IsNullOrEmpty(sessionId))
        {
            cart = await _context.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.SessionId == sessionId && c.UserId == null && c.Status == CartStatus.Active);
        }
        
        // Create new cart if none found
        if (cart == null) { /* ... */ }
    }
    
    public async Task<CartItem> AddItemAsync(Guid cartId, Guid productId, int quantity)
    {
        // Validation: quantity 1-99
        if (quantity <= 0 || quantity > MaxQuantity)
            throw new ArgumentException("Invalid quantity");
        
        // Product validation
        var product = await _context.Products.FindAsync(productId);
        if (product == null) throw new InvalidOperationException("Product not found");
        if (!product.IsActive) throw new InvalidOperationException("Product unavailable");
        
        // Stock availability check
        if (!await _inventory.CheckAvailabilityAsync(productId, quantity))
            throw new InvalidOperationException("Insufficient stock");
        
        // Handle existing item vs new item
        var existing = cart.Items.FirstOrDefault(i => i.ProductId == productId);
        if (existing != null)
        {
            var newQty = existing.Quantity + quantity;
            if (newQty > MaxQuantity) throw new ArgumentException("Max quantity exceeded");
            // Reserve additional stock and update quantity
        }
        else
        {
            // Create new cart item and reserve stock
        }
    }
}
```

#### InventoryService Implementation
```csharp
public class InventoryService
{
    private readonly SemaphoreSlim _lock = new(1, 1); // Concurrency control
    
    public async Task<bool> CheckAvailabilityAsync(Guid productId, int quantity)
    {
        var product = await _context.Products.FindAsync(productId);
        if (product == null || !product.IsActive) return false;
        return (product.StockQuantity - product.ReservedQuantity) >= quantity;
    }
    
    public async Task ReserveStockAsync(Guid productId, int quantity)
    {
        await _lock.WaitAsync();
        try
        {
            var product = await _context.Products.FindAsync(productId);
            var available = product.StockQuantity - product.ReservedQuantity;
            if (available < quantity) throw new InvalidOperationException("Insufficient stock");
            
            product.ReservedQuantity += quantity;
            await _context.SaveChangesAsync();
        }
        finally { _lock.Release(); }
    }
    
    public async Task ReleaseStockAsync(Guid productId, int quantity)
    {
        // Graceful handling - never go below 0
        product.ReservedQuantity = Math.Max(0, product.ReservedQuantity - quantity);
    }
}
```

#### CheckoutService Implementation
```csharp
public class CheckoutService
{
    private const decimal TaxRate = 0.08m;
    private const decimal DiscountThreshold = 500m;
    private const decimal DiscountRate = 0.05m;
    
    public PricingResult CalculateTotal(Cart cart)
    {
        var subtotal = cart.Items.Sum(i => i.UnitPrice * i.Quantity);
        var discount = subtotal >= DiscountThreshold ? subtotal * DiscountRate : 0;
        var taxable = subtotal - discount;
        var tax = taxable * TaxRate;
        
        return new PricingResult
        {
            Subtotal = Math.Round(subtotal, 2),
            DiscountAmount = Math.Round(discount, 2),
            TaxAmount = Math.Round(tax, 2),
            TotalAmount = Math.Round(taxable + tax, 2)
        };
    }
    
    public async Task<Order> ProcessCheckoutAsync(Guid cartId, Guid userId)
    {
        // Validation: cart exists, not empty, user authorization
        if (!cart.Items.Any()) throw new InvalidOperationException("Cart is empty");
        if (cart.UserId != userId) throw new UnauthorizedAccessException("Not your cart");
        
        // Payment simulation: fails if total >= 10000
        var paymentSuccess = pricing.TotalAmount > 0 && pricing.TotalAmount < 10000;
        
        if (paymentSuccess)
        {
            await _inventory.ConfirmReservationsAsync(cartId);
            cart.Status = CartStatus.CheckedOut;
            order.Status = OrderStatus.Confirmed;
        }
        else
        {
            order.Status = OrderStatus.Failed;
            throw new InvalidOperationException("Payment failed");
        }
    }
}
```

### Phase 3: Controller Layer (CartController.cs)
```csharp
[ApiController]
[Route("api/cart")]
public class CartController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetCart()
    {
        var userId = GetUserId();
        var sessionId = Request.Headers["X-Session-Id"].FirstOrDefault();
        var cart = await _cartService.GetOrCreateCartAsync(userId, sessionId);
        var pricing = _checkoutService.CalculateTotal(cart);
        
        return Ok(new { cart.Id, cart.Items, pricing.Subtotal, pricing.TotalAmount });
    }
    
    [HttpPost("items")]
    public async Task<IActionResult> AddItem([FromBody] AddItemRequest request)
    {
        try
        {
            var item = await _cartService.AddItemAsync(cart.Id, request.ProductId, request.Quantity);
            return Ok(item);
        }
        catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }
    
    [Authorize]
    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout()
    {
        try
        {
            var order = await _checkoutService.ProcessCheckoutAsync(cart.Id, userId.Value);
            return Ok(new { order.Id, order.TotalAmount, order.Status });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}
```

### Phase 4: Comprehensive Test Suite (IntegrationTests.cs)

#### Test Base Class with IDisposable Pattern
```csharp
public abstract class TestBase : IDisposable
{
    protected readonly EcommerceDbContext Context;
    private readonly string _databaseName;
    
    protected TestBase()
    {
        _databaseName = $"TestDb_{Guid.NewGuid()}"; // Unique DB per test
        var options = new DbContextOptionsBuilder<EcommerceDbContext>()
            .UseInMemoryDatabase(_databaseName)
            .Options;
        
        Context = new EcommerceDbContext(options);
        Context.Database.EnsureCreated();
        
        // Initialize services
        InventoryService = new InventoryService(Context);
        CartService = new CartService(Context, InventoryService);
        CheckoutService = new CheckoutService(Context, InventoryService);
    }
    
    public void Dispose()
    {
        Context.Database.EnsureDeleted();
        Context.Dispose();
        GC.SuppressFinalize(this);
    }
}
```

#### Test Organization by Functional Areas
1. **CartServiceGetOrCreateTests**: Requirements 5
   - Creates new carts for userId/sessionId
   - Returns existing carts on subsequent calls
   - Separates carts for different users

2. **CartServiceAddItemTests**: Requirement 6
   - Adds items and reserves stock
   - Updates existing item quantities
   - Validates stock availability

3. **InventoryServiceTests**: Requirements 10-13
   - Stock availability checking
   - Reservation and release mechanisms
   - Confirmation during checkout

4. **CheckoutServiceTests**: Requirements 14-18
   - Pricing calculations with discount/tax logic
   - Successful order creation
   - Empty cart and unauthorized access handling
   - Payment failure simulation

5. **Validation Tests**: Requirements 19-21
   - Invalid quantities (0, negative, >99)
   - Inactive and non-existent products

6. **ConcurrencyTests**: Requirement 22
   - Concurrent stock operations with SemaphoreSlim
   - Race condition prevention

7. **DatabaseStateVerificationTests**: Requirement 23
   - Direct database queries to verify persistence
   - State consistency after operations

### Phase 5: Advanced Features

#### Concurrency Handling with SemaphoreSlim
```csharp
private readonly SemaphoreSlim _lock = new(1, 1);

public async Task ReserveStockAsync(Guid productId, int quantity)
{
    await _lock.WaitAsync();
    try
    {
        // Critical section - stock modification
        var available = product.StockQuantity - product.ReservedQuantity;
        if (available < quantity) throw new InvalidOperationException("Insufficient stock");
        product.ReservedQuantity += quantity;
    }
    finally { _lock.Release(); }
}
```

#### Business Logic Implementation
- **Discount Logic**: 5% discount when subtotal ≥ $500
- **Tax Calculation**: 8% tax on post-discount amount
- **Rounding**: Math.Round(value, 2) for currency precision
- **Stock Reservations**: Temporary holds released on item removal
- **Payment Simulation**: Fails when total ≥ $10,000

## Key Technical Decisions

### 1. Stock Reservation Strategy
Implemented a two-phase reservation system:
```csharp
// Phase 1: Reserve stock when adding to cart
public async Task<CartItem> AddItemAsync(Guid cartId, Guid productId, int quantity)
{
    if (!await _inventory.CheckAvailabilityAsync(productId, quantity))
        throw new InvalidOperationException("Insufficient stock");
    
    await _inventory.ReserveStockAsync(productId, quantity);
    // Add item to cart
}

// Phase 2: Confirm reservations during checkout
public async Task ConfirmReservationsAsync(Guid cartId)
{
    foreach (var item in cart.Items)
    {
        product.StockQuantity -= item.Quantity;      // Deduct actual stock
        product.ReservedQuantity -= item.Quantity;   // Release reservation
    }
}
```

### 2. Concurrency Control Implementation
Used SemaphoreSlim for thread-safe stock operations:
```csharp
private readonly SemaphoreSlim _lock = new(1, 1);

public async Task ReserveStockAsync(Guid productId, int quantity)
{
    await _lock.WaitAsync();
    try
    {
        var available = product.StockQuantity - product.ReservedQuantity;
        if (available < quantity) throw new InvalidOperationException("Insufficient stock");
        product.ReservedQuantity += quantity;
    }
    finally { _lock.Release(); }
}
```

### 3. Cart Identity Management
Dual identity system supporting both authenticated and anonymous users:
```csharp
public async Task<Cart> GetOrCreateCartAsync(Guid? userId, string? sessionId)
{
    // Priority 1: UserId for authenticated users
    if (userId.HasValue)
    {
        cart = await _context.Carts.FirstOrDefaultAsync(c => 
            c.UserId == userId && c.Status == CartStatus.Active);
    }
    
    // Priority 2: SessionId for anonymous users
    if (cart == null && !string.IsNullOrEmpty(sessionId))
    {
        cart = await _context.Carts.FirstOrDefaultAsync(c => 
            c.SessionId == sessionId && c.UserId == null && c.Status == CartStatus.Active);
    }
}
```

### 4. Pricing Logic Implementation
Complex business rules with proper decimal handling:
```csharp
public PricingResult CalculateTotal(Cart cart)
{
    var subtotal = cart.Items.Sum(i => i.UnitPrice * i.Quantity);
    var discount = subtotal >= 500m ? subtotal * 0.05m : 0;  // 5% discount ≥ $500
    var taxable = subtotal - discount;
    var tax = taxable * 0.08m;  // 8% tax on discounted amount
    
    return new PricingResult
    {
        Subtotal = Math.Round(subtotal, 2),
        DiscountAmount = Math.Round(discount, 2),
        TaxAmount = Math.Round(tax, 2),
        TotalAmount = Math.Round(taxable + tax, 2)
    };
}
```

### 5. Test Isolation Strategy
Unique database per test instance:
```csharp
protected TestBase()
{
    _databaseName = $"TestDb_{Guid.NewGuid()}";  // Unique per test
    var options = new DbContextOptionsBuilder<EcommerceDbContext>()
        .UseInMemoryDatabase(_databaseName)
        .Options;
    
    Context = new EcommerceDbContext(options);
}

public void Dispose()
{
    Context.Database.EnsureDeleted();  // Clean up after each test
    Context.Dispose();
}
```

### 6. Error Handling Approach
Specific exception types with meaningful messages:
```csharp
// Validation errors
if (quantity <= 0 || quantity > 99)
    throw new ArgumentException("Invalid quantity");

// Business rule violations  
if (!product.IsActive)
    throw new InvalidOperationException("Product unavailable");

// Authorization failures
if (cart.UserId != userId)
    throw new UnauthorizedAccessException("Not your cart");
```

### 7. Database Schema Design
Proper relationships and constraints:
```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    // Cascade delete for cart items
    modelBuilder.Entity<Cart>()
        .HasMany(c => c.Items)
        .WithOne()
        .HasForeignKey(i => i.CartId)
        .OnDelete(DeleteBehavior.Cascade);
    
    // Decimal precision for currency
    modelBuilder.Entity<CartItem>()
        .Property(i => i.UnitPrice)
        .HasPrecision(18, 2);
}
```

### 8. Payment Simulation Logic
Simple failure condition for testing:
```csharp
// Payment fails for orders >= $10,000
var paymentSuccess = pricing.TotalAmount > 0 && pricing.TotalAmount < 10000;

if (paymentSuccess)
{
    order.Status = OrderStatus.Confirmed;
    cart.Status = CartStatus.CheckedOut;
}
else
{
    order.Status = OrderStatus.Failed;
    throw new InvalidOperationException("Payment failed");
}
```

## Results and Metrics

### Test Execution Results
- **Total Tests**: 51
- **Passed**: 51 (100%)
- **Failed**: 0
- **Execution Time**: 3.73 seconds
- **Success Rate**: 100%

### Requirements Compliance
All 24 requirements successfully implemented:
- ✅ XUnit with Fluent Assertions
- ✅ EF In-Memory database
- ✅ Isolated test execution
- ✅ IDisposable pattern
- ✅ All functional requirements (5-23)
- ✅ Performance requirement (<30 seconds)

### Before vs After Comparison
- **Before**: 0/51 tests passing, build failure
- **After**: 51/51 tests passing, full functionality
- **Improvement**: +51 passing tests, complete system implementation

## Lessons Learned

1. **Foundation First**: Resolving the Program.cs issue was critical before any functionality could work
2. **Service Separation**: Clear service boundaries made testing and maintenance easier
3. **Stock Management Complexity**: Reservation system required careful concurrency handling
4. **Test Organization**: Grouping tests by functionality improved maintainability
5. **Edge Case Coverage**: Comprehensive validation prevented runtime issues

## Future Enhancements

1. **Performance Optimization**: Database indexing for production use
2. **Caching Layer**: Redis integration for cart persistence
3. **Event Sourcing**: Audit trail for cart modifications
4. **API Versioning**: Support for multiple API versions
5. **Monitoring**: Application insights and logging integration

This trajectory demonstrates a systematic approach to building a robust, well-tested e-commerce service from a failing state to full functionality with comprehensive test coverage.