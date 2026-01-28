using Microsoft.EntityFrameworkCore;

namespace EcommerceCart;

public class EcommerceDbContext : DbContext
{
    public EcommerceDbContext(DbContextOptions<EcommerceDbContext> options) : base(options) { }
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Cart>()
            .HasMany(c => c.Items)
            .WithOne()
            .HasForeignKey(i => i.CartId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CartItem>()
            .Property(i => i.UnitPrice)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Product>()
            .Property(p => p.Price)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Order>()
            .Property(o => o.Subtotal)
            .HasPrecision(18, 2);
        modelBuilder.Entity<Order>()
            .Property(o => o.TaxAmount)
            .HasPrecision(18, 2);
        modelBuilder.Entity<Order>()
            .Property(o => o.DiscountAmount)
            .HasPrecision(18, 2);
        modelBuilder.Entity<Order>()
            .Property(o => o.TotalAmount)
            .HasPrecision(18, 2);
    }
}

public class CartService
{
    private readonly EcommerceDbContext _context;
    private readonly InventoryService _inventory;
    private const int MaxQuantity = 99;

    public CartService(EcommerceDbContext context, InventoryService inventory)
    {
        _context = context;
        _inventory = inventory;
    }

    public async Task<Cart> GetOrCreateCartAsync(Guid? userId, string? sessionId)
    {
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

        if (cart == null)
        {
            cart = new Cart
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                SessionId = sessionId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Status = CartStatus.Active
            };
            _context.Carts.Add(cart);
            await _context.SaveChangesAsync();
        }

        return cart;
    }

    public async Task<CartItem> AddItemAsync(Guid cartId, Guid productId, int quantity)
    {
        if (quantity <= 0 || quantity > MaxQuantity)
            throw new ArgumentException("Invalid quantity");

        var cart = await _context.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == cartId && c.Status == CartStatus.Active)
            ?? throw new InvalidOperationException("Cart not found");

        var product = await _context.Products.FindAsync(productId);
        
        if (product == null)
            throw new InvalidOperationException("Product not found");

        if (!product.IsActive)
            throw new InvalidOperationException("Product unavailable");

        if (!await _inventory.CheckAvailabilityAsync(productId, quantity))
            throw new InvalidOperationException("Insufficient stock");

        var existing = cart.Items.FirstOrDefault(i => i.ProductId == productId);
        
        if (existing != null)
        {
            var newQty = existing.Quantity + quantity;
            if (newQty > MaxQuantity)
                throw new ArgumentException("Max quantity exceeded");
            
            if (!await _inventory.CheckAvailabilityAsync(productId, newQty - existing.Quantity + quantity))
                throw new InvalidOperationException("Insufficient stock");
            
            await _inventory.ReserveStockAsync(productId, quantity);
            existing.Quantity = newQty;
            existing.UnitPrice = product.Price;
        }
        else
        {
            await _inventory.ReserveStockAsync(productId, quantity);
            existing = new CartItem
            {
                Id = Guid.NewGuid(),
                CartId = cartId,
                ProductId = productId,
                ProductName = product.Name,
                Quantity = quantity,
                UnitPrice = product.Price
            };
            cart.Items.Add(existing);
            _context.CartItems.Add(existing);
        }

        cart.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task RemoveItemAsync(Guid cartId, Guid itemId)
    {
        var cart = await _context.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == cartId && c.Status == CartStatus.Active)
            ?? throw new InvalidOperationException("Cart not found");

        var item = cart.Items.FirstOrDefault(i => i.Id == itemId)
            ?? throw new InvalidOperationException("Item not found");

        await _inventory.ReleaseStockAsync(item.ProductId, item.Quantity);
        cart.Items.Remove(item);
        _context.CartItems.Remove(item);
        cart.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task UpdateQuantityAsync(Guid cartId, Guid itemId, int newQuantity)
    {
        if (newQuantity <= 0 || newQuantity > MaxQuantity)
            throw new ArgumentException("Invalid quantity");

        var cart = await _context.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == cartId && c.Status == CartStatus.Active)
            ?? throw new InvalidOperationException("Cart not found");

        var item = cart.Items.FirstOrDefault(i => i.Id == itemId)
            ?? throw new InvalidOperationException("Item not found");

        var diff = newQuantity - item.Quantity;
        
        if (diff > 0)
        {
            if (!await _inventory.CheckAvailabilityAsync(item.ProductId, diff))
                throw new InvalidOperationException("Insufficient stock");
            await _inventory.ReserveStockAsync(item.ProductId, diff);
        }
        else if (diff < 0)
        {
            await _inventory.ReleaseStockAsync(item.ProductId, Math.Abs(diff));
        }

        item.Quantity = newQuantity;
        cart.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task ClearCartAsync(Guid cartId)
    {
        var cart = await _context.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == cartId)
            ?? throw new InvalidOperationException("Cart not found");

        foreach (var item in cart.Items.ToList())
        {
            await _inventory.ReleaseStockAsync(item.ProductId, item.Quantity);
            _context.CartItems.Remove(item);
        }

        cart.Items.Clear();
        cart.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }
}

