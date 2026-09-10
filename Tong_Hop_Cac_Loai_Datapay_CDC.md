# BÁO CÁO TỔNG HỢP CÁC LOẠI DATAPAY & DỮ LIỆU CDC TRÊN STARROCKS
> **Cơ sở dữ liệu:** `kfm_scm` (Host: `103.147.122.103:9030`)  
> **Tài khoản:** `kfm_scm_tho_nguyen`  
> **Thời gian cập nhật:** 04/09/2026  

---

## 1. PHÂN LOẠI DATAPAY THEO TRÁCH NHIỆM TÀI CHÍNH (3 NHÓM CHÍNH)

Trong quy trình vận hành chuỗi cung ứng SCM và đối soát kho - siêu thị, toàn bộ số tiền phạt chênh lệch (Datapay) được phân định rõ ràng về một trong các nhóm sau:

| Nhóm Datapay | Trường Dữ Liệu Trên DB | Cơ Chế Xử Lý Nghiệp Vụ & Tài Chính |
| :--- | :--- | :--- |
| **1. Datapay Phạt Kho (DC Penalty)** | `tien_tra_dc` / `total_warehouse_penalty_vnd` | Kho DC chịu trách nhiệm hoàn trả/trừ công nợ về cho siêu thị do các lỗi phát sinh từ khâu kho: soạn thiếu, đóng thiếu, pick sai. |
| **2. Datapay Phạt Siêu Thị (ST Penalty)** | `tien_tra_st` / `total_store_penalty_vnd` | Siêu thị chịu phạt tiền/ghi nhận chi phí do kiểm đếm sai quy trình, nhập thiếu, tự làm hư hỏng hàng hóa sau khi nhận. |
| **3. Hao Hụt Tự Nhiên (Định Mức)** | `sl_hao_hut` / `total_natural_loss_vnd` | Tỷ lệ hao hụt khối lượng bay hơi, mất nước theo % định mức quy chuẩn (Rau 3.0%, Trái cây 2.5%...). Chỉ phần vượt ngưỡng mới tính chế tài. |
| **4. Đơn Vị Vận Tải (Vận chuyển/Đội xe)** | `sl_tra_ton_aba` | Các lỗi vi phạm bàn giao nhầm siêu thị, nhiệt độ thùng lạnh không đạt chuẩn hoặc thất lạc hàng. |
| **5. Chưa Xác Định (CXD / Chờ đối chất)** | `tien_con_lai` / `total_undetermined_vnd` | Các trường hợp phát sinh lệch nhưng hai bên (DC và ST) đang khiếu nại, chưa có quyết định phạt cuối cùng. |

---

## 2. BẢNG KÊ CHI TIẾT TỪNG LOẠI LỖI DATAPAY TRÊN HỆ THỐNG

Thống kê thực tế từ hơn 1.4 triệu dòng giao dịch và đối soát:

