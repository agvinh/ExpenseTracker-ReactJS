public class OcrOptions
{
    public string TessdataPath { get; set; } = "tessdata";
    public string Languages { get; set; } = "eng+vie";
    /// <summary>
    /// S? lý?ng t?i ða TesseractEngine ðý?c gi? trong pool (m?i engine n?ng và không thread-safe).
    /// </summary>
    public int MaxEngines { get; set; } = 2;
    /// <summary>
    /// Th?i gian t?i ða (ms) ð?i l?y engine t? pool trý?c khi timeout. M?c ð?nh 5000ms.
    /// </summary>
    public int RentTimeoutMs { get; set; } = 5000;
    /// <summary>
    /// B?t ti?n x? l? ?nh nâng cao b?ng ImageMagick (deskew, contrast, threshold...).
    /// </summary>
    public bool EnableImageMagickPreprocessing { get; set; } = true;
}