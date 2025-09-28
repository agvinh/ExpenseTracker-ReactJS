# Download Tesseract Language Data Files

Write-Host "Downloading Tesseract language data files..." -ForegroundColor Green

$tessDataPath = "d:\Git\Studying\LearningReactJS\ExpenseTracker.Api\tessdata"

# Ensure directory exists
if (!(Test-Path $tessDataPath)) {
    New-Item -ItemType Directory -Path $tessDataPath -Force
}

# Download English language data
$engUrl = "https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata"
$engPath = Join-Path $tessDataPath "eng.traineddata"

Write-Host "Downloading English language data..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $engUrl -OutFile $engPath -UseBasicParsing
    Write-Host "✓ Downloaded eng.traineddata" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to download eng.traineddata: $($_.Exception.Message)" -ForegroundColor Red
}

# Download Vietnamese language data  
$vieUrl = "https://github.com/tesseract-ocr/tessdata/raw/main/vie.traineddata"
$viePath = Join-Path $tessDataPath "vie.traineddata"

Write-Host "Downloading Vietnamese language data..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $vieUrl -OutFile $viePath -UseBasicParsing
    Write-Host "✓ Downloaded vie.traineddata" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to download vie.traineddata: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Tessdata download completed!" -ForegroundColor Green
Write-Host "Files in tessdata folder:" -ForegroundColor Cyan
Get-ChildItem $tessDataPath | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor White }