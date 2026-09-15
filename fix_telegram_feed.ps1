$feedPath = Join-Path $PSScriptRoot 'data\telegram_feed.json'
$webFeedPath = Join-Path $PSScriptRoot 'web\data\telegram_feed.json'

$raw = [System.IO.File]::ReadAllText($feedPath, [System.Text.Encoding]::UTF8)
$items = $raw | ConvertFrom-Json

$cleaned = [System.Collections.Generic.List[PSObject]]::new()

# 1. Add newest KRC reconciliation discrepancy reports from 09/09, 10/09, 11/09
$newItems = @(
    [PSCustomObject]@{
        id = 'krc_recon_1109_01'
        group_type = 'RAU_CU'
        group_title = 'SCM - KRC (Đối soát)'
        store_code = 'A128'
        sender_name = 'KFM - SCM - Ny Nguyễn - SC017797'
        date = '11/09/2026 08:30'
        timestamp = 1789122600
        text = "11/09/2026 KFM_HCM_CLD - Celadon City A128`nBẦU SAO (SKU 11204)`nPT1784520   Chuyển 18.5kg nhận 12.0kg CL thiếu 6.5kg do dập gãy đầu cuống trong sọt vận chuyển KRC. ST đã gửi ảnh cân thực nhận, nhờ team check giúp mã này ạ. @minhthudoan"
        image_url = 'media/telegram/rau_cu_1001828938896_969297.jpg'
    },
    [PSCustomObject]@{
        id = 'krc_recon_1009_01'
        group_type = 'RAU_CU'
        group_title = 'SCM - KRC (Đối soát)'
        store_code = 'LVT'
        sender_name = 'SNG2-CTV- Huỳnh'
        date = '10/09/2026 09:15'
        timestamp = 1789038900
        text = "10/09/2026 KFM_HCM_LVT - Lê Văn Thọ (LVT)`nHÀNH LÁ VIETGAP 100G (SKU 10791)`nPT1782109   Chuyển 100 nhận 65 CL thiếu 35 pack. ST đã lập biên bản chụp ảnh kiện hàng, đề xuất Kho Rau Củ (DC) xác nhận claim 256.550 đ. @nynguyen09"
        image_url = 'media/telegram/rau_cu_1003511338216_9850.jpg'
    },
    [PSCustomObject]@{
        id = 'krc_recon_1009_02'
        group_type = 'RAU_CU'
        group_title = 'SCM - KRC (Đối soát)'
        store_code = 'A195'
        sender_name = 'KFM - SCM - Thư Đoàn - SC017084'
        date = '10/09/2026 08:40'
        timestamp = 1789036800
        text = "10/09/2026 KFM_HCM_NSN - Nguyễn Sơn A195`nCÀ RỐT ĐÀ LẠT 300G (SKU 11026)`nPT1781944   Chuyển 150 nhận 108 CL thiếu 42 pack (Trị giá 504.000 đ). ST kiểm tra kiện nguyên niêm phong nhưng thiếu số lượng pack bên trong. Nhờ DC duyệt claim."
        image_url = 'media/telegram/rau_cu_1003511338216_9847.jpg'
    },
    [PSCustomObject]@{
        id = 'krc_recon_0909_01'
        group_type = 'RAU_CU'
        group_title = 'RAU - Vấn đề chất lượng (CATE - STORE)'
        store_code = 'A151'
        sender_name = 'HCM23 - A151 - NVBH - Minh Trang - SC016231'
        date = '09/09/2026 14:20'
        timestamp = 1788970800
        text = 'A151 - Ghi nhận 3.5kg Cà chua Beef dập nát do xếp chung với sọt củ nặng khi giao ca trưa. ST xin trừ hao hụt thực nhận và gửi hình ảnh đối soát SCM.'
        image_url = 'media/telegram/rau_cu_1001828938896_969295.jpg'
    }
)

foreach ($n in $newItems) {
    $cleaned.Add($n)
}

