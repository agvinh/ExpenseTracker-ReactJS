using System.Text.RegularExpressions;
using Tesseract;

namespace ExpenseTracker.Api.Services;

public interface IOcrService
{
    Task<OcrResult> ExtractAmountFromImageAsync(string imagePath);
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
    private readonly ILogger<TesseractOcrService> _logger;

    public TesseractOcrService(ILogger<TesseractOcrService> logger)
    {
        _logger = logger;
    }

    public async Task<OcrResult> ExtractAmountFromImageAsync(string imagePath)
    {
        return await Task.Run(() =>
        {
            try
            {
                // Sử dụng Tesseract.NET để đọc text từ ảnh
                using var engine = new TesseractEngine(@"./tessdata", "eng+vie", EngineMode.Default);
                
                // Configure Tesseract for better number recognition
                engine.SetVariable("tessedit_char_whitelist", "0123456789.,VNDvndđĐdongDONGtổngTỔNGtotalTOTALsumSUMthànhTHÀNHtiềnTIỀNtoánTOÁNpaymentPAYMENTcộngCỘNG ");
                engine.SetVariable("classify_bln_numeric_mode", "1");
                
                using var img = Pix.LoadFromFile(imagePath);
                
                // Preprocess image for better OCR results
                using var processedImg = PreprocessImage(img);
                using var page = engine.Process(processedImg);
            
            var rawText = page.GetText();
            _logger.LogInformation("OCR Raw Text: {RawText}", rawText);

            var result = new OcrResult
            {
                RawText = rawText,
                Success = true
            };

            // Extract possible amounts using regex patterns
            var amounts = ExtractAmountsFromText(rawText);
            result.PossibleAmounts = amounts;

            // Try to determine the most likely total amount
            result.ExtractedAmount = DetermineMainAmount(amounts, rawText);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OCR processing failed for image: {ImagePath}", imagePath);
                return new OcrResult
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        });
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
        var vietnameseAmountStr = amount.ToString("#,##0", new System.Globalization.CultureInfo("vi-VN")).Replace(",", ".");
        
        // Higher score for larger amounts (assuming main total is usually the largest)
        if (amount >= 100000) score += 30;      // >= 100k VND
        else if (amount >= 50000) score += 20;  // >= 50k VND  
        else if (amount >= 10000) score += 10;  // >= 10k VND

        // Look for keywords near this amount
        foreach (var keyword in totalKeywords)
        {
            var keywordIndex = rawText.IndexOf(keyword, StringComparison.OrdinalIgnoreCase);
            if (keywordIndex >= 0)
            {
                // Check both standard and Vietnamese formatted versions
                var amountIndex1 = rawText.IndexOf(amountStr, StringComparison.OrdinalIgnoreCase);
                var amountIndex2 = rawText.IndexOf(vietnameseAmountStr, StringComparison.OrdinalIgnoreCase);
                
                var closestAmountIndex = -1;
                if (amountIndex1 >= 0 && amountIndex2 >= 0)
                {
                    closestAmountIndex = Math.Abs(amountIndex1 - keywordIndex) < Math.Abs(amountIndex2 - keywordIndex) 
                        ? amountIndex1 : amountIndex2;
                }
                else if (amountIndex1 >= 0)
                {
                    closestAmountIndex = amountIndex1;
                }
                else if (amountIndex2 >= 0)
                {
                    closestAmountIndex = amountIndex2;
                }

                if (closestAmountIndex >= 0)
                {
                    var distance = Math.Abs(closestAmountIndex - keywordIndex);
                    if (distance < 50) score += 50;      // Very close to keyword
                    else if (distance < 100) score += 30; // Close to keyword
                    else if (distance < 200) score += 10; // Somewhat close
                }
            }
        }

        // Bonus for amounts that appear at the end (likely to be totals)
        var textLength = rawText.Length;
        var amountPositions = new List<int>();
        
        var pos1 = rawText.LastIndexOf(amountStr, StringComparison.OrdinalIgnoreCase);
        var pos2 = rawText.LastIndexOf(vietnameseAmountStr, StringComparison.OrdinalIgnoreCase);
        
        if (pos1 >= 0) amountPositions.Add(pos1);
        if (pos2 >= 0) amountPositions.Add(pos2);
        
        if (amountPositions.Any())
        {
            var lastPosition = amountPositions.Max();
            var relativePosition = (double)lastPosition / textLength;
            
            if (relativePosition > 0.8) score += 20;      // In last 20% of text
            else if (relativePosition > 0.6) score += 10; // In last 40% of text
        }

        return score;
    }

    private bool TryParseVietnameseAmount(string input, out decimal result)
    {
        result = 0;
        
        try
        {
            var cleaned = input.Trim();
            _logger.LogDebug("Parsing Vietnamese amount: '{Input}' -> '{Cleaned}'", input, cleaned);

            // Remove any non-numeric characters except dots, commas
            cleaned = Regex.Replace(cleaned, @"[^\d\.,]", "");
            
            if (string.IsNullOrEmpty(cleaned))
                return false;

            // Check if this looks like Vietnamese format (dots as thousands separator)
            // Examples: 510.000, 1.234.567, 123.456.789
            var dotCount = cleaned.Count(c => c == '.');
            var commaCount = cleaned.Count(c => c == ',');
            
            if (dotCount >= 1 && commaCount == 0)
            {
                // Likely Vietnamese format: 510.000 -> 510000
                // Check if dots are in correct positions (every 3 digits from right)
                if (IsValidVietnameseThousandFormat(cleaned))
                {
                    cleaned = cleaned.Replace(".", "");
                    _logger.LogDebug("Vietnamese thousands format detected: {Cleaned}", cleaned);
                }
            }
            else if (dotCount >= 1 && commaCount == 1 && cleaned.LastIndexOf(',') > cleaned.LastIndexOf('.'))
            {
                // Vietnamese format with decimals: 123.456,78 -> 123456.78
                var commaPos = cleaned.LastIndexOf(',');
                var integerPart = cleaned.Substring(0, commaPos).Replace(".", "");
                var decimalPart = cleaned.Substring(commaPos + 1);
                cleaned = integerPart + "." + decimalPart;
                _logger.LogDebug("Vietnamese decimal format detected: {Cleaned}", cleaned);
            }
            else if (commaCount >= 1 && dotCount <= 1)
            {
                // Could be English format: 123,456.78 -> 123456.78
                if (dotCount == 1 && cleaned.LastIndexOf('.') > cleaned.LastIndexOf(','))
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
        if (parts[0].Length == 0 || parts[0].Length > 3) return false;
        
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
            var cleaned = input.Trim();
            
            // Remove currency symbols
            cleaned = Regex.Replace(cleaned, @"[^\d\.,]", "");
            
            if (string.IsNullOrEmpty(cleaned))
                return false;
            
            // English format: 123,456.78 -> 123456.78
            // Assume comma is thousands separator, dot is decimal separator
            var lastDotIndex = cleaned.LastIndexOf('.');
            var lastCommaIndex = cleaned.LastIndexOf(',');
            
            if (lastDotIndex > lastCommaIndex)
            {
                // Standard English format
                cleaned = cleaned.Replace(",", "");
            }
            else if (lastCommaIndex > lastDotIndex)
            {
                // European format: 123.456,78 -> 123456.78
                var commaPos = cleaned.LastIndexOf(',');
                var integerPart = cleaned.Substring(0, commaPos).Replace(".", "");
                var decimalPart = cleaned.Substring(commaPos + 1);
                cleaned = integerPart + "." + decimalPart;
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
            var grayscale = originalImage.ConvertRGBToGray();
            
            // Scale image if too small (improves OCR accuracy)
            var width = grayscale.Width;
            var height = grayscale.Height;
            
            if (width < 800 || height < 600)
            {
                var scaleFactor = Math.Max(800.0f / width, 600.0f / height);
                var scaledImage = grayscale.Scale(scaleFactor, scaleFactor);
                grayscale.Dispose();
                return scaledImage;
            }
            
            return grayscale;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Image preprocessing failed, using original image");
            return originalImage.Clone();
        }
    }
}