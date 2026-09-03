$recordsPath = "C:\Users\longa\.gemini\antigravity-ide\scratch\kho-rau-reconciliation\data\reconciliation_records.json"
$summaryPath = "C:\Users\longa\.gemini\antigravity-ide\scratch\kho-rau-reconciliation\data\datapay_summary.json"
$outJsPath   = "C:\Users\longa\.gemini\antigravity-ide\scratch\kho-rau-reconciliation\web\data\reconciliation_data.js"

$recordsJson = [System.IO.File]::ReadAllText($recordsPath)
$summaryJson = [System.IO.File]::ReadAllText($summaryPath)

$jsContent = @"
window.RECON_SUMMARY = $summaryJson;
window.RECON_RECORDS = $recordsJson;
"@

[System.IO.File]::WriteAllText($outJsPath, $jsContent, [System.Text.Encoding]::UTF8)
Write-Host "Generated $outJsPath successfully!" -ForegroundColor Green
