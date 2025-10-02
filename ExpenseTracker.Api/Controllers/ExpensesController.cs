using System.Security.Claims;
using ExpenseTracker.Api.Data;
using ExpenseTracker.Api.Dtos;
using ExpenseTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExpensesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public ExpensesController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    private string? CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");

    /// <summary>
    /// Converts a relative path to absolute file system path for file operations
    /// </summary>
    /// <param name="relativePath">Relative path like /uploads/filename.jpg</param>
    /// <returns>Absolute file system path</returns>
    private string GetAbsoluteFilePath(string relativePath)
    {
        if (string.IsNullOrEmpty(relativePath)) return string.Empty;
        
        // Remove leading slash if present
        var cleanPath = relativePath.TrimStart('/');
        return Path.Combine(_env.WebRootPath ?? "wwwroot", cleanPath);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ExpenseDto>>> GetMyExpenses([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = CurrentUserId!;
        var query = _db.Expenses
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.OccurredAt);

        var items = await query.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => new ExpenseDto(
                x.Id, x.OccurredAt, x.Amount, x.Currency, x.Category, x.Description,
                x.BillImagePath != null && x.BillImagePath.StartsWith("/uploads/") ? x.BillImagePath.Substring("/uploads/".Length) : x.BillImagePath
            ))
            .ToListAsync();
        return Ok(items);
    }

    /// <summary>
    /// Returns ALL expenses for the current user (no pagination) optionally filtered by occurred date range.
    /// WARNING: For very large datasets consider streaming or imposing limits.
    /// </summary>
    /// <param name="start">Inclusive start date (UTC or local). Optional.</param>
    /// <param name="end">Inclusive end date (UTC or local). Optional.</param>
    [HttpGet("export")]
    public async Task<ActionResult<IEnumerable<ExpenseDto>>> ExportAll([FromQuery] DateTime? start = null, [FromQuery] DateTime? end = null)
    {
        var userId = CurrentUserId!;
        var query = _db.Expenses.Where(e => e.UserId == userId);

        if (start.HasValue)
        {
            // Normalize to start of day
            var s = start.Value.Date;
            query = query.Where(e => e.OccurredAt >= s);
        }
        if (end.HasValue)
        {
            // Include entire end day
            var eDate = end.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(e => e.OccurredAt <= eDate);
        }

        var list = await query
            .OrderByDescending(e => e.OccurredAt)
            .Select(x => new ExpenseDto(
                x.Id, x.OccurredAt, x.Amount, x.Currency, x.Category, x.Description,
                x.BillImagePath != null && x.BillImagePath.StartsWith("/uploads/") ? x.BillImagePath.Substring("/uploads/".Length) : x.BillImagePath
            ))
            .ToListAsync();
        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<ExpenseDto>> Create([FromBody] ExpenseCreateDto dto)
    {
        var userId = CurrentUserId!;
        var entity = new Expense
        {
            UserId = userId,
            OccurredAt = dto.OccurredAt,
            Amount = dto.Amount,
            Category = dto.Category,
            Description = dto.Description
        };
        _db.Expenses.Add(entity);
        await _db.SaveChangesAsync();

        var result = CreatedAtAction(nameof(GetById), new { id = entity.Id }, new ExpenseDto(
            entity.Id, entity.OccurredAt, entity.Amount, entity.Currency, entity.Category,
            entity.Description, null
        ));
        return result;
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ExpenseDto>> GetById(int id)
    {
        var userId = CurrentUserId!;
        var x = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
        if (x == null) return NotFound();

        return new ExpenseDto(
            x.Id, x.OccurredAt, x.Amount, x.Currency, x.Category, x.Description,
            x.BillImagePath?.StartsWith("/uploads/") == true ? x.BillImagePath.Substring("/uploads/".Length) : x.BillImagePath
        );
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] ExpenseCreateDto dto)
    {
        var userId = CurrentUserId!;
        var x = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
        if (x == null) return NotFound();

        x.OccurredAt = dto.OccurredAt;
        x.Amount = dto.Amount;
        x.Category = dto.Category;
        x.Description = dto.Description;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = CurrentUserId!;
        var x = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
        if (x == null) return NotFound();

        // Delete associated bill image file if exists
        if (!string.IsNullOrEmpty(x.BillImagePath))
        {
            var absolutePath = GetAbsoluteFilePath(x.BillImagePath);
            if (System.IO.File.Exists(absolutePath))
            {
                try
                {
                    System.IO.File.Delete(absolutePath);
                }
                catch (Exception ex)
                {
                    // Log the error but don't fail the delete operation
                    // Consider using ILogger here in production
                    Console.WriteLine($"Failed to delete image file {absolutePath}: {ex.Message}");
                }
            }
        }

        _db.Remove(x);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Test OCR with existing images in uploads folder
    [HttpPost("test-ocr/{filename}")]
    public async Task<ActionResult<OcrResultDto>> TestOcrWithExistingImage(string filename)
    {
        var uploadsDir = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads");
        var imagePath = Path.Combine(uploadsDir, filename);
        
        if (!System.IO.File.Exists(imagePath))
        {
            return NotFound($"Image {filename} not found in uploads folder");
        }

        try
        {
            var ocrService = HttpContext.RequestServices.GetRequiredService<IOcrService>();
            var result = await ocrService.ExtractAmountFromImageAsync(imagePath);

            return Ok(new OcrResultDto
            {
                Success = result.Success,
                ExtractedAmount = result.ExtractedAmount,
                PossibleAmounts = result.PossibleAmounts,
                ErrorMessage = result.ErrorMessage
            });
        }
        catch (Exception ex)
        {
            return BadRequest($"OCR processing failed: {ex.Message}");
        }
    }

    // OCR endpoint to extract amount from image
    [HttpPost("extract-amount")]
    [RequestSizeLimit(20_000_000)] // 20 MB
    public async Task<ActionResult<OcrResultDto>> ExtractAmountFromImage(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("No file provided.");

        var tempPath = Path.GetTempFileName();
        try
        {
            // Save temporary file
            using (var stream = System.IO.File.Create(tempPath))
            {
                await file.CopyToAsync(stream);
            }

            // Call OCR service
            var ocrService = HttpContext.RequestServices.GetRequiredService<IOcrService>();
            var result = await ocrService.ExtractAmountFromImageAsync(tempPath);

            return Ok(new OcrResultDto
            {
                Success = result.Success,
                ExtractedAmount = result.ExtractedAmount,
                PossibleAmounts = result.PossibleAmounts,
                ErrorMessage = result.ErrorMessage
            });
        }
        finally
        {
            // Delete temporary file
            if (System.IO.File.Exists(tempPath))
            {
                System.IO.File.Delete(tempPath);
            }
        }
    }

    // Upload/replace bill image (multipart/form-data)
    [HttpPost("{id:int}/bill-image")]
    [RequestSizeLimit(20_000_000)] // 20 MB
    public async Task<ActionResult<ExpenseDto>> UploadBillImage(int id, IFormFile file)
    {
        var userId = CurrentUserId!;
        var x = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
        if (x == null) return NotFound();

        if (file == null || file.Length == 0) return BadRequest("No file.");

        var uploadsDir = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads");
        Directory.CreateDirectory(uploadsDir);

        var ext = Path.GetExtension(file.FileName);
        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff" };
        if (!allowed.Contains(ext.ToLower())) return BadRequest("Unsupported file type.");

        // Delete old image if exists
        if (!string.IsNullOrEmpty(x.BillImagePath))
        {
            var oldAbsolutePath = GetAbsoluteFilePath(x.BillImagePath);
            if (System.IO.File.Exists(oldAbsolutePath))
            {
                try
                {
                    System.IO.File.Delete(oldAbsolutePath);
                }
                catch (Exception ex)
                {
                    // Log the error but continue with upload
                    Console.WriteLine($"Failed to delete old image file {oldAbsolutePath}: {ex.Message}");
                }
            }
        }

        // Generate new filename and save file
        var fname = $"bill_{id}_{Guid.NewGuid():N}{ext}";
        var absolutePath = Path.Combine(uploadsDir, fname);
        
        using (var stream = System.IO.File.Create(absolutePath))
        {
            await file.CopyToAsync(stream);
        }

        // Store ONLY filename in database. (Previously stored "/uploads/filename")
        x.BillImagePath = fname;
        await _db.SaveChangesAsync();

        var dto = new ExpenseDto(
            x.Id, x.OccurredAt, x.Amount, x.Currency, x.Category, x.Description,
            fname
        );
        return Ok(dto);
    }
}
