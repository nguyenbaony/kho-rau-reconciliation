<#
.SYNOPSIS
    Tác vụ chạy tự động lúc 07:00 AM mỗi ngày để đồng bộ số liệu và gửi báo cáo Datapay vào Telegram của Ny
#>

$ErrorActionPreference = "Continue"
$projectDir = $PSScriptRoot
Set-Location $projectDir

$logDir = Join-Path $projectDir "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$today = Get-Date -Format "yyyy-MM-dd"
$logFile = Join-Path $logDir "daily_job_$today.log"

function Log-Message([string]$text) {
    $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$time] $text"
    Write-Host $line
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

Log-Message "=== BẮT ĐẦU TÁC VỤ ĐỐI SOÁT & DATAPAY TỰ ĐỘNG 7:00 AM ==="

# 1. Cập nhật dữ liệu mới nhất từ Google Sheets
Log-Message "BƯỚC 1: Đang tải dữ liệu và bóc tách từ Google Sheets..."
try {
    powershell -ExecutionPolicy Bypass -File .\ReconciliationEngine.ps1 -ForceRefresh
    powershell -ExecutionPolicy Bypass -File .\generate_web_data.ps1
    Log-Message "BƯỚC 1: Hoàn thành bóc tách dữ liệu thành công."
} catch {
    Log-Message "BƯỚC 1: Lỗi khi xử lý số liệu: $_"
}

# 2. Gửi tin nhắn báo cáo vào Telegram của Ny (Saved Messages)
Log-Message "BƯỚC 2: Đang gửi báo cáo vào Telegram Saved Messages của Ny..."
$pythonExe = "$env:LOCALAPPDATA\PythonEmbed\python.exe"
if (Test-Path $pythonExe) {
    try {
        $out = & $pythonExe "$projectDir\send_report_session.py" "me" 2>&1
        Log-Message "BƯỚC 2: Kết quả gửi Telegram: $out"
    } catch {
        Log-Message "BƯỚC 2: Lỗi khi gửi Telegram qua Python: $_"
    }
} else {
    Log-Message "BƯỚC 2: Không tìm thấy Python tại $pythonExe"
}

# 3. Tự động đồng bộ commit lên GitHub (nếu có Git)
Log-Message "BƯỚC 3: Đang đồng bộ lên GitHub Pages..."
try {
    powershell -ExecutionPolicy Bypass -File .\auto_push.ps1 -CommitMessage "Auto Daily 7AM Sync $today"
    Log-Message "BƯỚC 3: Hoàn tất tiến trình Git."
} catch {
    Log-Message "BƯỚC 3: Bỏ qua Git push."
}

Log-Message "=== TÁC VỤ 7:00 AM HOÀN TẤT THÀNH CÔNG ==="
