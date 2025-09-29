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
                x.BillImagePath == null ? null : $"/uploads/{Path.GetFileName(x.BillImagePath)}"
            ))
            .ToListAsync();

        return Ok(items);
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
            x.BillImagePath == null ? null : $"/uploads/{Path.GetFileName(x.BillImagePath)}"
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

        _db.Remove(x);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Test OCR với ảnh có sẵn trong uploads folder
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

    // OCR endpoint để extract amount từ image
    /// <summary>
    /// Extracts the amount from an uploaded image using OCR (Optical Character Recognition).
    /// </summary>
    /// <param name="file">The image file containing the amount to be extracted.</param>
    /// <returns>
    /// An <see cref="ActionResult{OcrResultDto}"/> containing the OCR extraction result, including success status,
    /// extracted amount, possible amounts, and any error message.
    /// Returns <c>BadRequest</c> if no file is provided.
    /// </returns>
    /// <remarks>
    /// The maximum allowed file size is 20 MB. The uploaded file is temporarily saved and deleted after processing.
    /// </remarks>
    [HttpPost("extract-amount")]
    [RequestSizeLimit(20_000_000)] // 20 MB
    public async Task<ActionResult<OcrResultDto>> ExtractAmountFromImage(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("No file provided.");

        var tempPath = Path.GetTempFileName();
        try
        {
            // Lưu file tạm thời
            using (var stream = System.IO.File.Create(tempPath))
            {
                await file.CopyToAsync(stream);
            }

            // Gọi OCR service
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
            // Xóa file tạm
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

        // Xóa ảnh cũ nếu có
        if (!string.IsNullOrEmpty(x.BillImagePath) && System.IO.File.Exists(x.BillImagePath))
        {
            System.IO.File.Delete(x.BillImagePath);
        }

        var fname = $"bill_{id}_{Guid.NewGuid():N}{ext}";
        var path = Path.Combine(uploadsDir, fname);
        using (var stream = System.IO.File.Create(path))
        {
            await file.CopyToAsync(stream);
        }

        x.BillImagePath = path;
        await _db.SaveChangesAsync();

        var dto = new ExpenseDto(
            x.Id, x.OccurredAt, x.Amount, x.Currency, x.Category, x.Description,
            $"/uploads/{fname}"
        );
        return Ok(dto);
    }
}
