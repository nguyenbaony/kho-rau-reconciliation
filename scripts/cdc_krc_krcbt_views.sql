-- ========================================================================================
-- STARROCKS OLAP: HỆ THỐNG VIEW ĐỐI SOÁT VẬN HÀNH & TÀI CHÍNH KRC & KRCBT TỪ 4 BẢNG CDC
-- 1. __cdc_kfm_kf_inventories_kf_inventory_transaction_stock_summaries
-- 2. __cdc_kfm_kf_inventories_kf_inventory_transaction_stockcard
-- 3. __cdc_kfm_kf_transfer_tickets_kf_transfer_tickets
-- 4. __cdc_kfm_kf_transfer_tickets_kf_transfer_ticket_lines
-- ========================================================================================

USE `kfm_scm`;

-- ----------------------------------------------------------------------------------------
-- VIEW 1: BÁO CÁO ĐỐI SOÁT ĐIỀU CHUYỂN TO/PT & CHẾ TÀI DATAPAY (KRC vs KRCBT)
-- Kết hợp Header phiếu điều chuyển và Chi tiết dòng hàng
-- ----------------------------------------------------------------------------------------
CREATE OR REPLACE VIEW `view_krc_krcbt_transfer_reconciliation` AS
SELECT
    -- Phân loại kho xuất phát
    CASE 
        WHEN t.source_location_id IN ('KRCBT', 'DC_KRCBT') OR t.ticket_code LIKE '%KRCBT%' THEN 'KRCBT'
        ELSE 'KRC'
    END AS warehouse_code,
    
    CASE 
        WHEN t.source_location_id IN ('KRCBT', 'DC_KRCBT') OR t.ticket_code LIKE '%KRCBT%' THEN 'Kho Rau Củ Bánh Tươi'
        ELSE 'Kho Rau Củ'
    END AS warehouse_name,

    -- Thông tin phiếu TO / PT
    t.id AS ticket_id,
    t.ticket_code AS to_order,
    t.ticket_type,
    t.destination_location_id AS store_id,
    t.status AS ticket_status,
    CAST(t.departure_time AS DATE) AS transfer_date,
    t.departure_time,
    t.arrival_time,
    t.driver_name,
    t.vehicle_plate,
    t.seal_number,

    -- Chi tiết mặt hàng (Lines)
    l.id AS line_id,
    l.sku,
    l.barcode,
    l.product_name,
    l.uom,
    
    -- Phân loại ngành hàng: Bánh Tươi vs Rau Củ
    CASE 
        WHEN l.product_name LIKE '%BÁNH%' OR l.product_name LIKE '%BANH%' OR l.product_name LIKE '%SANDWICH%' 
             OR l.product_name LIKE '%CROISSANT%' OR l.product_name LIKE '%BREAD%' OR l.uom IN ('Khay', 'Cái', 'Ổ', 'Hộp') 
        THEN 'Bánh Tươi'
        ELSE 'Rau Củ Tươi Sống'
    END AS product_category,

    -- Số lượng giao nhận
    COALESCE(l.requested_qty, 0) AS qty_requested,
    COALESCE(l.shipped_qty, 0)   AS qty_transferred,
    COALESCE(l.received_qty, 0)  AS qty_received,
    (COALESCE(l.shipped_qty, 0) - COALESCE(l.received_qty, 0)) AS qty_diff,

    -- Giá vốn (lấy từ giá vốn chuẩn hoặc fallback)
    COALESCE(c.gia_cost, 6800.0) AS cost_price,
    (COALESCE(l.shipped_qty, 0) - COALESCE(l.received_qty, 0)) * COALESCE(c.gia_cost, 6800.0) AS total_diff_value,

    -- Tính toán phân định trách nhiệm Datapay
    -- 1. Hao hụt tự nhiên (Chỉ áp dụng cho Rau Củ, định mức <= 3% sản lượng chuyển)
    CASE 
        WHEN (l.product_name NOT LIKE '%BÁNH%' AND l.product_name NOT LIKE '%BANH%')
             AND (COALESCE(l.shipped_qty, 0) - COALESCE(l.received_qty, 0)) > 0
             AND (COALESCE(l.shipped_qty, 0) - COALESCE(l.received_qty, 0)) <= (COALESCE(l.shipped_qty, 0) * 0.03)
        THEN (COALESCE(l.shipped_qty, 0) - COALESCE(l.received_qty, 0)) * COALESCE(c.gia_cost, 6800.0)
        ELSE 0
    END AS natural_loss_vnd,

    -- 2. Datapay Phạt Kho DC (Giao thiếu vượt định mức hoặc lỗi pick sai)
    CASE 
        WHEN (COALESCE(l.shipped_qty, 0) - COALESCE(l.received_qty, 0)) > 0
             AND (
                -- Nếu là Bánh tươi: không có hao hụt tự nhiên, tính toàn bộ phạt DC nếu lỗi giao thiếu
                (l.product_name LIKE '%BÁNH%' OR l.product_name LIKE '%BANH%')
                OR (COALESCE(l.shipped_qty, 0) - COALESCE(l.received_qty, 0)) > (COALESCE(l.shipped_qty, 0) * 0.03)
             )
        THEN (
            (COALESCE(l.shipped_qty, 0) - COALESCE(l.received_qty, 0)) - 
            CASE WHEN (l.product_name NOT LIKE '%BÁNH%' AND l.product_name NOT LIKE '%BANH%') THEN (COALESCE(l.shipped_qty, 0) * 0.03) ELSE 0 END
        ) * COALESCE(c.gia_cost, 6800.0)
        ELSE 0
    END AS warehouse_penalty_vnd,

    -- 3. Datapay Phạt Siêu Thị (ST nhập thiếu / kiểm sai quy trình / hư hỏng tại quầy)
    CASE 
        WHEN l.diff_reason IN ('ST nhập thiếu', 'ST kiểm sai QT', 'ST thông tin sai')
        THEN ABS(COALESCE(l.shipped_qty, 0) - COALESCE(l.received_qty, 0)) * COALESCE(c.gia_cost, 6800.0)
        ELSE 0
    END AS store_penalty_vnd,

    l.diff_reason,
    l.line_status

