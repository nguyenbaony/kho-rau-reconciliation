$ErrorActionPreference = "Stop"

$taskName = "KhoRau_Reconciliation_Daily7AM"
$scriptPath = Join-Path $PSScriptRoot "daily_7am_job.ps1"

if (-not (Test-Path $scriptPath)) {
    Write-Error "Khong tim thay file $scriptPath"
    exit 1
}

$taskRun = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""

Write-Host "Dang dang ky lich trinh tu dong vao Windows Task Scheduler..." -ForegroundColor Cyan
Write-Host "Ten tac vu: $taskName"
Write-Host "Thoi gian chay: 07:00 AM moi ngay"

schtasks /Create /SC DAILY /TN $taskName /TR $taskRun /ST 07:00 /F

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n*** DA DANG KY THANH CONG LICH TRINH 7:00 AM HANG NGAY! ***" -ForegroundColor Green
} else {
    Write-Host "`n*** Dang ky that bai. Vui long kiem tra quyen. ***" -ForegroundColor Red
}