| STT | Loại Datapay / Nguyên Nhân | Số Dòng | SL Lệch (Kg/Pack) | Tổng Giá Trị (VND) | Phạt Kho DC (VND) | Phạt Siêu Thị (VND) | Bản Chất Nghiệp Vụ |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | **DC giao thiếu** | 10,154 | 22,907.44 | 75,786,046 | **75,104,665** | 54,253 | Phiếu xuất kho (PT/TO) có ghi nhận nhưng thực tế mở kiện ra bị thiếu hàng. Kho DC chịu trách nhiệm đền bù. |
| **2** | **VT giao sai điểm** | 1,439 | 5,023.18 | 18,714,131 | **18,647,181** | 283 | Tài xế/đơn vị vận tải trả nhầm kiện hàng của siêu thị này sang siêu thị khác trên tuyến giao. |
| **3** | **ST nhập thiếu** | 1,350 | 4,192.38 | 9,829,117 | 307,460 | **9,488,014** | Kho DC giao đủ hàng nhưng nhân viên ST kiểm đếm sót, nhập thiếu vào hệ thống KDB. ST chịu phạt. |
| **4** | **DC giao bù** | 387 | 1,864.64 | 9,448,485 | 185,758 | **9,258,654** | Hàng giao bù cho các đơn lệch kỳ trước; hệ thống ghi nhận điều chỉnh quy hoàn lại giá trị cho ST. |
| **5** | **DC Pick sai** | 878 | 3,954.10 | 5,775,554 | **5,742,013** | 1,457 | Nhân viên kho soạn nhầm mã SKU, nhầm chủng loại hoặc sai quy cách đóng gói (Pack vs KG). |
| **6** | **Hao hụt (Vượt ngưỡng)** | 21,183 | 2,243.54 | 15,932,919 | 9,112 | **2,243,666** | Chênh lệch trọng lượng rau củ quả vượt quá ngưỡng dung sai tự nhiên theo định mức quy định. |
| **7** | **ST kiểm sai QT** | 287 | 344.40 | 438,495 | 20,456 | **418,039** | ST không tuân thủ quy trình nghiệm thu hàng tươi sống (không chụp ảnh kiện, kiểm trễ giờ quy định). |
| **8** | **ST thông tin sai/không phản hồi** | 171 | 390.33 | 327,142 | 17,892 | **309,250** | ST tạo claim nhưng khi DC/KFM đối chất thì không cung cấp được bằng chứng hợp lệ. |
| **9** | **DC thao tác sai** | 65 | 162.30 | 198,454 | 2,443 | **195,741** | Lỗi quy trình đóng gói, dán nhãn sai mã kiện/thùng tote tại kho DC. |
| **10** | **Lỗi hệ thống** | 387 | 613.14 | 10,405 | 10,400 | 5 | Chênh lệch do lỗi kỹ thuật đồng bộ giữa WMS và KDB (xử lý kỹ thuật, không phạt nhân sự). |
| **11** | **Không đạt nhiệt độ** | 554 | — | — | — | — | Vi phạm quy chuẩn nhiệt độ bảo quản lạnh lúc giao nhận hàng (theo dữ liệu hình ảnh đo nhiệt độ CDC). |

---

## 3. CÁC BẢNG CDC TRÊN STARROCKS THU THẬP DỮ LIỆU DATAPAY

Hệ thống CDC (Change Data Capture) lưu trữ toàn bộ lịch sử biến động từ các nguồn ERP/WMS/App giao nhận:

1. **`__cdc_kfm_kf_inventories_kf_transfer_items` (315,078 dòng):**
   - Quản lý toàn bộ tiến trình chuyển hàng từ DC đến Siêu thị.
   - Các trường cốt lõi: `is_claim` (cờ xác định có claim), `from_claim_fresh` (hàng tươi phát sinh từ claim), `adjustment_type` (loại điều chỉnh 1, 3), `double_checked_status` (trạng thái kiểm đếm 2 lần).
   - Theo dõi từng mốc vòng đời: `supermarket_received`, `supermarket_inspecting`, `shelved_in_supermarket`.

2. **`__cdc_kfm_kf_inventories_kf_claim_stock_summaries` & `claim_transaction_details`:**
   - Theo dõi tồn kho claim và chi tiết các giao dịch claim theo mã barcode, siêu thị, ngày phát sinh (`claim_quantity`, `claim_stock`).

3. **`__cdc_kfm_kf_inventories_kf_hrw_quality_tickets___items` (101,632 dòng):**
   - Vé kiểm tra chất lượng hàng tươi sống.
   - Các trường quan trọng: `final_conclusion` (kết luận chất lượng), `support_rate` (tỷ lệ hỗ trợ đền bù %), `cancel_note` (lý do từ chối/hủy phiếu).

4. **`__cdc_kfm_597a32ea_...___tl_temperature_images` & `tl_driver_received_pts` (193,221 dòng):**
   - Lưu trữ hình ảnh đo nhiệt độ xe lạnh và trạng thái niêm phong `is_lost_seal` để xác định trách nhiệm của đơn vị vận tải.

5. **`krc_dashboard_slg_adjustments` (20,931 dòng):**
   - Bảng tổng hợp điều chỉnh giữa WMS và KDB (`wms`, `kdb`, `difference`, `tra_ton_st`, `tra_ton_seedlog`, `tt_cam_st`).

6. **`krc_datapay_records` & `krc_datapay_summary`:**
   - Hai bảng chuyên dụng vừa được thiết lập để lưu trữ toàn bộ dữ liệu đối soát Datapay tài chính từ 26/08 - 03/09/2026.
