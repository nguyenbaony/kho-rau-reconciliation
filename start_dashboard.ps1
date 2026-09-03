<#
.SYNOPSIS
    Khởi chạy Web Dashboard Đối Soát Kho Rau & Datapay
#>

param (
    [int]$Port = 8085
)

$webRoot = Join-Path $PSScriptRoot "web"
$url = "http://localhost:$Port/"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   KHO RAU RECONCILIATION & DATAPAY DASHBOARD    " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Web Root: $webRoot"
Write-Host "Opening Dashboard at: $url" -ForegroundColor Yellow

# Mở trình duyệt mặc định
Start-Process "file:///$($webRoot.Replace('\', '/'))/index.html"

Write-Host "Dashboard đã được mở trực tiếp trên trình duyệt!" -ForegroundColor Green
Write-Host "Để cập nhật dữ liệu mới nhất từ Google Sheets, chạy:" -ForegroundColor Cyan
Write-Host "  .\ReconciliationEngine.ps1 -ForceRefresh" -ForegroundColor White
Write-Host "Để tự động push code lên GitHub, chạy:" -ForegroundColor Cyan
Write-Host "  .\auto_push.ps1 -RemoteUrl <link-github-cua-ban>" -ForegroundColor White