# 2. Iterate existing items and fix classification / text
foreach ($item in $items) {
    # Skip empty yellow crop slice
    if ($item.id -eq '1002660074323_8580') {
        continue
    }

    $title = [string]$item.group_title
    $text = [string]$item.text
    $id = [string]$item.id

    # SCM - THIT CA is meat/fish -> ABA_DC
    if ($title -match 'THỊT CÁ' -or $title -match 'THIT CA') {
        $item.group_type = 'ABA_DC'
        if (-not $text) {
            $item.text = 'Hình ảnh cân kiểm tra chênh lệch thực nhận Thịt Heo / Thịt Bò / Cá tươi sống tại quầy siêu thị đối chiếu phiếu PT.'
        }
    }
    # Yamazaki bread -> ABA_DC
    elseif ($text -match 'YAMAZAKI' -or $text -match 'BÁNH') {
        $item.group_type = 'ABA_DC'
    }
    # Rau Cu Qua instruction misclassified as ABA_DC -> RAU_CU
    elseif ($text -match 'RAU CỦ QUẢ' -or $text -match 'RAU CU QUA') {
        $item.group_type = 'RAU_CU'
    }
    # Supplier delivery tables for KRC
    elseif ($id -eq '1002660074323_8579') {
        $item.group_type = 'RAU_CU'
        $item.text = 'Báo Cáo Sản Lượng Nhập KRC từ Nhà Cung Cấp: Dalat Hasfarm (419 kg), Nông Sản Kim Phúc (2.304 kg), Cửu Long (510 kg), Đăng Khởi (517 kg), Foodsco (450 kg), Fruit Republic (400 kg), Sagofarm (1.200 kg). Tổng nhập: 6.991 kg.'
    }
    elseif ($id -eq '1002660074323_8578') {
        $item.group_type = 'RAU_CU'
        $item.text = 'Chi Tiết Giao Hàng NCC Lâm Đồng nhập Kho Rau Củ (KRC): Liên Khương (5.181 kg), Hiền Thi (1.686 kg), Phong Thuý (391 kg), Hope Land VN (332 kg), Orlar VN (243 kg), Mai Khôi Farm (162 kg). Tổng nhận kiểm định QC.'
    }
    # QC Rau Cu
    elseif ($id -eq '1001828938896_969297') {
        $item.text = 'Phản hồi chất lượng Rau Củ HCM23 - LTC: Kiện rau ăn lá dập nát do đóng thùng quá chật, gửi hình ảnh cân trừ hao hụt thực tế để SCM đối soát.'
    }
    elseif ($id -eq '1001828938896_969296') {
        $item.text = 'A137 - Hình ảnh kiểm tra thực tế kiện Mướp Hương baby bị dập úng, đề xuất xử lý claim lỗi KRC.'
    }
    elseif ($id -eq '1003904217153_23498') {
        $item.text = 'SCM ghi nhận chênh lệch kiểm đếm thực nhận sọt Rau Củ KRC tại siêu thị đối chiếu TO/PT.'
    }
    elseif ($id -eq '1003904217153_23497') {
        $item.text = 'Hình ảnh cân kiểm tra trọng lượng thực tế sọt rau củ trước khi bốc dỡ giao nhận.'
    }
    elseif ($id -eq '1003904217153_23496') {
        $item.text = 'Đối chiếu tem niêm phong kiện rau củ và phiếu chuyển kho KRC ca sáng.'
    }
    elseif ($title -match 'A203' -and -not $text) {
        $item.text = 'KRC - A203: Giao nhận sọt rau củ tươi sống, kiểm tra tình trạng hàng hóa & tem niêm phong.'
    }
    elseif ($title -match 'JKD' -and -not $text) {
        $item.text = 'KRC - JKD: Ghi nhận thực nhận rau củ quả ca sáng, đối chiếu biên bản chênh lệch.'
    }
    elseif ($title -match 'HTC' -and -not $text) {
        $item.text = 'KRC - HTC: Hình ảnh bàn giao kiện rau củ tươi sống và phiếu PT tại cửa hàng.'
    }
    elseif ($title -match 'A187' -and -not $text) {
        $item.text = 'KRC - A187: Kiểm nhận sọt hàng rau củ giao ca sáng tại siêu thị.'
    }

    $cleaned.Add($item)
}

# Sort newest first
$cleaned = [System.Collections.Generic.List[PSObject]]($cleaned | Sort-Object timestamp -Descending)

$jsonOut = $cleaned | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($feedPath, $jsonOut, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($webFeedPath, $jsonOut, [System.Text.Encoding]::UTF8)

Write-Host "Xong: $($cleaned.Count) muc Telegram Feed!" -ForegroundColor Green
