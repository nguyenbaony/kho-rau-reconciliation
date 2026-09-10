# -*- coding: utf-8 -*-
"""
Dong bo du lieu Doi Soat Kho Rau & Datapay vao StarRocks
Database: kfm_scm
Host: 103.147.122.103:9030
"""
import os
import sys
import json
import uuid
from datetime import datetime
import pymysql

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, 'config.json')
DATA_DIR = os.path.join(SCRIPT_DIR, 'data')
RECORDS_FILE = os.path.join(DATA_DIR, 'reconciliation_records.json')
SUMMARY_FILE = os.path.join(DATA_DIR, 'datapay_summary.json')

def load_config():
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_connection(cfg):
    db_cfg = cfg.get('starrocks', {})
    return pymysql.connect(
        host=db_cfg.get('host', '103.147.122.103'),
        port=int(db_cfg.get('port', 9030)),
        user=db_cfg.get('user', 'kfm_scm_tho_nguyen'),
        password=db_cfg.get('password', 'oh1dtJwR4ihLGrX4E7bs'),
        database=db_cfg.get('database', 'kfm_scm'),
        charset='utf8mb4',
        connect_timeout=15,
        autocommit=True
    )

def init_tables(conn):
    print('==> [1/4] Kiem tra va khoi tao cac bang Datapay tren StarRocks...')
    with conn.cursor() as cur:
        cur.execute('''
        CREATE TABLE IF NOT EXISTS `krc_datapay_records` (
          `id` varchar(36) NOT NULL COMMENT 'Ma ban ghi UUID',
          `transfer_date` varchar(50) NULL COMMENT 'Ngay chuyen hang',
          `store_id` varchar(50) NULL COMMENT 'Ma sieu thi',
          `store_name` varchar(255) NULL COMMENT 'Ten chi nhanh',
          `area` varchar(100) NULL COMMENT 'Khu vuc',
          `sku` varchar(50) NULL COMMENT 'Ma hang',
          `product_name` varchar(255) NULL COMMENT 'Ten hang',
          `unit` varchar(50) NULL COMMENT 'DVT',
          `category_v2` varchar(100) NULL COMMENT 'Nhom hang CLV2',
          `to_order` varchar(100) NULL COMMENT 'Ma TO',
          `pt_transfer` varchar(100) NULL COMMENT 'Ma PT',
          `crate_code` varchar(50) NULL COMMENT 'Ma thung',
          `qty_transferred` double NULL DEFAULT '0' COMMENT 'SL chuyen',
          `qty_received` double NULL DEFAULT '0' COMMENT 'SL nhan',
          `qty_diff` double NULL DEFAULT '0' COMMENT 'SL chenh lech',
          `natural_loss_qty` double NULL DEFAULT '0' COMMENT 'SL hao hut',
          `store_return_qty` double NULL DEFAULT '0' COMMENT 'SL tra ton ST',
          `undetermined_qty` double NULL DEFAULT '0' COMMENT 'SL chua xac dinh',
          `cost_price` double NULL DEFAULT '0' COMMENT 'Don gia',
          `total_value` double NULL DEFAULT '0' COMMENT 'Tong gia tri VND',
          `loss_value` double NULL DEFAULT '0' COMMENT 'Gia tri hao hut VND',
          `store_penalty` double NULL DEFAULT '0' COMMENT 'Datapay phat Sieu thi',
          `warehouse_penalty` double NULL DEFAULT '0' COMMENT 'Datapay phat Kho rau DC',
          `undetermined_value` double NULL DEFAULT '0' COMMENT 'Gia tri CXD VND',
          `status` varchar(255) NULL COMMENT 'Trang thai',
          `error_type` varchar(255) NULL COMMENT 'Loai loi',
          `responsible_party` varchar(255) NULL COMMENT 'Trach nhiem xu ly',
          `dc_confirmation` varchar(255) NULL COMMENT 'DC xac nhan',
          `dc_note` varchar(1000) NULL COMMENT 'Ghi chu DC',
          `kfm_feedback` varchar(1000) NULL COMMENT 'KFM phan hoi',
          `image_link` varchar(1000) NULL COMMENT 'Link hinh anh',
          `gsm` varchar(255) NULL COMMENT 'GSM',
          `rsm` varchar(255) NULL COMMENT 'RSM',
          `created_by` varchar(50) NULL DEFAULT 'kfm_scm_tho_nguyen',
          `updated_at` datetime NULL
        ) ENGINE=OLAP
        PRIMARY KEY(`id`)
        DISTRIBUTED BY HASH(`id`) BUCKETS 4
        PROPERTIES ('replication_num' = '1');
        ''')
        cur.execute('''
        CREATE TABLE IF NOT EXISTS `krc_datapay_summary` (
          `report_id` varchar(64) NOT NULL COMMENT 'Ma ky bao cao',
          `generated_at` datetime NULL COMMENT 'Thoi gian chot bao cao',
          `total_records` bigint NULL DEFAULT '0' COMMENT 'Tong so ban ghi',
          `total_qty_transferred` double NULL DEFAULT '0' COMMENT 'Tong SL chuyen',
          `total_qty_received` double NULL DEFAULT '0' COMMENT 'Tong SL nhan',
          `total_qty_diff` double NULL DEFAULT '0' COMMENT 'Tong SL chenh lech',
          `total_natural_loss_vnd` double NULL DEFAULT '0' COMMENT 'Tong hao hut VND',
          `total_store_penalty_vnd` double NULL DEFAULT '0' COMMENT 'Tong phat ST VND',
          `total_warehouse_penalty_vnd` double NULL DEFAULT '0' COMMENT 'Tong phat Kho rau VND',
          `total_undetermined_vnd` double NULL DEFAULT '0' COMMENT 'Tong chua xac dinh VND',
          `grand_total_penalty_vnd` double NULL DEFAULT '0' COMMENT 'Tong tien phat Datapay VND',
          `updated_at` datetime NULL
        ) ENGINE=OLAP
        PRIMARY KEY(`report_id`)
        DISTRIBUTED BY HASH(`report_id`) BUCKETS 1
        PROPERTIES ('replication_num' = '1');
        ''')
    print('    -> Cac bang Datapay da san sang.')

