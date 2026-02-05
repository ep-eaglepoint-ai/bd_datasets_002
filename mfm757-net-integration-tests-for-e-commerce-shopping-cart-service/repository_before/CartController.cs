using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace EcommerceCart;

[ApiController]
[Route("api/cart")]
public class CartController : ControllerBase
{
    private readonly CartService _cartService;
    private readonly CheckoutService _checkoutService;

    public CartController(CartService cartService, CheckoutService checkoutService)
    {
        _cartService = cartService;
        _checkoutService = checkoutService;
    }

    [HttpGet]
    public async Task<IActionResult> GetCart()
    {
        var userId = GetUserId();
        var sessionId = Request.Headers["X-Session-Id"].FirstOrDefault();
        var cart = await _cartService.GetOrCreateCartAsync(userId, sessionId);
        var pricing = _checkoutService.CalculateTotal(cart);

        return Ok(new
        {
            cart.Id,
            cart.Items,
            pricing.Subtotal,
            pricing.DiscountAmount,
            pricing.TaxAmount,
            pricing.TotalAmount
        });
    }

    [HttpPost("items")]
    public async Task<IActionResult> AddItem([FromBody] AddItemRequest request)
    {
        var userId = GetUserId();
        var sessionId = Request.Headers["X-Session-Id"].FirstOrDefault();
        var cart = await _cartService.GetOrCreateCartAsync(userId, sessionId);

        try
        {
            var item = await _cartService.AddItemAsync(cart.Id, request.ProductId, request.Quantity);
            return Ok(item);
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("items/{itemId}")]
    public async Task<IActionResult> UpdateQuantity(Guid itemId, [FromBody] UpdateQuantityRequest request)
    {
        var userId = GetUserId();
        var sessionId = Request.Headers["X-Session-Id"].FirstOrDefault();
        var cart = await _cartService.GetOrCreateCartAsync(userId, sessionId);

        try
        {
            await _cartService.UpdateQuantityAsync(cart.Id, itemId, request.Quantity);
            return Ok();
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("items/{itemId}")]
    public async Task<IActionResult> RemoveItem(Guid itemId)
    {
        var userId = GetUserId();
        var sessionId = Request.Headers["X-Session-Id"].FirstOrDefault();
        var cart = await _cartService.GetOrCreateCartAsync(userId, sessionId);

        try
        {
            await _cartService.RemoveItemAsync(cart.Id, itemId);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpDelete]
    public async Task<IActionResult> ClearCart()
    {
        var userId = GetUserId();
        var sessionId = Request.Headers["X-Session-Id"].FirstOrDefault();
        var cart = await _cartService.GetOrCreateCartAsync(userId, sessionId);
        await _cartService.ClearCartAsync(cart.Id);
        return NoContent();
    }

    [Authorize]
    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout()
    {
        var userId = GetUserId();
        if (!userId.HasValue) return Unauthorized();

        var cart = await _cartService.GetOrCreateCartAsync(userId, null);

        try
        {
            var order = await _checkoutService.ProcessCheckoutAsync(cart.Id, userId.Value);
            return Ok(new { order.Id, order.TotalAmount, order.Status });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null ? Guid.Parse(claim.Value) : null;
    }
}

public record AddItemRequest(Guid ProductId, int Quantity);
public record UpdateQuantityRequest(int Quantity);

