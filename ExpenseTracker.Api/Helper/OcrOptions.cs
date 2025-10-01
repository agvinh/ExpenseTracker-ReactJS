public class OcrOptions
{
    public string TessdataPath { get; set; } = "tessdata";
    public string Languages { get; set; } = "eng+vie";
    /// <summary>
    /// S? l�?ng t?i �a TesseractEngine ��?c gi? trong pool (m?i engine n?ng v� kh�ng thread-safe).
    /// </summary>
    public int MaxEngines { get; set; } = 2;
    /// <summary>
    /// Th?i gian t?i �a (ms) �?i l?y engine t? pool tr�?c khi timeout. M?c �?nh 5000ms.
    /// </summary>
    public int RentTimeoutMs { get; set; } = 5000;
    /// <summary>
    /// B?t ti?n x? l? ?nh n�ng cao b?ng ImageMagick (deskew, contrast, threshold...).
    /// </summary>
    public bool EnableImageMagickPreprocessing { get; set; } = true;
}