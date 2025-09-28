using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Tesseract;
using ImageMagick;

namespace ExpenseTracker.Api.Services;

public interface IOcrService
{
    Task<OcrResult> ExtractAmountFromImageAsync(string imagePath, CancellationToken cancellationToken = default);
}

public class OcrResult
{
    public bool Success { get; set; }
    public decimal? ExtractedAmount { get; set; }
    public string? RawText { get; set; }
    public string? ErrorMessage { get; set; }
    public List<decimal> PossibleAmounts { get; set; } = new();
}

public class TesseractOcrService : IOcrService
{
    private readonly ITesseractEnginePool _enginePool;
    private readonly ILogger<TesseractOcrService> _logger;
    private readonly OcrOptions _options;

    public TesseractOcrService(IOptions<OcrOptions> opts, ITesseractEnginePool enginePool, ILogger<TesseractOcrService> logger)
    {
        _logger = logger;
        _enginePool = enginePool;
        _options = opts.Value;
    }

    public async Task<OcrResult> ExtractAmountFromImageAsync(string imagePath, CancellationToken cancellationToken = default)
    {
        return await Task.Run(() =>
        {
            TesseractEngineRent? rented = null;
            try
            {
                rented = _enginePool.Rent(cancellationToken);
                var engine = rented.Engine;

                // Configure Tesseract cho nhận dạng số & từ khóa VN/EN
                engine.SetVariable("tessedit_char_whitelist", "0123456789.,VNDvndđĐdongDONGtổngTỔNGtotalTOTALsumSUMthànhTHÀNHtiềnTIỀNtoánTOÁNpaymentPAYMENTcộngCỘNG ");
                engine.SetVariable("classify_bln_numeric_mode", "1");

                cancellationToken.ThrowIfCancellationRequested();

                Pix processedImg;
                if (_options.EnableImageMagickPreprocessing)
                {
                    _logger.LogDebug("Using ImageMagick preprocessing for {ImagePath}", imagePath);
                    processedImg = PreprocessImageWithMagick(imagePath);
                }
                else
                {
                    _logger.LogDebug("Using basic Tesseract preprocessing for {ImagePath}", imagePath);
                    using var img = Pix.LoadFromFile(imagePath);
                    processedImg = PreprocessImageBasic(img);
                }

                cancellationToken.ThrowIfCancellationRequested();
                using (processedImg)
                using (var page = engine.Process(processedImg))
                {
                    var rawText = page.GetText();
                    _logger.LogInformation("OCR Raw Text: {RawText}", rawText);

                    var result = new OcrResult { RawText = rawText, Success = true };
                    var amounts = ExtractAmountsFromText(rawText);
                    result.PossibleAmounts = amounts;
                    result.ExtractedAmount = DetermineMainAmount(amounts, rawText);
                    return result;
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("OCR operation cancelled for image {ImagePath}", imagePath);
                return new OcrResult { Success = false, ErrorMessage = "OCR cancelled" };
            }
            catch (TimeoutException tex)
            {
                _logger.LogWarning(tex, "Timeout obtaining OCR engine for image {ImagePath}", imagePath);
                return new OcrResult { Success = false, ErrorMessage = tex.Message };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OCR processing failed for image: {ImagePath}", imagePath);
                return new OcrResult { Success = false, ErrorMessage = ex.Message };
            }
            finally
            {
                rented?.Dispose(); // trả engine về pool
            }
        }, cancellationToken);
    }

    /// <summary>
    /// Advanced image preprocessing using ImageMagick for better OCR accuracy.
    /// </summary>
    private Pix PreprocessImageWithMagick(string imagePath)
    {
        try
        {
            var preprocessedBytes = PreprocessImageBytes(File.ReadAllBytes(imagePath));
            return Pix.LoadFromMemory(preprocessedBytes);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ImageMagick preprocessing failed for {ImagePath}, falling back to basic preprocessing", imagePath);
            using var img = Pix.LoadFromFile(imagePath);
            return PreprocessImageBasic(img);
        }
    }

    /// <summary>
    /// ImageMagick preprocessing pipeline: orientation, grayscale, contrast, deskew, resize, threshold.
    /// </summary>
    private byte[] PreprocessImageBytes(byte[] input)
    {
        using var img = new MagickImage(input);
        
        // Auto-orient based on EXIF data
        img.AutoOrient();
        _logger.LogDebug("Applied auto-orientation");

        // Convert to grayscale
        img.ColorSpace = ColorSpace.Gray;
        _logger.LogDebug("Converted to grayscale");

        // Enhance contrast by stretching histogram (remove extreme 1% black/white points)
        img.ContrastStretch(new Percentage(1));
        _logger.LogDebug("Applied contrast stretch");

        // Attempt to correct skew (up to 40 degrees)
        try
        {
            img.Deskew(new Percentage(40));
            _logger.LogDebug("Applied deskew correction");
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Deskew failed, continuing without skew correction");
        }

        // Resize if image is too small (OCR works better on larger images)
        if (img.Width < 800 || img.Height < 600)
        {
            var scaleFactor = Math.Max(800.0 / img.Width, 600.0 / img.Height);
            img.FilterType = FilterType.Triangle; // Good balance of quality/speed
            img.Resize(new Percentage(scaleFactor * 100));
            _logger.LogDebug("Resized image by factor {ScaleFactor}", scaleFactor);
        }

        // Apply binary threshold for cleaner text (60% threshold)
        img.Threshold(new Percentage(60));
        _logger.LogDebug("Applied binary threshold");

        // Ensure PNG format for compatibility
        img.Format = MagickFormat.Png;
        
        var result = img.ToByteArray();
        _logger.LogDebug("ImageMagick preprocessing completed, output size: {Size} bytes", result.Length);
        return result;
    }

    /// <summary>
    /// Basic preprocessing using only Tesseract/Leptonica (fallback method).
    /// </summary>
    private Pix PreprocessImageBasic(Pix originalImage)
    {
        try
        {
            var grayscale = originalImage.ConvertRGBToGray();
            var w = grayscale.Width; 
            var h = grayscale.Height;
            
            if (w < 800 || h < 600)
            {
                var scale = Math.Max(800f / w, 600f / h);
                var scaled = grayscale.Scale(scale, scale);
                grayscale.Dispose();
                _logger.LogDebug("Basic preprocessing: resized by {Scale}", scale);
                return scaled;
            }
            
            _logger.LogDebug("Basic preprocessing: converted to grayscale");
            return grayscale;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Basic preprocessing failed, using original image");
            return originalImage.Clone();
        }
    }

    private List<decimal> ExtractAmountsFromText(string text)
    {
        var amounts = new List<decimal>();

        _logger.LogInformation("Processing OCR text: {Text}", text);

        // Enhanced Vietnamese currency patterns with better recognition
        var vietnamesePatterns = new[]
        {
            // Direct currency symbol patterns
            @"(\d{1,3}(?:\.\d{3})+)\s*(?:VND|VNĐ|đ|D|dong|DONG)\b",     // 510.000 VND, 123.456.789 đ
            @"(\d{1,3}(?:\.\d{3})+)(?:\s*đ|\s*VND|\s*VNĐ|\s*D)?\b",      // 510.000đ, 123.456 (standalone)
            @"(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)\s*(?:VND|VNĐ|đ|D)\b",  // 123.456,78 VND (with decimals)
            @"(?:VND|VNĐ|đ|D)\s*(\d{1,3}(?:\.\d{3})+)",                  // VND 510.000
            
            // Context-based patterns (looking for keywords)
            @"(?:TỔNG|TOTAL|SUM|THÀNH TIỀN|THANH TOÁN|PAYMENT|CỘNG|TỔNG CỘNG)[\s:]*(\d{1,3}(?:\.\d{3})+)",
            @"(?:TỔNG|TOTAL|SUM|THÀNH TIỀN|THANH TOÁN|PAYMENT|CỘNG|TỔNG CỘNG)[\s:]*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)",
            
            // Amount followed by currency
            @"(\d{1,3}(?:\.\d{3})+)\s*(?:ĐỒNG|dong|VND|đ)",
            
            // Numbers that look like Vietnamese amounts (multiple of 1000)
            @"\b(\d{1,3}(?:\.\d{3}){1,3})\b(?!\.\d)",  // 510.000, 1.234.567 but not 123.45
        };

        // English currency patterns
        var englishPatterns = new[]
        {
            @"(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:USD|\$)",       // 123,456.78 USD
            @"(?:\$|USD)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)",       // $123,456.78
        };

        // Process Vietnamese patterns first (higher priority)
        foreach (var pattern in vietnamesePatterns)
        {
            var matches = Regex.Matches(text, pattern, RegexOptions.IgnoreCase);
            foreach (Match match in matches)
            {
                var amountStr = match.Groups[1].Value;
                _logger.LogInformation("Found Vietnamese pattern match: {AmountStr}", amountStr);

                if (TryParseVietnameseAmount(amountStr, out decimal amount))
                {
                    _logger.LogInformation("Successfully parsed amount: {Amount}", amount);
                    amounts.Add(amount);
                }
            }
        }

        // Process English patterns
        foreach (var pattern in englishPatterns)
        {
            var matches = Regex.Matches(text, pattern, RegexOptions.IgnoreCase);
            foreach (Match match in matches)
            {
                if (TryParseEnglishAmount(match.Groups[1].Value, out decimal amount))
                {
                    amounts.Add(amount);
                }
            }
        }

        // Remove duplicates and filter meaningful amounts
        var distinctAmounts = amounts.Where(a => a >= 1000) // Minimum 1000 VND
                                   .Distinct()
                                   .OrderByDescending(x => x)
                                   .ToList();

        _logger.LogInformation("Final extracted amounts: {Amounts}", string.Join(", ", distinctAmounts));
        return distinctAmounts;
    }

    private decimal? DetermineMainAmount(List<decimal> amounts, string rawText)
    {
        if (!amounts.Any()) return null;

        _logger.LogInformation("Determining main amount from {Count} candidates: {Amounts}",
            amounts.Count, string.Join(", ", amounts));

        // Enhanced keywords for Vietnamese receipts
        var totalKeywords = new[]
        {
            "tổng", "total", "sum", "thành tiền", "thanh toán", "payment",
            "cộng", "tổng cộng", "tong", "thanh toan", "tong cong",
            "amount", "số tiền", "so tien", "tiền", "tien"
        };

        // Score each amount based on context
        var scoredAmounts = amounts.Select(amount => new
        {
            Amount = amount,
            Score = CalculateAmountScore(amount, rawText, totalKeywords)
        }).OrderByDescending(x => x.Score).ThenByDescending(x => x.Amount).ToList();

        _logger.LogInformation("Amount scores: {Scores}",
            string.Join(", ", scoredAmounts.Select(s => $"{s.Amount}:{s.Score}")));

        var selectedAmount = scoredAmounts.First().Amount;
        _logger.LogInformation("Selected main amount: {Amount}", selectedAmount);

        return selectedAmount;
    }

    private int CalculateAmountScore(decimal amount, string rawText, string[] totalKeywords)
    {
        int score = 0;
        var amountStr = amount.ToString("F0");
        var vnAmount = amount.ToString("#,##0", new System.Globalization.CultureInfo("vi-VN")).Replace(",", ".");

        // Higher score for larger amounts (assuming main total is usually the largest)
        if (amount >= 100000) score += 30;      // >= 100k VND
        else if (amount >= 50000) score += 20;  // >= 50k VND  
        else if (amount >= 10000) score += 10;  // >= 10k VND

        // Look for keywords near this amount
        foreach (var k in totalKeywords)
        {
            var idx = rawText.IndexOf(k, StringComparison.OrdinalIgnoreCase);
            if (idx < 0) continue;

            // Check both standard and Vietnamese formatted versions
            var positions = new[] { rawText.IndexOf(amountStr, StringComparison.OrdinalIgnoreCase), rawText.IndexOf(vnAmount, StringComparison.OrdinalIgnoreCase) }.Where(i => i >= 0);
            foreach (var p in positions)
            {
                var d = Math.Abs(p - idx);
                if (d < 50) score += 50;      // Very close to keyword
                else if (d < 100) score += 30; // Close to keyword
                else if (d < 200) score += 10; // Somewhat close
            }
        }

        // Bonus for amounts that appear at the end (likely to be totals)
        var last = new[] { rawText.LastIndexOf(amountStr, StringComparison.OrdinalIgnoreCase), rawText.LastIndexOf(vnAmount, StringComparison.OrdinalIgnoreCase) }.Max();
        if (last >= 0)
        {
            var rel = (double)last / rawText.Length;
            if (rel > 0.8) score += 20;      // In last 20% of text
            else if (rel > 0.6) score += 10; // In last 40% of text
        }

        return score;
    }

    private bool TryParseVietnameseAmount(string input, out decimal result)
    {
        result = 0;

        try
        {
            var cleaned = Regex.Replace(input.Trim(), @"[^\d\.,]", "");

            if (string.IsNullOrEmpty(cleaned))
                return false;

            // Check if this looks like Vietnamese format (dots as thousands separator)
            // Examples: 510.000, 1.234.567, 123.456.789
            var dot = cleaned.Count(c => c == '.');
            var comma = cleaned.Count(c => c == ',');

            if (dot >= 1 && comma == 0 && IsValidVietnameseThousandFormat(cleaned))
            {
                // Likely Vietnamese format: 510.000 -> 510000
                // Check if dots are in correct positions (every 3 digits from right)
                cleaned = cleaned.Replace(".", "");
                _logger.LogDebug("Vietnamese thousands format detected: {Cleaned}", cleaned);
            }
            else if (dot >= 1 && comma == 1 && cleaned.LastIndexOf(',') > cleaned.LastIndexOf('.'))
            {
                // Vietnamese format with decimals: 123.456,78 -> 123456.78
                var commaPos = cleaned.LastIndexOf(',');
                var integerPart = cleaned.Substring(0, commaPos).Replace(".", "");
                var decimalPart = cleaned.Substring(commaPos + 1);
                cleaned = integerPart + "." + decimalPart;
                _logger.LogDebug("Vietnamese decimal format detected: {Cleaned}", cleaned);
            }
            else if (comma >= 1)
            {
                // Could be English format: 123,456.78 -> 123456.78
                if (dot == 1 && cleaned.LastIndexOf('.') > cleaned.LastIndexOf(','))
                {
                    // English format
                    cleaned = cleaned.Replace(",", "");
                }
                else
                {
                    // Treat commas as thousands separators
                    cleaned = cleaned.Replace(",", "");
                }
            }

            var success = decimal.TryParse(cleaned, out result);
            _logger.LogDebug("Parse result: Success={Success}, Value={Result}", success, result);

            return success && result > 0;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse Vietnamese amount: {Input}", input);
            return false;
        }
    }

    private bool IsValidVietnameseThousandFormat(string input)
    {
        // Check if dots are positioned correctly for Vietnamese thousands format
        // Valid: 123.456, 1.234.567, 12.345.678
        // Invalid: 12.34, 1234.5

        var parts = input.Split('.');
        if (parts.Length < 2) return false;

        // First part can be 1-3 digits
        if (parts[0].Length is 0 or > 3) return false;

        // All other parts must be exactly 3 digits
        for (int i = 1; i < parts.Length; i++)
        {
            if (parts[i].Length != 3) return false;
        }

        return true;
    }

    private bool TryParseEnglishAmount(string input, out decimal result)
    {
        result = 0;

        try
        {
            var cleaned = Regex.Replace(input.Trim(), @"[^\d\.,]", "");

            if (string.IsNullOrEmpty(cleaned))
                return false;

            // English format: 123,456.78 -> 123456.78
            // Assume comma is thousands separator, dot is decimal separator
            var lastDot = cleaned.LastIndexOf('.');
            var lastComma = cleaned.LastIndexOf(',');

            if (lastDot > lastComma)
            {
                // Standard English format
                cleaned = cleaned.Replace(",", "");
            }
            else if (lastComma > lastDot)
            {
                // European format: 123.456,78 -> 123456.78
                var commaPos = cleaned.LastIndexOf(',');
                cleaned = cleaned[..commaPos].Replace(".", "") + "." + cleaned[(commaPos + 1)..];
            }
            else
            {
                // No decimal point, just remove separators
                cleaned = cleaned.Replace(",", "").Replace(".", "");
            }

            return decimal.TryParse(cleaned, out result) && result > 0;
        }
        catch
        {
            return false;
        }
    }

    private Pix PreprocessImage(Pix originalImage)
    {
        try
        {
            // Convert to grayscale for better OCR
            var gray = originalImage.ConvertRGBToGray();

            // Scale image if too small (improves OCR accuracy)
            var width = gray.Width;
            var height = gray.Height;

            if (width < 800 || height < 600)
            {
                var scale = Math.Max(800f / width, 600f / height);
                var scaled = gray.Scale(scale, scale);
                gray.Dispose();
                return scaled;
            }

            return gray;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Image preprocessing failed, using original image");
            return originalImage.Clone();
        }
    }
}