FROM `__cdc_kfm_kf_transfer_tickets_kf_transfer_tickets` t
JOIN `__cdc_kfm_kf_transfer_tickets_kf_transfer_ticket_lines` l ON t.id = l.ticket_id
LEFT JOIN `krc_cdc_cost_price` c ON l.sku = c.barcode
WHERE t.__deleted = 0 AND l.__deleted = 0;

-- ----------------------------------------------------------------------------------------
-- VIEW 2: BÁO CÁO THẺ KHO (STOCKCARD AUDIT) & CẢNH BÁO TỒN ÂM TẠI KRC & KRCBT
-- Kết hợp sổ cái giao dịch thẻ kho để lần vết luồng hàng và phát hiện lỗi âm kho
-- ----------------------------------------------------------------------------------------
CREATE OR REPLACE VIEW `view_krc_krcbt_stockcard_audit` AS
SELECT
    s.id AS transaction_id,
    CASE 
        WHEN s.warehouse_id IN ('KRCBT', 'DC_KRCBT') THEN 'KRCBT'
        ELSE 'KRC'
    END AS warehouse_code,
    s.warehouse_id,
    s.sku,
    s.transaction_type,
    s.reference_type,
    s.reference_id AS reference_ticket,
    s.quantity_change,
    s.balance_before,
    s.balance_after,
    s.cost_price,
    (s.quantity_change * s.cost_price) AS transaction_value_vnd,
    s.created_at AS transaction_time,
    
    -- Cảnh báo vi phạm
    CASE 
        WHEN s.balance_after < 0 THEN 'CẢNH BÁO: TỒN KHO ÂM'
        WHEN s.transaction_type IN ('WASTE_DISCARD', 'DAMAGE_DISCARD') THEN 'HỦY HÀNG HẾT DATE / DẬP NÁT'
        WHEN s.quantity_change < -500 THEN 'XUẤT ĐỘT BIẾN'
        ELSE 'BÌNH THƯỜNG'
    END AS audit_status
FROM `__cdc_kfm_kf_inventories_kf_inventory_transaction_stockcard` s
WHERE s.__deleted = 0
  AND s.warehouse_id IN ('KRC', 'KRCBT', 'DC_KRC', 'DC_KRCBT');

-- ----------------------------------------------------------------------------------------
-- VIEW 3: BÁO CÁO TỔNG HỢP CÂN BẰNG TỒN KHO HÀNG NGÀY (DAILY STOCK BALANCE)
-- Đối chiếu Tồn đầu + Nhập - Xuất vs Tồn cuối thực tế trên hệ thống
-- ----------------------------------------------------------------------------------------
CREATE OR REPLACE VIEW `view_krc_krcbt_daily_stock_balance` AS
SELECT
    b.summary_date,
    CASE 
        WHEN b.warehouse_id IN ('KRCBT', 'DC_KRCBT') THEN 'KRCBT'
        ELSE 'KRC'
    END AS warehouse_code,
    b.warehouse_id,
    b.sku,
    b.opening_qty,
    b.total_in_qty,
    b.total_out_qty,
    b.closing_qty,
    -- Tính toán kiểm tra tính toàn vẹn (Integrity Check)
    (b.opening_qty + b.total_in_qty - b.total_out_qty) AS calculated_closing_qty,
    (b.closing_qty - (b.opening_qty + b.total_in_qty - b.total_out_qty)) AS integrity_gap_qty,
    b.reserved_qty,
    b.available_qty,
    CASE 
        WHEN b.closing_qty < 0 THEN 'TỒN ÂM CUỐI NGÀY'
        WHEN ABS(b.closing_qty - (b.opening_qty + b.total_in_qty - b.total_out_qty)) > 0.001 THEN 'LỆCH ĐỒNG BỘ TOÀN VẸN'
        ELSE 'KHỚP CHUẨN'
    END AS balance_status
