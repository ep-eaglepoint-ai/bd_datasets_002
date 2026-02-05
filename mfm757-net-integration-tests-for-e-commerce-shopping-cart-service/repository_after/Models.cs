using System.ComponentModel.DataAnnotations;

namespace EcommerceCart;

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

public class CartItem
{
    public Guid Id { get; set; }
    public Guid CartId { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public enum CartStatus { Active, CheckedOut, Expired }

public class Product
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int StockQuantity { get; set; }
    public int ReservedQuantity { get; set; }
    public bool IsActive { get; set; }
}

public class Order
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid CartId { get; set; }
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public OrderStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
}

public enum OrderStatus { Pending, Confirmed, Failed }

public class PricingResult
{
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
}