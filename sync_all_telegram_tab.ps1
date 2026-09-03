# Sync web folder
Copy-Item "index.html" "web\index.html" -Force
Copy-Item "app.js" "web\app.js" -Force
Copy-Item "style.css" "web\style.css" -Force

$webData = "web\data"
if (-not (Test-Path $webData)) { New-Item -ItemType Directory -Path $webData -Force | Out-Null }
Copy-Item "data\*" $webData -Force

$name = [char]0x0110 + [char]0x1ED0 + "I SO" + [char]0x00C1 + "T KHO RAU"
$desktop = [System.IO.Path]::Combine("C:\Users\longa\Desktop", $name)
$scratch = [System.IO.Path]::Combine("C:\Users\longa\.gemini\antigravity-ide\scratch", $name)

$targets = @($desktop, $scratch)
foreach ($t in $targets) {
    if (-not (Test-Path $t)) { New-Item -ItemType Directory -Path $t -Force | Out-Null }
    Copy-Item "index.html" $t -Force
    Copy-Item "app.js" $t -Force
    Copy-Item "style.css" $t -Force
    Copy-Item "Chay_Telegram_Realtime.bat" $t -Force
    Copy-Item "telegram_realtime_sync.py" $t -Force
    Copy-Item "ny_personal_session.session" $t -Force
    
    $destMedia = Join-Path $t "web\media\telegram"
    if (-not (Test-Path $destMedia)) { New-Item -ItemType Directory -Path $destMedia -Force | Out-Null }
    Copy-Item "web\media\telegram\*" $destMedia -Force

    $destData = Join-Path $t "data"
    if (-not (Test-Path $destData)) { New-Item -ItemType Directory -Path $destData -Force | Out-Null }
    Copy-Item "data\*" $destData -Force
}

Write-Host "Synchronized all files, photos and scripts successfully!" -ForegroundColor Green
