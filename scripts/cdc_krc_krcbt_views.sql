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
-- ----------------------------------------------------------------------------------------
CREATE OR REPLACE VIEW `view_krc_krcbt_transfer_reconciliation` AS
SELECT
    CASE 
        WHEN t.source_location_id IN ('KRCBT', 'DC_KRCBT') OR t.ticket_code LIKE '%KRCBT%' THEN 'KRCBT'
        ELSE 'KRC'
    END AS warehouse_code,
    
    CASE 
        WHEN t.source_location_id IN ('KRCBT', 'DC_KRCBT') OR t.ticket_code LIKE '%KRCBT%' THEN 'Kho Rau Củ Bánh Tươi'
        ELSE 'Kho Rau Củ'
    END AS warehouse_name,

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

    l.id AS line_id,
    l.sku,
    l.barcode,
    l.product_name,
    l.uom,
    
    CASE 
        WHEN l.product_name LIKE '%BÁNH%' OR l.product_name LIKE '%BANH%' OR l.product_name LIKE '%SANDWICH%' 
             OR l.product_name LIKE '%CROISSANT%' OR l.product_name LIKE '%BREAD%' OR l.uom IN ('Khay', 'Cái', 'Ổ', 'Hộp') 
        THEN 'Bánh Tươi'
        ELSE 'Rau Củ Tươi Sống'
    END AS product_category,

    COALESCE(l.requested_qty, 0) AS qty_requested,
    COALESCE(l.shipped_qty, 0)   AS qty_transferred,
    COALESCE(l.received_qty, 0)  AS qty_received,
    (COALESCE(l.shipped_qty, 0) - COALESCE(l.received_qty, 0)) AS qty_diff,

    COALESCE(c.gia_cost, 6800.0) AS cost_price,
    (COALESCE(l.shipped_qty, 0) - COALESCE(l.received_qty, 0)) * COALESCE(c.gia_cost, 6800.0) AS total_diff_value,

    CASE 
        WHEN (l.product_name NOT LIKE '%BÁNH%' AND l.product_name NOT LIKE '%BANH%')
             AND (COALESCE(l.shipped_qty, 0) - COALESCE(l.received_qty, 0)) > 0
             AND (COALESCE(l.shipped_qty, 0) - COALESCE(l.received_qty, 0)) <= (COALESCE(l.shipped_qty, 0) * 0.03)
        THEN (COALESCE(l.shipped_qty, 0) - COALESCE(l.received_qty, 0)) * COALESCE(c.gia_cost, 6800.0)
        ELSE 0
    END AS natural_loss_vnd,

    CASE 
        WHEN (COALESCE(l.shipped_qty, 0) - COALESCE(l.received_qty, 0)) > 0
             AND (
                (l.product_name LIKE '%BÁNH%' OR l.product_name LIKE '%BANH%')
                OR (COALESCE(l.shipped_qty, 0) - COALESCE(l.received_qty, 0)) > (COALESCE(l.shipped_qty, 0) * 0.03)
             )
        THEN (
            (COALESCE(l.shipped_qty, 0) - COALESCE(l.received_qty, 0)) - 
            CASE WHEN (l.product_name NOT LIKE '%BÁNH%' AND l.product_name NOT LIKE '%BANH%') THEN (COALESCE(l.shipped_qty, 0) * 0.03) ELSE 0 END
        ) * COALESCE(c.gia_cost, 6800.0)
        ELSE 0
    END AS warehouse_penalty_vnd,

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
