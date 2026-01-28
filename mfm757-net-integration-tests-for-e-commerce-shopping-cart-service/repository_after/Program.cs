using Microsoft.EntityFrameworkCore;
using EcommerceCart;

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

public partial class Program { }