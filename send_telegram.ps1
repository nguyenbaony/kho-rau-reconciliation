<#
.SYNOPSIS
    Script gửi thông báo đối soát và Datapay qua Telegram.
.DESCRIPTION
    Tích hợp Telegram Bot API để tự động gửi báo cáo, số liệu Datapay, 
    và các cảnh báo chênh lệch hàng hóa trực tiếp vào Telegram của Ny.
#>

param (
    [string]$BotToken = "",
    [string]$ChatId = "",
    [string]$Message = ""
)

$configFile = Join-Path $PSScriptRoot "config.json"
$config = Get-Content $configFile -Raw | ConvertFrom-Json

if ([string]::IsNullOrWhiteSpace($BotToken) -and $config.telegram -and $config.telegram.bot_token) {
    $BotToken = $config.telegram.bot_token
}
if ([string]::IsNullOrWhiteSpace($ChatId) -and $config.telegram -and $config.telegram.chat_id) {
    $ChatId = $config.telegram.chat_id
}

function Send-TelegramAlert {
    param (
        [string]$token,
        [string]$chat,
        [string]$text
    )

    if ([string]::IsNullOrWhiteSpace($token) -or [string]::IsNullOrWhiteSpace($chat)) {
        Write-Warning "Chưa có BotToken hoặc ChatId. Hãy cấu hình trong config.json hoặc truyền tham số."
        return $false
    }

    $uri = "https://api.telegram.org/bot$token/sendMessage"
    $body = @{
        chat_id    = $chat
        text       = $text
        parse_mode = "HTML"
    } | ConvertTo-Json

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $res = Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType "application/json; charset=utf-8"
        if ($res.ok) {
            Write-Host "Gửi tin nhắn Telegram thành công!" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Error "Lỗi khi gửi Telegram: $_"
        return $false
    }
}

# Nếu có tin nhắn truyền vào, gửi ngay
if ($Message -ne "") {
    Send-TelegramAlert -token $BotToken -chat $ChatId -text $Message
} else {
    # Mẫu tin nhắn đối soát báo cáo Datapay
    $summaryFile = Join-Path $PSScriptRoot "data\datapay_summary.json"
    if (Test-Path $summaryFile) {
        $summary = Get-Content $summaryFile -Raw | ConvertFrom-Json
        $now = Get-Date -Format "dd/MM/yyyy HH:mm:ss"
        
        $msg = @"
🥦 <b>BÁO CÁO ĐỐI SOÁT KHO RAU - THÁNG 09.2026</b>
⏰ <i>Thời gian cập nhật: $now</i>
━━━━━━━━━━━━━━━━━━━
📦 <b>Tổng số dòng đối soát:</b> {0:N0}
⚖️ <b>Tổng lượng chênh lệch:</b> {1:N2} KG/Pack

💰 <b>TỔNG HỢP DATAPAY:</b>
• 📉 <b>Hao hụt tự nhiên:</b> {2:N0} đ
• 🏭 <b>Phạt Kho Rau (DC):</b> {3:N0} đ
• 🏪 <b>Phạt Siêu Thị (ST):</b> {4:N0} đ
• ❓ <b>Chưa xác định:</b> {5:N0} đ
━━━━━━━━━━━━━━━━━━━
🌐 <b>Xem Dashboard:</b> https://nguyenbaony.github.io/kho-rau-reconciliation/
"@ -f $summary.total_records, $summary.total_qty_diff, $summary.financial_summary.total_natural_loss_vnd, $summary.financial_summary.total_warehouse_penalty_vnd, $summary.financial_summary.total_store_penalty_vnd, $summary.financial_summary.total_undetermined_vnd

        Write-Host "Mẫu tin nhắn sẵn sàng gửi qua Telegram:" -ForegroundColor Cyan
        Write-Host $msg
        
        if ($BotToken -ne "" -and $ChatId -ne "") {
            Send-TelegramAlert -token $BotToken -chat $ChatId -text $msg
        } else {
            Write-Host "`nĐể kích hoạt gửi tự động, chỉ cần thêm bot_token và chat_id vào config.json!" -ForegroundColor Yellow
        }
    }
}
