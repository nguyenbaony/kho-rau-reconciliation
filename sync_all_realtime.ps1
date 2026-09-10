param (
    [switch]$Stream1Only,
    [switch]$Stream2Only,
    [switch]$AutoPush
)

$ErrorActionPreference = "Continue"
$projectDir = $PSScriptRoot
Set-Location $projectDir

$pythonExe = "$env:LOCALAPPDATA\PythonEmbed\python.exe"
$gitExe = "$env:LOCALAPPDATA\MinGit\cmd\git.exe"

$timeStr = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  KRC DUAL PIPELINE ENGINE - DONG BO DU LIEU REALTIME     " -ForegroundColor Cyan
Write-Host "  Thoi diem: $timeStr                                     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Chay Luong 1 (Google Sheets) neu khong chi dinh chi chay Luong 2
if (-not $Stream2Only) {
    Write-Host "`n[LUONG 1] Dang dong bo tu Google Sheets (Timeline & Ty le loi)..." -ForegroundColor Yellow
    try {
        & $pythonExe "$projectDir\fetch_stream1_data.py"
        Write-Host "  -> Luong 1 hoan tat thanh cong!" -ForegroundColor Green
    } catch {
        Write-Host "  -> Loi khi chay Luong 1: $_" -ForegroundColor Red
    }
}

# 2. Chay Luong 2 (StarRocks CDC) neu khong chi dinh chi chay Luong 1
if (-not $Stream1Only) {
    Write-Host "`n[LUONG 2] Dang ket noi StarRocks CDC (345 SKU KRC & Gia von)..." -ForegroundColor Yellow
    try {
        & $pythonExe "$projectDir\fetch_stream2_cdc.py"
        Write-Host "  -> Luong 2 hoan tat thanh cong!" -ForegroundColor Green
    } catch {
        Write-Host "  -> Loi khi chay Luong 2: $_" -ForegroundColor Red
    }
}

# 3. Tai tao Data Bundle cho Luong 1 & Luong 2
Write-Host "`n[BUNDLE] Dang tai tao data_bundle.js..." -ForegroundColor Yellow
try {
    & $pythonExe "$projectDir\build_data_bundle.py"
    Write-Host "  -> Bundle Luong 1 & 2 hoan tat!" -ForegroundColor Green
} catch {
    Write-Host "  -> Loi tao bundle: $_" -ForegroundColor Red
}

# 3b. Tai tao Data Bundle cho Luong 3 (Datapay & TO/PT)
Write-Host "`n[BUNDLE] Dang toi uu hoa du lieu Luong 3 (reconciliation_data.js)..." -ForegroundColor Yellow
try {
    & $pythonExe "$projectDir\minify_recon_data.py"
    Write-Host "  -> Bundle Luong 3 hoan tat!" -ForegroundColor Green
} catch {
    Write-Host "  -> Loi tao bundle Luong 3: $_" -ForegroundColor Red
}

# 4. Day code len GitHub neu duoc yeu cau
if ($AutoPush) {
    Write-Host "`n[GIT] Dang day du lieu realtime len GitHub (nguyenbaony/kho-rau-reconciliation)..." -ForegroundColor Magenta
    if (Test-Path $gitExe) {
        & $gitExe add .
        $commitMsg = "sync(realtime): Cap nhat du lieu KRC Dual Pipeline $timeStr"
        & $gitExe commit -m $commitMsg
        & $gitExe push origin main
        Write-Host "  -> Push GitHub thanh cong!" -ForegroundColor Green
    } else {
        Write-Host "  -> Khong tim thay Git tai $gitExe" -ForegroundColor Red
    }
}

Write-Host "`n[DONE] Hoan thanh chu trinh dong bo realtime KRC!" -ForegroundColor Cyan