FROM `__cdc_kfm_kf_inventories_kf_inventory_transaction_stock_summaries` b
WHERE b.__deleted = 0
  AND b.warehouse_id IN ('KRC', 'KRCBT', 'DC_KRC', 'DC_KRCBT');

-- ----------------------------------------------------------------------------------------
-- VIEW 4: BÁO CÁO CHÊNH LỆCH HẰNG NGÀY (DAILY DISCREPANCY & RECONCILIATION REPORT)
-- Theo dõi 5 chỉ tiêu cốt lõi: Số phiếu, SL chênh lệch, SL dư (thừa), SL thiếu, Hao hụt
-- ----------------------------------------------------------------------------------------
CREATE OR REPLACE VIEW `view_daily_discrepancy_krc_krcbt` AS
SELECT
    t.transfer_date,
    t.warehouse_code,
    t.warehouse_name,
    
    -- 1. CHỈ TIÊU SỐ PHIẾU (KRC VÀ KRCBT)
    COUNT(DISTINCT t.ticket_code) AS total_tickets,
    COUNT(DISTINCT CASE WHEN l.diff_qty = 0 THEN t.ticket_code END) AS perfect_tickets,
    COUNT(DISTINCT CASE WHEN l.diff_qty != 0 THEN t.ticket_code END) AS discrepancy_tickets,
    ROUND(COUNT(DISTINCT CASE WHEN l.diff_qty = 0 THEN t.ticket_code END) * 100.0 / COUNT(DISTINCT t.ticket_code), 1) AS perfect_rate_pct,

    -- 2. CHỈ TIÊU TỔNG SẢN LƯỢNG & SL CHÊNH LỆCH
    ROUND(SUM(l.qty_transferred), 2) AS total_shipped_qty,
    ROUND(SUM(l.qty_received), 2)    AS total_received_qty,
    ROUND(SUM(ABS(l.qty_diff)), 2)   AS total_abs_diff_qty,
    ROUND(SUM(ABS(l.qty_diff) * l.cost_price), 0) AS total_diff_value_vnd,

    -- 3. CHỈ TIÊU SL DƯ (THỪA)
    ROUND(SUM(CASE WHEN l.qty_received > l.qty_transferred THEN (l.qty_received - l.qty_transferred) ELSE 0 END), 2) AS total_surplus_qty,
    ROUND(SUM(CASE WHEN l.qty_received > l.qty_transferred THEN (l.qty_received - l.qty_transferred) * l.cost_price ELSE 0 END), 0) AS total_surplus_value_vnd,
    COUNT(CASE WHEN l.qty_received > l.qty_transferred THEN 1 END) AS surplus_lines_count,

    -- 4. CHỈ TIÊU SL THIẾU (ĐÃ KHẤU TRỪ ĐỊNH MỨC)
    ROUND(SUM(CASE 
        WHEN l.qty_transferred > l.qty_received 
             AND (l.product_category = 'Bánh Tươi' OR (l.qty_transferred - l.qty_received) > (l.qty_transferred * 0.03))
        THEN (l.qty_transferred - l.qty_received - CASE WHEN l.product_category = 'Rau Củ Tươi Sống' THEN (l.qty_transferred * 0.03) ELSE 0 END)
        ELSE 0 
    END), 2) AS total_shortage_qty,
    ROUND(SUM(l.warehouse_penalty_vnd), 0) AS total_shortage_penalty_dc_vnd,
    ROUND(SUM(l.store_penalty_vnd), 0)     AS total_shortage_penalty_st_vnd,

    -- 5. CHỈ TIÊU HAO HỤT
    ROUND(SUM(CASE 
        WHEN l.product_category = 'Rau Củ Tươi Sống' AND (l.qty_transferred > l.qty_received)
        THEN LEAST(l.qty_transferred - l.qty_received, l.qty_transferred * 0.03)
        ELSE 0 
    END), 2) AS natural_loss_qty,
    ROUND(SUM(l.natural_loss_vnd), 0) AS natural_loss_vnd,
    ROUND(SUM(CASE WHEN l.diff_reason IN ('Dập nát', 'Bể bánh', 'Hỏng nhiệt độ') THEN ABS(l.qty_diff) ELSE 0 END), 2) AS damage_waste_qty

FROM `view_krc_krcbt_transfer_reconciliation` l
JOIN (
    SELECT id, ticket_code, CAST(departure_time AS DATE) AS transfer_date,
           CASE WHEN source_location_id LIKE '%KRCBT%' OR ticket_code LIKE '%KRCBT%' THEN 'KRCBT' ELSE 'KRC' END AS warehouse_code,
           CASE WHEN source_location_id LIKE '%KRCBT%' OR ticket_code LIKE '%KRCBT%' THEN 'Kho Bánh Tươi' ELSE 'Kho Rau Củ' END AS warehouse_name
    FROM `__cdc_kfm_kf_transfer_tickets_kf_transfer_tickets`
    WHERE __deleted = 0
) t ON l.ticket_id = t.id
GROUP BY t.transfer_date, t.warehouse_code, t.warehouse_name
ORDER BY t.transfer_date DESC, t.warehouse_code ASC;