def sync_summary(conn):
    print('==> [2/4] Dong bo bang tong hop krc_datapay_summary...')
    if not os.path.exists(SUMMARY_FILE):
        print('    -> Khong tim thay file summary.')
        return
    with open(SUMMARY_FILE, 'r', encoding='utf-8-sig') as f:
        summary = json.load(f)
    fin = summary.get('financial_summary', {})
    gen_at = summary.get('generated_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    report_id = f'SUM-{gen_at.replace(":", "").replace("-", "").replace(" ", "")}'
    sql = '''
    INSERT INTO `krc_datapay_summary` (
        report_id, generated_at, total_records, total_qty_transferred,
        total_qty_received, total_qty_diff, total_natural_loss_vnd,
        total_store_penalty_vnd, total_warehouse_penalty_vnd,
        total_undetermined_vnd, grand_total_penalty_vnd, updated_at
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    '''
    vals = (
        report_id, gen_at, summary.get('total_records', 0),
        summary.get('total_qty_transferred', 0), summary.get('total_qty_received', 0),
        summary.get('total_qty_diff', 0), fin.get('total_natural_loss_vnd', 0),
        fin.get('total_store_penalty_vnd', 0), fin.get('total_warehouse_penalty_vnd', 0),
        fin.get('total_undetermined_vnd', 0), fin.get('grand_total_penalty_vnd', 0),
        datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    )
    with conn.cursor() as cur:
        cur.execute(sql, vals)
    print(f'    -> Da luu ban ghi tong hop {report_id} - Tong phat: {fin.get("grand_total_penalty_vnd", 0):,} VND')

def sync_records(conn):
    print('==> [3/4] Dong bo danh sach chi tiet vao krc_datapay_records...')
    if not os.path.exists(RECORDS_FILE):
        print('    -> Khong tim thay file records.')
        return 0
    with open(RECORDS_FILE, 'r', encoding='utf-8-sig') as f:
        raw_records = json.load(f)
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    valid_rows_datapay = []
    valid_rows_discrepancies = []
    for r in raw_records:
        date_str = str(r.get('transfer_date', '')).strip()
        sku = str(r.get('sku', '')).strip()
        prod = str(r.get('product_name', '')).strip()
        if not sku or not prod or 'T?ng' in date_str or 'Tong' in date_str or 'T?ng' in sku or 'kho rau' in sku.lower() or date_str in ('Ngay', 'Ng?y', ''):
            continue
        seed = f"{date_str}_{r.get('store_id')}_{sku}_{r.get('pt_transfer')}_{r.get('to_order')}_{r.get('crate_code')}_{r.get('id')}"
        rec_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, seed))
        qty_trans = float(r.get('qty_transferred', 0) or 0)
        qty_rec = float(r.get('qty_received', 0) or 0)
        qty_diff = float(r.get('qty_diff', 0) or 0)
        loss_qty = float(r.get('natural_loss_qty', 0) or 0)
        st_ret_qty = float(r.get('store_return_qty', 0) or 0)
        undet_qty = float(r.get('undetermined_qty', 0) or 0)
        cost_price = float(r.get('cost_price', 0) or 0)
        tot_val = float(r.get('total_value', 0) or 0)
        loss_val = float(r.get('loss_value', 0) or 0)
        st_pen = float(r.get('store_penalty', 0) or 0)
        wh_pen = float(r.get('warehouse_penalty', 0) or 0)
        undet_val = float(r.get('undetermined_value', 0) or 0)
        pt_chuyen = f"{r.get('pt_transfer', '')} / {r.get('to_order', '')}".strip(' /')
        row_dp = (
            rec_id, date_str, r.get('store_id', ''), r.get('store_name', ''),
            r.get('area', ''), sku, prod, r.get('unit', ''),
            r.get('category_v2', ''), r.get('to_order', ''), r.get('pt_transfer', ''),
            r.get('crate_code', ''), qty_trans, qty_rec, qty_diff,
            loss_qty, st_ret_qty, undet_qty, cost_price, tot_val,
            loss_val, st_pen, wh_pen, undet_val, r.get('status', ''),
            r.get('error_type', ''), r.get('responsible_party', ''),
            r.get('dc_confirmation', ''), r.get('dc_note', ''),
            r.get('kfm_feedback', ''), r.get('image_link', ''),
            r.get('gsm', ''), r.get('rsm', ''), 'kfm_scm_tho_nguyen', now_str
        )
        valid_rows_datapay.append(row_dp)
        row_disc = (
            rec_id, r.get('handler', 'kfm_scm_tho_nguyen'), date_str,
            r.get('store_name', ''), r.get('store_id', ''), sku, prod,
            r.get('unit', ''), qty_trans, qty_rec, qty_diff, pt_chuyen,
            qty_rec, st_ret_qty, loss_qty, r.get('status', ''),
            r.get('error_type', ''), r.get('responsible_party', ''),
            r.get('image_link', ''), r.get('dc_confirmation', ''),
            r.get('dc_note', ''), r.get('kfm_feedback', ''),
            r.get('category_v2', ''), r.get('crate_code', ''),
            cost_price, tot_val, st_pen, wh_pen, undet_val,
            r.get('gsm', ''), r.get('rsm', ''), r.get('area', ''),
            'Dong bo tu Datapay Kho Rau', now_str
        )
        valid_rows_discrepancies.append(row_disc)
    total_valid = len(valid_rows_datapay)
    print(f'    -> Da chuan bi {total_valid} dong du lieu hop le de nap vao StarRocks...')
    dp_sql = '''
    INSERT INTO `krc_datapay_records` (
        id, transfer_date, store_id, store_name, area, sku, product_name,
        unit, category_v2, to_order, pt_transfer, crate_code, qty_transferred,
        qty_received, qty_diff, natural_loss_qty, store_return_qty,
        undetermined_qty, cost_price, total_value, loss_value, store_penalty,
        warehouse_penalty, undetermined_value, status, error_type,
        responsible_party, dc_confirmation, dc_note, kfm_feedback,
        image_link, gsm, rsm, created_by, updated_at
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    '''
    batch_size = 500
    with conn.cursor() as cur:
        for i in range(0, total_valid, batch_size):
            chunk = valid_rows_datapay[i:i + batch_size]
            cur.executemany(dp_sql, chunk)
            print(f'       [krc_datapay_records] Da nap {min(i + batch_size, total_valid)} / {total_valid} dong...')
    print('==> [4/4] Dong bo them vao bang krc_dashboard_discrepancies...')
    disc_sql = '''
    INSERT INTO `krc_dashboard_discrepancies` (
        id, nguoi_xu_ly, ngay, chi_nhanh, id_st, ma_hang, ten_hang,
        dvt, sl_chuyen, sl_nhan, chenh_lech, pt_chuyen_hang, sl_nhan_thuc,
        sl_bs_st, sl_cl_dxl, trang_thai, loi, xu_ly, link_hinh,
        dc_xac_nhan, note_dc, note_kfm, clv2, tote, don_gia, thanh_tien,
        tien_tra_st, tien_tra_dc, tien_con_lai, gsm, rsm, khu_vuc,
        tho_note, updated_at
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    '''
    with conn.cursor() as cur:
        for i in range(0, len(valid_rows_discrepancies), batch_size):
            chunk = valid_rows_discrepancies[i:i + batch_size]
            cur.executemany(disc_sql, chunk)
            print(f'       [krc_dashboard_discrepancies] Da nap {min(i + batch_size, total_valid)} / {total_valid} dong...')
    return total_valid

def main():
    print('=' * 65)
    print('  TIEN HANH KET NOI VA DONG BO DATAPAY VAO STARROCKS (kfm_scm)')
    print('=' * 65)
    cfg = load_config()
    db_info = cfg.get('starrocks', {})
    print(f'[*] Host: {db_info.get("host")}:{db_info.get("port")}')
    print(f'[*] Database: {db_info.get("database")} | User: {db_info.get("user")}')
    start_time = datetime.now()
    conn = get_connection(cfg)
    print('[+] Ket noi StarRocks thanh cong!')
    try:
        init_tables(conn)
        sync_summary(conn)
        count = sync_records(conn)
        duration = (datetime.now() - start_time).total_seconds()
        print('=' * 65)
        print(f'[THANH CONG] DA DONG BO {count:,} BAN GHI DATAPAY VAO STARROCKS!')
        print(f'[*] Thoi gian xu ly: {duration:.2f} giay')
        print('=' * 65)
    finally:
        conn.close()

if __name__ == '__main__':
    main()