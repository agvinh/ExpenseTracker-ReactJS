using ExpenseTracker.Api.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace ExpenseTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly SignInManager<AppUser> _signInManager;
    private readonly IConfiguration _config;

    public AuthController(UserManager<AppUser> userManager, SignInManager<AppUser> signInManager, IConfiguration config)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _config = config;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        var user = new AppUser { UserName = dto.UserName, Email = dto.Email };
        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded) return BadRequest(result.Errors);
        return Ok();
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var user = await _userManager.FindByNameAsync(dto.UserName);
        if (user == null) return Unauthorized();

        var signIn = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, false);
        if (!signIn.Succeeded) return Unauthorized();

        var token = GenerateJwt(user);
        return Ok(new { token });
    }

    private static string? Generate265BitKey()
    {
        // Generate a 256-bit key
        var keyBytes = new byte[32]; // 32 bytes * 8 bits/byte = 256 bits
        RandomNumberGenerator.Fill(keyBytes);
        var base64Key = Convert.ToBase64String(keyBytes);
        return base64Key;
    }
    private string GenerateJwt(AppUser user)
    {
        var keyBytes = Encoding.UTF8.GetBytes(_config["Jwt:Key"]!);
        var signingKey = new SymmetricSecurityKey(keyBytes); // Use the key from configuration
        // TODO : Store the key securely and do not hardcode it in production
        // Example of generating a new 256-bit key
        //var strKey = Generate265BitKey(); // Generate a new 256-bit key
        //var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(strKey!)); // Use the generated key

        var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim> {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(ClaimTypes.NameIdentifier, user.Id),
            new(JwtRegisteredClaimNames.UniqueName, user.UserName!)
        };
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: null,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public record RegisterDto(string UserName, string Email, string Password);
public record LoginDto(string UserName, string Password);
