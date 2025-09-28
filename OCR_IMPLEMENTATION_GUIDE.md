# 🔍 OCR Implementation Guide - Trích xuất số tiền từ hóa đơn

## 📋 Tổng quan
Tính năng này cho phép tự động trích xuất số tiền từ hình ảnh hóa đơn khi upload, sử dụng công nghệ OCR (Optical Character Recognition).

## 🏗️ Kiến trúc hệ thống

### Backend (ExpenseTracker.Api)
```
Services/
├── IOcrService.cs          # Interface cho OCR service
├── TesseractOcrService.cs  # Implementation sử dụng Tesseract
├── OcrResult.cs           # Model cho kết quả OCR

Controllers/
├── ExpensesController.cs   # Thêm endpoint /extract-amount

Dtos/
├── OcrResultDto.cs        # DTO cho API response
```

### Frontend (expense-tracker-frontend)
```
services/
├── ocrService.js          # API calls cho OCR

pages/
├── AddExpense.jsx         # Tích hợp OCR khi thêm expense
├── EditExpense.jsx        # Tích hợp OCR khi sửa expense
```

## 🔧 Các bước Implementation

### Bước 1: Chuẩn bị Tesseract Data Files

1. **Download language data files**:
   - Truy cập: https://github.com/tesseract-ocr/tessdata
   - Download `eng.traineddata` (tiếng Anh)
   - Download `vie.traineddata` (tiếng Việt) - Optional
   - Đặt vào thư mục `ExpenseTracker.Api/tessdata/`

2. **Cấu trúc thư mục**:
```
ExpenseTracker.Api/
├── tessdata/
│   ├── eng.traineddata
│   └── vie.traineddata
├── Services/
│   └── OcrService.cs
└── Program.cs
```

### Bước 2: Test OCR Service

1. **Khởi động API server**:
```bash
cd ExpenseTracker.Api
dotnet run --launch-profile https
```

2. **Test endpoint**:
   - URL: `POST https://localhost:7162/api/expenses/extract-amount`
   - Method: POST
   - Content-Type: multipart/form-data
   - Body: file (image của hóa đơn)

### Bước 3: Frontend Integration

1. **Khởi động frontend**:
```bash
cd expense-tracker-frontend
npm run dev
```

2. **Test workflow**:
   - Vào trang Add Expense
   - Upload một hình ảnh hóa đơn
   - Hệ thống sẽ tự động trích xuất số tiền và điền vào field Amount

## 🧠 Thuật toán OCR

### Pattern Recognition
OCR service sử dụng các regex patterns để nhận dạng:

1. **Vietnamese Currency Patterns**:
   - `123.456,78 VND`
   - `123.456 đ`
   - `TỔNG: 123.456`

2. **English Currency Patterns**:
   - `$123,456.78`
   - `123,456.78 USD`
   - `TOTAL: 123,456`

3. **Smart Detection**:
   - Tìm keywords: "tổng", "total", "thành tiền"
   - Ưu tiên số tiền gần keywords này
   - Lọc ra số tiền lớn nhất nếu không có keyword

### Amount Processing
```csharp
// Vietnamese: 123.456,78 -> 123456.78
cleaned = input.Replace(".", "").Replace(",", ".");

// English: 123,456.78 -> 123456.78  
cleaned = input.Replace(",", "");
```

## 🎯 Tính năng chính

### 1. Auto-Detection
- Tự động trích xuất khi upload ảnh
- Hiển thị kết quả ngay lập tức
- Auto-fill vào Amount field

### 2. Multiple Amounts Handling
- Hiển thị tất cả số tiền tìm thấy
- Cho phép user chọn số tiền đúng
- Smart ranking theo keywords

### 3. Error Handling
- Graceful fallback khi OCR thất bại
- Clear error messages
- Manual input option

### 4. Multi-language Support
- Hỗ trợ tiếng Việt và tiếng Anh
- Format currency theo locale
- Localized error messages

## 🚀 Nâng cấp trong tương lai

