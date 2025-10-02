public class OcrOptions
{
    public string TessdataPath { get; set; } = "tessdata";
    public string Languages { get; set; } = "eng+vie";
    /// <summary>
    /// Maximum number of TesseractEngine instances kept in the pool (each engine is heavy and not thread-safe).
    /// </summary>
    public int MaxEngines { get; set; } = 2;
    /// <summary>
    /// Maximum time (ms) to wait for getting an engine from the pool before timeout. Default is 5000ms.
    /// </summary>
    public int RentTimeoutMs { get; set; } = 5000;
    /// <summary>
    /// Enable advanced image preprocessing with ImageMagick (deskew, contrast, threshold, etc.).
    /// </summary>
    public bool EnableImageMagickPreprocessing { get; set; } = true;
}