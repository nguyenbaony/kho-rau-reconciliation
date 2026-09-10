param (
    [string]$Target = "me"
)

$ErrorActionPreference = "Continue"
$projectDir = "C:\Users\longa\.gemini\antigravity-ide\scratch\kho-rau-reconciliation"
Set-Location $projectDir

$logDir = Join-Path $projectDir "logs"
if (-not (Test-Path $logDir)) { 
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null 
}
$today = Get-Date -Format "yyyy-MM-dd"
$logFile = Join-Path $logDir "daily_job_$today.log"

function Log-Message([string]$text) {
    $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$time] $text"
    Write-Host $line
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

Log-Message "=== BAT DAU TAC VU DOI SOAT & DATAPAY TU DONG ==="

# 1. Cap nhat du lieu moi nhat tu Google Sheets
Log-Message "BUOC 1: Dang tai du lieu va boc tach tu Google Sheets..."
try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$projectDir\ReconciliationEngine.ps1" -ForceRefresh
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$projectDir\generate_web_data.ps1"
    Log-Message "BUOC 1: Hoan thanh boc tach du lieu thanh cong."
} catch {
    Log-Message "BUOC 1: Loi khi xu ly so lieu: $_"
}

# 2. Gui tin nhan bao cao vao Telegram (Saved Messages hoac target chi dinh)
Log-Message "BUOC 2: Dang gui bao cao vao Telegram ($Target)..."
$pythonExe = "$env:LOCALAPPDATA\PythonEmbed\python.exe"
if (Test-Path $pythonExe) {
    try {
        $out = & $pythonExe "$projectDir\send_report_session.py" "$Target" 2>&1
        Log-Message "BUOC 2: Ket qua gui Telegram: $out"
    } catch {
        Log-Message "BUOC 2: Loi khi gui Telegram qua Python: $_"
    }
} else {
    Log-Message "BUOC 2: Khong tim thay Python tai $pythonExe"
}

# 3. Dong bo du lieu sang thu muc Desktop (neu co)
try {
    $desktopPath = [Environment]::GetFolderPath('Desktop')
    $desktopFolder = Get-ChildItem -Path $desktopPath -Directory | Where-Object { $_.Name -like "*KHO RAU*" } | Select-Object -First 1
    if ($desktopFolder) {
        $desktopData = Join-Path $desktopFolder.FullName "data"
        $desktopWebData = Join-Path $desktopFolder.FullName "web\data"
        if (Test-Path $desktopData) { 
            Copy-Item "$projectDir\data\*" $desktopData -Force -Recurse 
        }
        if (Test-Path $desktopWebData) { 
            Copy-Item "$projectDir\web\data\*" $desktopWebData -Force -Recurse 
        }
        Log-Message "BUOC 3: Da dong bo so lieu moi sang Desktop."
    }
} catch {
    Log-Message "BUOC 3: Loi dong bo Desktop: $_"
}

Log-Message "=== TAC VU DOI SOAT HOAN TAT THANH CONG ==="
