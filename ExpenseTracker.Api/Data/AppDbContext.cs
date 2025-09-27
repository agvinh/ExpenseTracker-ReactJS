using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Api.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Expense> Expenses => Set<Expense>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Expense>(e =>
        {
            e.Property(m => m.Amount).HasPrecision(18, 2); // 18 digits total, 2 decimal places
            e.Property(m => m.Currency).HasMaxLength(3);
            e.Property(m => m.Category).HasMaxLength(100);
        });
    }
}

public class AppUser : Microsoft.AspNetCore.Identity.IdentityUser
{
    // bổ sung trường nếu cần (FullName, etc.)
}

public class Expense
{
    public int Id { get; set; }
    public string UserId { get; set; } = null!;
    public DateTime OccurredAt { get; set; }
    public decimal Amount { get; set; }           // VND
    public string Currency { get; set; } = "VND"; // cố định VND
    public string Category { get; set; } = null!;
    public string? Description { get; set; }
    public string? BillImagePath { get; set; }
}