public class InventoryService
{
    private readonly EcommerceDbContext _context;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public InventoryService(EcommerceDbContext context) => _context = context;

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
            var product = await _context.Products.FindAsync(productId)
                ?? throw new InvalidOperationException("Product not found");

            var available = product.StockQuantity - product.ReservedQuantity;
            if (available < quantity)
                throw new InvalidOperationException("Insufficient stock");

            product.ReservedQuantity += quantity;
            await _context.SaveChangesAsync();
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task ReleaseStockAsync(Guid productId, int quantity)
    {
        await _lock.WaitAsync();
        try
        {
            var product = await _context.Products.FindAsync(productId);
            if (product != null)
            {
                product.ReservedQuantity = Math.Max(0, product.ReservedQuantity - quantity);
                await _context.SaveChangesAsync();
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task ConfirmReservationsAsync(Guid cartId)
    {
        await _lock.WaitAsync();
        try
        {
            var cart = await _context.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.Id == cartId);

            if (cart == null) return;

            foreach (var item in cart.Items)
            {
                var product = await _context.Products.FindAsync(item.ProductId);
                if (product != null)
                {
                    product.StockQuantity -= item.Quantity;
                    product.ReservedQuantity -= item.Quantity;
                }
            }
            await _context.SaveChangesAsync();
        }
        finally
        {
            _lock.Release();
        }
    }
}

public class CheckoutService
{
    private readonly EcommerceDbContext _context;
    private readonly InventoryService _inventory;
    private const decimal TaxRate = 0.08m;
    private const decimal DiscountThreshold = 500m;
    private const decimal DiscountRate = 0.05m;

    public CheckoutService(EcommerceDbContext context, InventoryService inventory)
    {
        _context = context;
        _inventory = inventory;
    }

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
        var cart = await _context.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == cartId && c.Status == CartStatus.Active)
            ?? throw new InvalidOperationException("Cart not found");

        if (!cart.Items.Any())
            throw new InvalidOperationException("Cart is empty");

        if (cart.UserId != userId)
            throw new UnauthorizedAccessException("Not your cart");

        foreach (var item in cart.Items)
        {
            var product = await _context.Products.FindAsync(item.ProductId);
            if (product == null || !product.IsActive)
                throw new InvalidOperationException($"Product {item.ProductName} unavailable");
            
            if ((product.StockQuantity - product.ReservedQuantity + item.Quantity) < item.Quantity)
                throw new InvalidOperationException($"Insufficient stock for {item.ProductName}");
        }

        var pricing = CalculateTotal(cart);

        var order = new Order
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CartId = cartId,
            Subtotal = pricing.Subtotal,
            TaxAmount = pricing.TaxAmount,
            DiscountAmount = pricing.DiscountAmount,
            TotalAmount = pricing.TotalAmount,
            Status = OrderStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.Orders.Add(order);

        // Payment simulation: fails if total >= 10000
        var paymentSuccess = pricing.TotalAmount > 0 && pricing.TotalAmount < 10000;

        if (paymentSuccess)
        {
            await _inventory.ConfirmReservationsAsync(cartId);
            cart.Status = CartStatus.CheckedOut;
            order.Status = OrderStatus.Confirmed;
            await _context.SaveChangesAsync();
        }
        else
        {
            order.Status = OrderStatus.Failed;
            await _context.SaveChangesAsync();
            throw new InvalidOperationException("Payment failed");
        }

        return order;
    }
}