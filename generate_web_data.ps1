$projectDir = $PSScriptRoot
$recordsPath = "$projectDir\data\reconciliation_records.json"
$summaryPath = "$projectDir\data\datapay_summary.json"
$outJsPath1  = "$projectDir\data\reconciliation_data.js"
$outJsPath2  = "$projectDir\web\data\reconciliation_data.js"

if (-not (Test-Path $recordsPath) -or -not (Test-Path $summaryPath)) {
    Write-Error "JSON data files not found in $projectDir\data"
    exit 1
}

$recordsJson = [System.IO.File]::ReadAllText($recordsPath, [System.Text.Encoding]::UTF8)
$summaryJson = [System.IO.File]::ReadAllText($summaryPath, [System.Text.Encoding]::UTF8)

$jsContent = @"
window.RECON_SUMMARY = $summaryJson;
window.RECON_RECORDS = $recordsJson;
"@

[System.IO.File]::WriteAllText($outJsPath1, $jsContent, [System.Text.Encoding]::UTF8)
if (-not (Test-Path "$projectDir\web\data")) {
    New-Item -ItemType Directory -Path "$projectDir\web\data" -Force | Out-Null
}
[System.IO.File]::WriteAllText($outJsPath2, $jsContent, [System.Text.Encoding]::UTF8)
Write-Host "Generated $outJsPath1 and $outJsPath2 successfully!" -ForegroundColor Green
