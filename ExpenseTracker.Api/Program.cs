using System.Text;
using ExpenseTracker.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using ExpenseTracker.Api.Services; // added for OCR DI registration
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog early
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .CreateLogger();

builder.Host.UseSerilog();

var connStr = builder.Configuration.GetConnectionString("DefaultConnection")
              ?? "Server=localhost;Database=ExpenseTrackerDb;Trusted_Connection=True;TrustServerCertificate=True;";

// EF + Identity
builder.Services.AddDbContext<AppDbContext>(opts => opts.UseSqlServer(connStr));

builder.Services.AddIdentity<AppUser, IdentityRole>(opts =>
    {
        opts.Password.RequireNonAlphanumeric = false;
        opts.Password.RequireUppercase = false;
        opts.Password.RequireLowercase = false;
        opts.Password.RequireDigit = false;
        opts.Password.RequiredLength = 6;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// JWT Auth
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    var jwtKey = builder.Configuration["Jwt:Key"] ?? "72C/X154q6k6HoRHx0siWOoXjJ9uX9jy2vTrIOydgPU=";
    var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "ExpenseTracker";
    options.TokenValidationParameters = new()
    {
        ValidateIssuer = true,
        ValidateAudience = false,
        ValidIssuer = jwtIssuer,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.Zero
    };
});

// Prevent cookie middleware from redirecting for API requests (return 401/403 instead)
builder.Services.ConfigureApplicationCookie(o =>
{
    o.Events.OnRedirectToLogin = ctx =>
    {
        if (ctx.Request.Path.StartsWithSegments("/api"))
        {
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        }
        ctx.Response.Redirect(ctx.RedirectUri);
        return Task.CompletedTask;
    };
    o.Events.OnRedirectToAccessDenied = ctx =>
    {
        if (ctx.Request.Path.StartsWithSegments("/api"))
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        }
        ctx.Response.Redirect(ctx.RedirectUri);
        return Task.CompletedTask;
    };
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://localhost:5173",
                          "http://localhost:4173", "https://localhost:4173",
                          "http://localhost:5174", "https://localhost:5174",
                          "http://localhost:4174", "https://localhost:4174",
                          "http://localhost:4175", "https://localhost:4175",
                          "http://localhost:5175", "https://localhost:5175")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// OCR options + pooling
builder.Services.Configure<OcrOptions>(builder.Configuration.GetSection("Ocr"));
builder.Services.AddSingleton<ITesseractEnginePool, TesseractEnginePool>();
builder.Services.AddScoped<IOcrService, TesseractOcrService>();

builder.Services.AddAuthorization();
builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    var scheme = new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter JWT without Bearer prefix (or with, both accepted)."
    };
    c.AddSecurityDefinition("Bearer", scheme);
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
// Add services to the container.
builder.Services.AddRazorPages();

var app = builder.Build();

try
{
    // Configure the HTTP request pipeline.
    if (!app.Environment.IsDevelopment())
    {
        app.UseExceptionHandler("/Error");
        // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
        app.UseHsts();
    }
    else
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }
    app.UseStaticFiles(); // upload image in wwwroot

    app.UseHttpsRedirection();

    // Use CORS
    app.UseCors("AllowReactApp");
    app.UseRouting();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapStaticAssets();
    app.MapRazorPages().WithStaticAssets();
    app.MapControllers();
    await DbSeeder.SeedAsync(app.Services);
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}