# 🥦 Hệ Thống Đối Soát Kho Rau & Datapay Hub (Kho Rau Recon Engine)

> **Hệ thống tự động hóa đối soát số liệu giao nhận nông sản & tính toán chế tài Datapay giữa Trung tâm Phân phối (DC Kho Rau) và Chuỗi Siêu thị.**

---

## 🌟 Bản Demo Trực Quan (Live Demo)
- **Demo Online trên GitHub Pages**: [https://nguyenbaony.github.io/kho-rau-reconciliation/](https://nguyenbaony.github.io/kho-rau-reconciliation/)
- **Demo Local 1-Click**: Click đúp vào file `start_demo.bat` hoặc mở trực tiếp `index.html`.

---

## 🚀 Các Tính Năng Nổi Bật

### 1. 📅 Bộ Lọc Ngày (Date Filter) Linh Hoạt
- **Lọc theo ngày cụ thể**: Chọn nhanh các ngày phát sinh đơn hàng (từ `26/08/2026` đến `03/09/2026`) theo chuẩn định dạng Việt Nam `DD/MM/YYYY`.
- **Lọc theo khoảng ngày (Date Range)**: Chọn ngày bắt đầu và kết thúc (`Từ ngày` → `Đến ngày`) để phân tích xu hướng và tổng hợp số liệu theo tuần/tháng.
- **Tính toán KPI động thời gian thực**: Khi lọc theo ngày hoặc siêu thị, toàn bộ 5 thẻ KPI (Tổng lệnh, Hao hụt tự nhiên, Phạt Kho DC, Phạt Siêu thị ST, Chưa xác định) tự động tính toán lại tức thì.
- **Nút Đặt lại (Reset Filter)**: Xóa toàn bộ bộ lọc chỉ với 1 click.

### 2. 🔍 Bộ Lọc Đa Chiều & Tìm Kiếm Toàn Diện
- **Tìm kiếm tức thì**: Theo Mã hàng (SKU), Tên sản phẩm rau củ quả, Mã siêu thị, Mã lệnh chuyển TO, Mã phiếu PT.
- **Lọc theo Siêu thị**: KFM Lê Văn Thọ (LVT), KFM Nguyễn Sơn (A195), KFM Boulevard (A242), KFM Nguyễn Hữu Tiến (A229), KFM Celadon (CLD), KFM Lê Văn Lương (LVL)...
- **Lọc theo Loại lỗi**: Hao hụt tự nhiên, DC giao thiếu, DC Pick sai, ST kiểm sai quy trình, ST nhập thiếu...
- **Lọc theo Trạng thái**: Hoàn thành, Chờ duyệt, Đồng ý claim, Từ chối claim...

### 3. 🔄 Quy Trình Phân Luồng Đối Soát 5 Bước (Workflow Pipeline)
1. **Bước 1**: Điều chuyển TO/PT
2. **Bước 2**: Xác định Chênh lệch & Hao hụt định mức
3. **Bước 3**: Thẩm định bằng chứng hình ảnh & Camera
4. **Bước 4**: Phân bổ lỗi và quy trách nhiệm
5. **Bước 5**: Bảng chốt Datapay phạt & Xuất báo cáo
6. **📱 Tab Telegram Feed**: Theo dõi tương tác thực tế từ 459 nhóm chat điều phối.

### 4. 📊 Xuất Báo Cáo Datapay & Chia Sẻ Telegram
- **Xuất Excel/CSV**: Tải file bảng dữ liệu đối soát đã lọc chỉ với 1 thao tác.
- **Gửi Báo cáo Telegram**: Tự động soạn sẵn tóm tắt KPI số tiền phạt và link đối soát gửi qua nhóm điều hành.

---

## 📁 Cấu Trúc Dự Án

```
kho-rau-reconciliation/
│
├── index.html                   # Giao diện chính hệ thống Dashboard
├── app.js                       # Logic xử lý bộ lọc, tính toán KPI động và bảng dữ liệu
├── style.css                    # Thiết kế giao diện Dark Mode Glassmorphism cao cấp
│
├── start_demo.bat               # File khởi chạy nhanh bản demo 1-click trên Windows
├── ReconciliationEngine.ps1     # Engine bóc tách, chuẩn hóa dữ liệu từ Google Sheets
├── auto_push.ps1                # Script đồng bộ và tự động push code lên GitHub
│
├── data/                        # Dữ liệu đối soát
│   ├── datapay_summary.json     # Tổng hợp tài chính và số liệu chốt
│   ├── reconciliation_data.js   # Dataset đối soát dạng JS nhúng trực tiếp
│   ├── reconciliation_records.json # Toàn bộ danh sách dòng đối soát chi tiết
│   └── raw_sheet_data.csv       # Dữ liệu thô tải từ Google Sheets
│
└── web/                         # Thư mục build phân phối phục vụ server local và web host
    ├── index.html
    ├── app.js
    ├── style.css
    └── data/
```

---

## 🛠️ Hướng Dẫn Khởi Chạy Local

### Cách 1: Sử dụng file `start_demo.bat` (Khuyên dùng)
Click đúp chuột vào file `start_demo.bat` trong thư mục dự án, trình duyệt sẽ tự động mở trang web đối soát.

### Cách 2: Khởi chạy HTTP Server qua PowerShell
```powershell
.\server.ps1 -Port 8085
```
Sau đó truy cập trình duyệt tại: `http://localhost:8085/`

### Cách 3: Cập nhật dữ liệu mới từ Google Sheets
```powershell
.\ReconciliationEngine.ps1 -ForceRefresh
powershell .\generate_web_data.ps1
```

---

## 🤝 Tác Giả & Bản Quyền
- Dự án được phát triển riêng cho công tác quản trị và đối soát chênh lệch hàng hóa nông sản chuỗi siêu thị.
- Repository: [https://github.com/nguyenbaony/kho-rau-reconciliation](https://github.com/nguyenbaony/kho-rau-reconciliation)
