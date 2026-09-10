$ErrorActionPreference = "Stop"

$taskName = "KhoRau_Reconciliation_Daily7AM"
$scriptPath = Join-Path $PSScriptRoot "daily_7am_job.ps1"

if (-not (Test-Path $scriptPath)) {
    Write-Error "Khong tim thay file $scriptPath"
    exit 1
}

Write-Host "Dang dang ky lich trinh tu dong vao Windows Task Scheduler..." -ForegroundColor Cyan
Write-Host "Ten tac vu: $taskName"
Write-Host "Thoi gian chay: 07:00 AM hang ngay (co che tu chay bu neu may bat muon hon)"

# 1. Action
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`"" -WorkingDirectory $PSScriptRoot

# 2. Trigger: 7:00 AM daily
$trigger = New-ScheduledTaskTrigger -Daily -At "07:00"

# 3. Settings: chạy ngầm, pin laptop, tự chạy bù nếu lỡ giờ
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 20)

# Unregister if exists
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# Register
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Tu dong dong bo so lieu doi soat Kho Rau, tinh Datapay va gui bao cao vao Telegram moi ngay luc 07:00 AM"

Write-Host "`n*** DA DANG KY THANH CONG LICH TRINH 07:00 AM HANG NGAY! ***" -ForegroundColor Green

