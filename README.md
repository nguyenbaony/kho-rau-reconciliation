# 🥦 Hệ Thống Đối Soát Kho Rau & Datapay Hub (Kho Rau Recon Engine)

[![Live Demo](https://img.shields.io/badge/LIVE%20DEMO-GitHub%20Pages-2ea44f?style=for-the-badge&logo=github)](https://nguyenbaony.github.io/kho-rau-reconciliation/)
[![Google Sheets Realtime](https://img.shields.io/badge/Google%20Sheets-Realtime%20Sync-0ea5e9?style=for-the-badge&logo=googlesheets)](https://nguyenbaony.github.io/kho-rau-reconciliation/)
[![Telegram Automation](https://img.shields.io/badge/Daily%207%3A00%20AM-Telegram%20Automation-0284c7?style=for-the-badge&logo=telegram)](https://github.com/nguyenbaony/kho-rau-reconciliation)

> **Hệ thống tự động hóa đối soát số liệu giao nhận nông sản & tính toán chế tài Datapay giữa Trung tâm Phân phối (DC Kho Rau) và Chuỗi Siêu thị (KFM - SCM).**

---

## 🌟 Bản Trực Tuyến & Liên Kết Nhanh

- 🌐 **Website Realtime (GitHub Pages)**: [https://nguyenbaony.github.io/kho-rau-reconciliation/](https://nguyenbaony.github.io/kho-rau-reconciliation/)
- 💻 **Source Code Repository**: [https://github.com/nguyenbaony/kho-rau-reconciliation](https://github.com/nguyenbaony/kho-rau-reconciliation)
- 📊 **Nguồn Dữ Liệu Google Sheets**: [Google Sheets Đối Soát](https://docs.google.com/spreadsheets/d/1XBNLjZLsgaaHDBqVKsbCSYhzD4v-4qMA6rjGXGG4ThM/edit?gid=1422896115)

---

## 🚀 Các Tính Năng Nổi Bật

### 1. ⚡ Đồng Bộ Realtime Google Sheets (In-Browser Sync)
- **Tự động kéo dữ liệu trực tiếp**: Khi truy cập hoặc nhấn nút **"Đồng Bộ Google Sheet"**, hệ thống tải trực tiếp file CSV xuất từ Google Sheets (`gid=1422896115`) mà không cần tải lại trang.
- **Tùy chọn tự động quét (Auto-polling)**: Lựa chọn chu kỳ tự động đồng bộ (1 phút, 3 phút, 5 phút hoặc Tắt) kèm bộ đếm ngược giây trực quan.
- **Bộ nhớ đệm thông minh (Smart Cache V4)**: Tự động lưu cache trình duyệt để mở tức thì và tự động cập nhật ngay khi có dòng phát sinh mới.

### 2. 📅 Bộ Lọc Ngày (Date Filter) Đầy Đủ (26/08 - 09/09/2026)
- **Hỗ trợ 15 ngày liên tục**: Lọc nhanh các ngày phát sinh đơn hàng từ **26/08/2026** đến **09/09/2026** (11.119 dòng dữ liệu).
- **Lọc theo khoảng ngày tùy chọn (Date Range)**: Chọn ngày bắt đầu và kết thúc (`Từ ngày` → `Đến ngày`) để phân tích xu hướng.
- **Tính toán KPI động thời gian thực**: Khi lọc ngày, toàn bộ 5 chỉ số tài chính Datapay (Tổng lệnh, Hao hụt tự nhiên, Phạt Kho DC, Phạt Siêu thị ST, Lệch CXD) tự động cập nhật chuẩn xác.

### 3. 🔍 Bộ Lọc Đa Chiều & Tìm Kiếm Tức Thì
- **Tìm kiếm tức thì**: Theo Mã hàng (SKU), Tên rau củ, Mã siêu thị, Mã lệnh chuyển TO, Mã phiếu PT.
- **Lọc theo Siêu thị**: KFM Lê Văn Thọ (LVT), KFM Nguyễn Sơn (A195), KFM Boulevard (A242), KFM Nguyễn Hữu Tiến (A229), KFM Celadon (CLD), KFM Lê Văn Lương (LVL)...
- **Lọc theo Phân loại lỗi**: Hao hụt tự nhiên, DC giao thiếu, DC Pick sai, ST kiểm sai quy trình, ST nhập thiếu...
- **Lọc theo Trạng thái**: Hoàn thành, Chờ duyệt, Đồng ý claim, Từ chối claim...

### 4. ⏰ Tự Động Hóa Báo Cáo 7:00 AM Hằng Ngày
- **Tự động gửi Telegram lúc 07:00 AM**: Windows Task Scheduler (`KhoRau_Reconciliation_Daily7AM`) tự động chạy script `daily_7am_job.ps1` mỗi ngày.
- **Nội dung báo cáo**: Tổng hợp số tiền phạt Kho DC, Phạt Siêu thị ST, Hao hụt tự nhiên và kèm link truy cập trực tiếp dashboard gửi tới Telegram cá nhân (Saved Messages).
- **Tự động đẩy code lên GitHub Pages**: Sau khi xử lý dữ liệu mới từ Google Sheets, script tự động commit và push lên branch `main` của GitHub.

---

## 📁 Cấu Trúc Dự Án

```
kho-rau-reconciliation/
│
├── index.html                   # Giao diện chính Dashboard (Realtime Google Sheets + Cache buster v4)
├── app.js                       # Logic xử lý frontend: Google Sheets CSV parser, KPI động, Auto-sync
├── style.css                    # Thiết kế giao diện Dark Mode Glassmorphism cao cấp
│
├── daily_7am_job.ps1            # Job tự động chạy 7:00 AM: Sync Google Sheets, báo cáo Telegram, push GitHub
├── install_daily_schedule.ps1   # Script cài đặt Windows Task Scheduler hằng ngày
├── send_personal_report.py      # Script gửi báo cáo Datapay qua Telethon Telegram cá nhân
├── ReconciliationEngine.ps1     # Engine bóc tách, chuẩn hóa dữ liệu tốc độ cao (.NET TextFieldParser)
├── server.ps1                   # HTTP Dev Server local với no-cache headers
│
├── data/                        # Dữ liệu đối soát
│   ├── datapay_summary.json     # Tổng hợp tài chính và số liệu chốt
│   ├── reconciliation_data.js   # Dataset đối soát dạng JS nhúng trực tiếp (11.119 dòng)
│   ├── reconciliation_records.json # Toàn bộ danh sách dòng đối soát chi tiết
│   └── raw_sheet_data.csv       # Dữ liệu thô từ Google Sheets
│
└── web/                         # Thư mục build phân phối tương thích
    ├── index.html
    ├── app.js
    ├── style.css
    └── data/
```

---

## 🛠️ Hướng Dẫn Khởi Chạy Local

### Cách 1: Khởi chạy HTTP Server qua PowerShell
```powershell
.\server.ps1 -Port 8085
```
Truy cập tại: `http://localhost:8085/`

### Cách 2: Đồng bộ thủ công dữ liệu Google Sheets
```powershell
.\ReconciliationEngine.ps1 -ForceRefresh
powershell .\generate_web_data.ps1
```

### Cách 3: Kiểm tra Job báo cáo Telegram 7:00 AM
```powershell
powershell -ExecutionPolicy Bypass -File .\daily_7am_job.ps1
```

---

## 🤝 Liên Hệ & Bản Quyền
- Quản trị: **Ny Nguyễn** ([@nynguyen09](https://t.me/nynguyen09))
- Live Site: [https://nguyenbaony.github.io/kho-rau-reconciliation/](https://nguyenbaony.github.io/kho-rau-reconciliation/)
- Repository: [https://github.com/nguyenbaony/kho-rau-reconciliation](https://github.com/nguyenbaony/kho-rau-reconciliation)
