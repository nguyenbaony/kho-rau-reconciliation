$feedJson = [System.IO.File]::ReadAllText("$PSScriptRoot\data\telegram_feed.json", [System.Text.Encoding]::UTF8)
$bundleText = [System.IO.File]::ReadAllText("$PSScriptRoot\data\data_bundle.js", [System.Text.Encoding]::UTF8)

# Check if window.TELEGRAM_FEED already exists in bundle
if ($bundleText -match "window\.TELEGRAM_FEED\s*=") {
    $bundleText = $bundleText -replace "(?s)window\.TELEGRAM_FEED\s*=.*", ""
}

$newBundle = $bundleText.TrimEnd() + "`n`nwindow.TELEGRAM_FEED = " + $feedJson.Trim() + ";`n"

[System.IO.File]::WriteAllText("$PSScriptRoot\data\data_bundle.js", $newBundle, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText("$PSScriptRoot\web\data\data_bundle.js", $newBundle, [System.Text.Encoding]::UTF8)

Write-Host "Updated data_bundle.js with window.TELEGRAM_FEED successfully!" -ForegroundColor Green
