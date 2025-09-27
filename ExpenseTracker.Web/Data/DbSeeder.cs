using Microsoft.AspNetCore.Identity;

namespace ExpenseTracker.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        var userMgr = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();

        var admin = await userMgr.FindByNameAsync("admin");
        if (admin == null)
        {
            admin = new AppUser { UserName = "admin", Email = "admin@local" };
            await userMgr.CreateAsync(admin, "password");
        }
    }
}