param (
    [string]$SourceCsvPath = "",
    [string]$OutputDir = "$PSScriptRoot\data",
    [switch]$ForceRefresh
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$configFile = "$PSScriptRoot\config.json"
$config = Get-Content $configFile -Raw | ConvertFrom-Json

function Get-Col([string[]]$arr, [int]$idx, [string]$def = "") {
    if ($idx -lt $arr.Length -and $arr[$idx] -ne $null) {
        return $arr[$idx].Trim()
    }
    return $def
}

function Parse-VnDecimal([string]$val) {
    if ([string]::IsNullOrWhiteSpace($val)) { return 0.0 }
    $clean = $val.Trim().Replace('"', '').Replace(" ", "")
    if ($clean -match '\.\d{3},\d+') {
        $clean = $clean.Replace('.', '').Replace(',', '.')
    } elseif ($clean -match ',\d+') {
        $clean = $clean.Replace(',', '.')
    } else {
        if ($clean -match '^\d{1,3}(\.\d{3})+$') {
            $clean = $clean.Replace('.', '')
        }
    }
    $res = 0.0
    [double]::TryParse($clean, [System.Globalization.NumberStyles]::Any, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$res) | Out-Null
    return [Math]::Round($res, 4)
}

function Parse-VnCurrency([string]$val) {
    if ([string]::IsNullOrWhiteSpace($val)) { return 0.0 }
    $clean = $val.Trim().Replace('"', '').Replace(" ", "").Replace("VND", "")
    if ($clean -match '\.') {
        $clean = $clean.Replace('.', '')
    }
    if ($clean -match ',') {
        $clean = $clean.Replace(',', '.')
    }
    $res = 0.0
    [double]::TryParse($clean, [System.Globalization.NumberStyles]::Any, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$res) | Out-Null
    return $res
}

$csvFile = "$OutputDir\raw_sheet_data.csv"
if ($SourceCsvPath -ne "" -and (Test-Path $SourceCsvPath)) {
    Copy-Item $SourceCsvPath $csvFile -Force
    Write-Host "Loaded source CSV from: $SourceCsvPath" -ForegroundColor Cyan
} elseif ($ForceRefresh -or (-not (Test-Path $csvFile))) {
    Write-Host "Fetching live data from Google Sheets..." -ForegroundColor Cyan
    $sheetUrl = $config.sheet_export_url
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    curl.exe -s -L -o $csvFile $sheetUrl
    Write-Host "Download complete: $csvFile" -ForegroundColor Green
}

Write-Host "Parsing and normalizing records using high-performance parser..." -ForegroundColor Cyan
Add-Type -AssemblyName Microsoft.VisualBasic

$parser = New-Object Microsoft.VisualBasic.FileIO.TextFieldParser($csvFile, [System.Text.Encoding]::UTF8)
$parser.TextFieldType = [Microsoft.VisualBasic.FileIO.FieldType]::Delimited
$parser.SetDelimiters(",")
$parser.HasFieldsEnclosedInQuotes = $true

$records = [System.Collections.Generic.List[PSObject]]::new()

$totalTransferredQty = 0.0
$totalReceivedQty = 0.0
$totalDiffQty = 0.0
$totalLossVal = 0.0
$totalStorePenalty = 0.0
$totalWarehousePenalty = 0.0
$totalUndeterminedVal = 0.0

$r = 0
$headerIndex = 2

while (-not $parser.EndOfData) {
    $cols = $parser.ReadFields()
    $r++

    # First few rows check header
    if ($r -le 3) {
        $joined = $cols -join " "
        if ($joined -match "TO" -and $joined -match "PT" -and $joined -match "SL") {
            $headerIndex = $r - 1
        }
        continue
    }

    if ($cols.Length -lt 10) { continue }

    $sku         = Get-Col $cols 4
    $productName = Get-Col $cols 5

    if ([string]::IsNullOrWhiteSpace($sku) -and [string]::IsNullOrWhiteSpace($productName)) {
        continue
    }
    if ($sku -eq "Ma hng" -or $sku -eq "Mã hàng") {
        continue
    }

    $handler       = Get-Col $cols 0
    $transferDate  = Get-Col $cols 1
    $storeName     = Get-Col $cols 2
    $storeId       = Get-Col $cols 3
    $unit          = Get-Col $cols 6

    $rawQtyTransferred = Get-Col $cols 7 "0"
    $rawQtyReceived    = Get-Col $cols 8 "0"
    $rawQtyDiff        = Get-Col $cols 9 "0"

    $qtyTransferred = Parse-VnDecimal $rawQtyTransferred
    $qtyReceived    = Parse-VnDecimal $rawQtyReceived
    $qtyDiff        = Parse-VnDecimal $rawQtyDiff
    if ($qtyDiff -eq 0.0 -and ($qtyTransferred -gt 0.0 -or $qtyReceived -gt 0.0)) {
        $qtyDiff = [Math]::Round(($qtyTransferred - $qtyReceived), 3)
    }

    $ptTransfer     = Get-Col $cols 10
    $crateCode      = Get-Col $cols 11
    $toOrder        = Get-Col $cols 12
    $naturalLossQty = Parse-VnDecimal (Get-Col $cols 13 "0")
    $storeReturnQty = Parse-VnDecimal (Get-Col $cols 14 "0")
    $undeterminedQty= Parse-VnDecimal (Get-Col $cols 15 "0")

    $status         = Get-Col $cols 20 "Pending"
    $errorType      = Get-Col $cols 21
    $responsible    = Get-Col $cols 25
    $imageLink      = Get-Col $cols 26
    $dcConfirm      = Get-Col $cols 27
    $dcNote         = Get-Col $cols 28
    $kfmFeedback    = Get-Col $cols 29

    $categoryV2     = Get-Col $cols 31 "OTHER"
    $rawCostPrice   = Get-Col $cols 34 "0"
    $costPrice      = Parse-VnCurrency $rawCostPrice

    $totalValue = [Math]::Round(($qtyDiff * $costPrice), 0)
    $valNaturalLoss = [Math]::Round(($naturalLossQty * $costPrice), 0)
    
    $rawValStore = Get-Col $cols 37 ""
    $rawValWarehouse = Get-Col $cols 38 ""
    $rawValUndetermined = Get-Col $cols 39 ""

    $valStore = if ($rawValStore -ne "") { Parse-VnCurrency $rawValStore } else { 0.0 }
    $valWarehouse = if ($rawValWarehouse -ne "") { Parse-VnCurrency $rawValWarehouse } else { 0.0 }
    $valUndetermined = if ($rawValUndetermined -ne "") { Parse-VnCurrency $rawValUndetermined } else { 0.0 }

    if ($valStore -eq 0.0 -and $valWarehouse -eq 0.0 -and $valUndetermined -eq 0.0 -and $valNaturalLoss -eq 0.0) {
        if ($responsible -match "Kho" -or $dcConfirm -match "claim" -or $errorType -match "DC") {
            $valWarehouse = $totalValue
        } elseif ($responsible -match "ST|ieu thi|iêu thị" -or $errorType -match "ST") {
            $valStore = $totalValue
        } elseif ($errorType -match "Hao" -or $naturalLossQty -gt 0) {
            $valNaturalLoss = $totalValue
        } else {
            $valUndetermined = $totalValue
        }
    }

    $gsm = Get-Col $cols 40
    $rsm = Get-Col $cols 41
    $area= Get-Col $cols 42

    $item = [PSCustomObject]@{
        id                      = "REC-" + ($records.Count + 1).ToString("D5")
        handler                 = $handler
        transfer_date           = $transferDate
        store_id                = $storeId
        store_name              = $storeName
        area                    = $area
        sku                     = $sku
        product_name            = $productName
        unit                    = $unit
        category_v2             = $categoryV2
        to_order                = $toOrder
        pt_transfer             = $ptTransfer
        crate_code              = $crateCode
        qty_transferred         = $qtyTransferred
        qty_received            = $qtyReceived
        qty_diff                = $qtyDiff
        natural_loss_qty        = $naturalLossQty
        store_return_qty        = $storeReturnQty
        undetermined_qty        = $undeterminedQty
        cost_price              = $costPrice
        total_value             = $totalValue
        loss_value              = $valNaturalLoss
        store_penalty           = $valStore
        warehouse_penalty       = $valWarehouse
        undetermined_value      = $valUndetermined
        status                  = $status
        error_type              = $errorType
        responsible_party       = $responsible
        dc_confirmation         = $dcConfirm
        dc_note                 = $dcNote
        kfm_feedback            = $kfmFeedback
        image_link              = $imageLink
        gsm                     = $gsm
        rsm                     = $rsm
    }

    $records.Add($item)

    $totalTransferredQty += $qtyTransferred
    $totalReceivedQty += $qtyReceived
    $totalDiffQty += $qtyDiff
    $totalLossVal += $valNaturalLoss
    $totalStorePenalty += $valStore
    $totalWarehousePenalty += $valWarehouse
    $totalUndeterminedVal += $valUndetermined
}

$parser.Close()

Write-Host "Processed $($records.Count) reconciliation rows successfully!" -ForegroundColor Green

$summary = [PSCustomObject]@{
    generated_at            = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    total_records           = $records.Count
    total_qty_transferred   = [Math]::Round($totalTransferredQty, 2)
    total_qty_received      = [Math]::Round($totalReceivedQty, 2)
    total_qty_diff          = [Math]::Round($totalDiffQty, 2)
    financial_summary       = [PSCustomObject]@{
        total_natural_loss_vnd      = $totalLossVal
        total_store_penalty_vnd     = $totalStorePenalty
        total_warehouse_penalty_vnd = $totalWarehousePenalty
        total_undetermined_vnd      = $totalUndeterminedVal
        grand_total_penalty_vnd     = ($totalStorePenalty + $totalWarehousePenalty)
    }
}

$recordsJsonPath = "$OutputDir\reconciliation_records.json"
$summaryJsonPath = "$OutputDir\datapay_summary.json"

$records | ConvertTo-Json -Depth 5 | Set-Content $recordsJsonPath -Encoding UTF8
$summary | ConvertTo-Json -Depth 5 | Set-Content $summaryJsonPath -Encoding UTF8

Write-Host "Records saved to: $recordsJsonPath" -ForegroundColor Green
Write-Host "Summary saved to: $summaryJsonPath" -ForegroundColor Green

Write-Host "`n========== DATAPAY RECONCILIATION SUMMARY ==========" -ForegroundColor Cyan
Write-Host ("Total Records           : {0:N0}" -f $records.Count)
Write-Host ("Total Qty Diff          : {0:N2}" -f $totalDiffQty)
Write-Host ("Total Natural Loss      : {0:N0} VND" -f $totalLossVal) -ForegroundColor Yellow
Write-Host ("Warehouse Penalty (DC)  : {0:N0} VND" -f $totalWarehousePenalty) -ForegroundColor Red
Write-Host ("Store Penalty (ST)      : {0:N0} VND" -f $totalStorePenalty) -ForegroundColor Magenta
Write-Host ("Undetermined Value      : {0:N0} VND" -f $totalUndeterminedVal) -ForegroundColor DarkGray
Write-Host "====================================================`n" -ForegroundColor Cyan
