# Copy app.js to web
Copy-Item "app.js" "web\app.js" -Force
Copy-Item "index.html" "web\index.html" -Force

# Create media/telegram in root and copy all photos
$rootMedia = "media\telegram"
if (-not (Test-Path $rootMedia)) {
    New-Item -ItemType Directory -Path $rootMedia -Force | Out-Null
}
Copy-Item "web\media\telegram\*" $rootMedia -Force

$count = (Get-ChildItem $rootMedia).Count
Write-Host "Root media photo count: $count"

# Sync to Desktop
$name = [char]0x0110 + [char]0x1ED0 + "I SO" + [char]0x00C1 + "T KHO RAU"
$desktop = [System.IO.Path]::Combine("C:\Users\longa\Desktop", $name)
Copy-Item "app.js" $desktop -Force
Copy-Item "index.html" $desktop -Force

Write-Host "Pushing fix to GitHub..."
& powershell -ExecutionPolicy Bypass -File C:\Users\longa\.gemini\antigravity-ide\scratch\kho-rau-reconciliation\auto_push.ps1 -CommitMessage "Fix escapeHtml bug and sync root media folder for GitHub Pages"