### 1. Cloud OCR Services
```csharp
// Azure Computer Vision
public class AzureOcrService : IOcrService
{
    public async Task<OcrResult> ExtractAmountFromImageAsync(string imagePath)
    {
        // Sử dụng Azure Computer Vision API
        // Độ chính xác cao hơn Tesseract
        // Hỗ trợ nhiều ngôn ngữ
    }
}

// Google Cloud Vision
public class GoogleOcrService : IOcrService
{
    // Implementation với Google Cloud Vision API
}
```

### 2. Machine Learning Enhancement
```csharp
// Tích hợp TensorFlow.NET
public class MLOcrService : IOcrService
{
    // Custom model training cho hóa đơn Việt Nam
    // Nhận dạng layout hóa đơn
    // Extract thêm thông tin: ngày, vendor, items
}
```

### 3. Advanced Features
- **Receipt categorization**: Tự động phân loại loại hóa đơn
- **Vendor detection**: Nhận dạng tên cửa hàng/nhà cung cấp  
- **Item extraction**: Trích xuất danh sách sản phẩm
- **Date extraction**: Tự động điền ngày từ hóa đơn
- **Confidence scoring**: Hiển thị độ tin cậy của kết quả

## 📊 Performance Optimization

### 1. Image Preprocessing
```csharp
// Cải thiện chất lượng ảnh trước OCR
private Bitmap PreprocessImage(string imagePath)
{
    var bitmap = new Bitmap(imagePath);
    
    // Resize để tăng tốc xử lý
    bitmap = ResizeImage(bitmap, maxWidth: 1000);
    
    // Tăng contrast
    bitmap = AdjustContrast(bitmap, contrast: 1.2f);
    
    // Convert to grayscale
    bitmap = ConvertToGrayscale(bitmap);
    
    return bitmap;
}
```

### 2. Caching Strategy
```csharp
// Cache kết quả OCR
public class CachedOcrService : IOcrService
{
    private readonly IMemoryCache _cache;
    private readonly IOcrService _ocrService;
    
    public async Task<OcrResult> ExtractAmountFromImageAsync(string imagePath)
    {
        var fileHash = CalculateFileHash(imagePath);
        
        if (_cache.TryGetValue(fileHash, out OcrResult cachedResult))
        {
            return cachedResult;
        }
        
        var result = await _ocrService.ExtractAmountFromImageAsync(imagePath);
        _cache.Set(fileHash, result, TimeSpan.FromHours(24));
        
        return result;
    }
}
```

## 🔒 Security Considerations

1. **File Validation**:
   - Kiểm tra file type và size
   - Scan malware trước khi xử lý
   - Sandbox execution

2. **Resource Limits**:
   - Giới hạn số lượng requests/minute
   - Timeout cho OCR processing
   - Memory usage monitoring

3. **Data Privacy**:
   - Xóa temporary files sau xử lý
   - Không log sensitive information
   - Encrypt uploaded images

## 📈 Monitoring & Analytics

```csharp
// Metrics tracking
public class InstrumentedOcrService : IOcrService
{
    private readonly ILogger _logger;
    private readonly IMetrics _metrics;
    
    public async Task<OcrResult> ExtractAmountFromImageAsync(string imagePath)
    {
        using var activity = Activity.StartActivity("OCR.ExtractAmount");
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            var result = await _baseService.ExtractAmountFromImageAsync(imagePath);
            
            _metrics.Counter("ocr.requests")
                   .WithTag("status", result.Success ? "success" : "failed")
                   .Increment();
                   
            _metrics.Histogram("ocr.duration")
                   .Record(stopwatch.ElapsedMilliseconds);
                   
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OCR processing failed");
            _metrics.Counter("ocr.errors").Increment();
            throw;
        }
    }
}
```

## 🎓 Learning Resources

1. **Tesseract Documentation**: https://tesseract-ocr.github.io/
2. **OCR Best Practices**: https://github.com/tesseract-ocr/tesseract/wiki
3. **Image Preprocessing**: https://docs.opencv.org/
4. **Azure Computer Vision**: https://docs.microsoft.com/en-us/azure/cognitive-services/computer-vision/
5. **Google Cloud Vision**: https://cloud.google.com/vision/docs

Chúc bạn implementation thành công! 🚀