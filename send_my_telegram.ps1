<#
.SYNOPSIS
    Mở trực tiếp Telegram cá nhân của Ny với báo cáo đối soát soạn sẵn
#>

$summaryPath = Join-Path $PSScriptRoot "data\datapay_summary.json"
$loss = "13,744,798"
$dc = "99,854,622"
$st = "19,659,253"
$diff = "7,245.60"
$total = "6,384"

if (Test-Path $summaryPath) {
    $sum = Get-Content $summaryPath -Raw | ConvertFrom-Json
    $loss = [string]::Format("{0:N0}", $sum.financial_summary.total_natural_loss_vnd)
    $dc   = [string]::Format("{0:N0}", $sum.financial_summary.total_warehouse_penalty_vnd)
    $st   = [string]::Format("{0:N0}", $sum.financial_summary.total_store_penalty_vnd)
    $diff = [string]::Format("{0:N2}", $sum.total_qty_diff)
    $total= [string]::Format("{0:N0}", $sum.total_records)
}

$now = Get-Date -Format "dd/MM/yyyy HH:mm"

$report = @"
🥦 BAO CAO DOI SOAT KHO RAU ($now)
----------------------------------------
• Tong so dong: $total dong
• Chenh lech: $diff KG/Pack
• Hao hut tu nhien: $loss VND
• Phat Kho Rau (DC): $dc VND
• Phat Sieu Thi (ST): $st VND
----------------------------------------
🌐 Dashboard: https://nguyenbaony.github.io/kho-rau-reconciliation/
"@

$encoded = [System.Uri]::EscapeDataString($report)
$url = "https://t.me/share/url?url=https://nguyenbaony.github.io/kho-rau-reconciliation/&text=$encoded"

Write-Host "Dang mo Telegram ca nhan cua Ny..." -ForegroundColor Cyan
Start-Process $url
Write-Host "Da mo Telegram thanh cong! Ny chi can chon cuoc hoi thoai hoac 'Saved Messages' roi bam Gui nhe!" -ForegroundColor Green
