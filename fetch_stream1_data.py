import json
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

# GROUND-TRUTH SCM BENCHMARKS FOR 01/09 - 15/09/2026 (TUẦN 36 - 38)
# SỐ LIỆU ĐỐI SOÁT CHÍNH THỨC KHO RAU CỦ (KRC)
# BẢNG 1: BY QUANTITY (SỐ LƯỢNG KG)
QUANTITY_DATA = [
    {"day": "01/09", "phieu": 52, "sl_chuyen": 17118.2, "sl_nhan": 17083.1, "cl_thieu": -49.3, "cl_thua": 7.9, "tong_cl": 57.2, "hao_hut": 30.2, "bs_cho_st": 130.2, "tra_ton_dc": 779.6, "rut_ton_st": 93.0, "write_off": 9.0, "chua_xu_ly": 0.0},
    {"day": "02/09", "phieu": 446, "sl_chuyen": 169696.7, "sl_nhan": 169103.5, "cl_thieu": -829.4, "cl_thua": 236.2, "tong_cl": 1065.6, "hao_hut": 41.6, "bs_cho_st": 109.2, "tra_ton_dc": 678.6, "rut_ton_st": 0.0, "write_off": 0.0, "chua_xu_ly": 0.0},
    {"day": "03/09", "phieu": 446, "sl_chuyen": 126499.4, "sl_nhan": 125883.6, "cl_thieu": -874.7, "cl_thua": 260.0, "tong_cl": 1134.7, "hao_hut": 35.3, "bs_cho_st": 253.4, "tra_ton_dc": 586.0, "rut_ton_st": 109.0, "write_off": 0.0, "chua_xu_ly": 0.0},
    {"day": "04/09", "phieu": 446, "sl_chuyen": 144650.7, "sl_nhan": 144257.0, "cl_thieu": -626.7, "cl_thua": 233.0, "tong_cl": 859.7, "hao_hut": 28.1, "bs_cho_st": 24.3, "tra_ton_dc": 574.3, "rut_ton_st": 5.0, "write_off": 0.0, "chua_xu_ly": 0.0},
    {"day": "05/09", "phieu": 448, "sl_chuyen": 159479.1, "sl_nhan": 158779.7, "cl_thieu": -854.0, "cl_thua": 154.6, "tong_cl": 1008.6, "hao_hut": 48.5, "bs_cho_st": 66.5, "tra_ton_dc": 727.2, "rut_ton_st": 5.0, "write_off": 0.0, "chua_xu_ly": 6.8},
    {"day": "06/09", "phieu": 448, "sl_chuyen": 169231.9, "sl_nhan": 168628.8, "cl_thieu": -767.3, "cl_thua": 164.2, "tong_cl": 931.5, "hao_hut": 43.7, "bs_cho_st": 153.5, "tra_ton_dc": 568.0, "rut_ton_st": 5.0, "write_off": 2.0, "chua_xu_ly": 0.0},
    {"day": "07/09", "phieu": 448, "sl_chuyen": 142016.7, "sl_nhan": 141547.1, "cl_thieu": -822.4, "cl_thua": 352.8, "tong_cl": 1175.2, "hao_hut": 45.1, "bs_cho_st": 57.3, "tra_ton_dc": 686.0, "rut_ton_st": 8.9, "write_off": 34.0, "chua_xu_ly": 0.0},
    {"day": "08/09", "phieu": 448, "sl_chuyen": 150269.6, "sl_nhan": 149495.7, "cl_thieu": -1335.2, "cl_thua": 589.3, "tong_cl": 1924.5, "hao_hut": 38.2, "bs_cho_st": 143.4, "tra_ton_dc": 1151.6, "rut_ton_st": 200.6, "write_off": 2.0, "chua_xu_ly": 0.0},
    {"day": "09/09", "phieu": 558, "sl_chuyen": 173607.2, "sl_nhan": 172938.6, "cl_thieu": -1083.6, "cl_thua": 411.0, "tong_cl": 1494.6, "hao_hut": 67.8, "bs_cho_st": 247.7, "tra_ton_dc": 762.3, "rut_ton_st": 8.0, "write_off": 5.7, "chua_xu_ly": 0.0},
    {"day": "10/09", "phieu": 448, "sl_chuyen": 161934.5, "sl_nhan": 161087.7, "cl_thieu": -1095.3, "cl_thua": 248.5, "tong_cl": 1343.8, "hao_hut": 87.3, "bs_cho_st": 68.2, "tra_ton_dc": 939.7, "rut_ton_st": 0.0, "write_off": 0.0, "chua_xu_ly": 0.0},
    {"day": "11/09", "phieu": 448, "sl_chuyen": 146991.6, "sl_nhan": 146478.3, "cl_thieu": -754.5, "cl_thua": 241.3, "tong_cl": 995.8, "hao_hut": 64.1, "bs_cho_st": 18.1, "tra_ton_dc": 668.6, "rut_ton_st": 38.1, "write_off": 3.8, "chua_xu_ly": 0.0},
    {"day": "12/09", "phieu": 450, "sl_chuyen": 159213.0, "sl_nhan": 158696.7, "cl_thieu": -684.3, "cl_thua": 168.0, "tong_cl": 852.2, "hao_hut": 48.6, "bs_cho_st": 1.0, "tra_ton_dc": 628.7, "rut_ton_st": 0.0, "write_off": 0.0, "chua_xu_ly": 6.0},
    {"day": "13/09", "phieu": 450, "sl_chuyen": 162188.1, "sl_nhan": 161566.6, "cl_thieu": -838.8, "cl_thua": 217.3, "tong_cl": 1056.1, "hao_hut": 66.5, "bs_cho_st": 62.0, "tra_ton_dc": 707.1, "rut_ton_st": 0.0, "write_off": 3.2, "chua_xu_ly": 0.0},
    {"day": "14/09", "phieu": 450, "sl_chuyen": 138084.5, "sl_nhan": 137385.4, "cl_thieu": -958.5, "cl_thua": 232.4, "tong_cl": 1190.9, "hao_hut": 51.2, "bs_cho_st": 18.8, "tra_ton_dc": 888.1, "rut_ton_st": 5.0, "write_off": 0.3, "chua_xu_ly": 0.0},
    {"day": "15/09", "phieu": 450, "sl_chuyen": 143524.5, "sl_nhan": 143097.4, "cl_thieu": -605.2, "cl_thua": 178.1, "tong_cl": 783.3, "hao_hut": 79.5, "bs_cho_st": 15.4, "tra_ton_dc": 508.2, "rut_ton_st": 0.0, "write_off": 0.0, "chua_xu_ly": 2.0}
]

# BẢNG 2: BY AMOUNT (GIÁ NHẬP THEO 1985 SKU - ĐƠN VỊ VNĐ)
AMOUNT_DATA = [
    {"day": "01/09", "phieu": 52, "gt_chuyen": 2158953011, "gt_nhan": 2139602519, "cl_thieu": -19350492, "cl_thua": 163302, "tong_cl": 19513794, "hao_hut": 627052, "bs_cho_st": 2705875, "tra_ton_dc": 16197687, "rut_ton_st": 1932204},
    {"day": "02/09", "phieu": 446, "gt_chuyen": 2044179244, "gt_nhan": 2029426809, "cl_thieu": -14752435, "cl_thua": 4907798, "tong_cl": 19660233, "hao_hut": 864318, "bs_cho_st": 2268366, "tra_ton_dc": 14099272, "rut_ton_st": 0},
    {"day": "03/09", "phieu": 446, "gt_chuyen": 1993228337, "gt_nhan": 1977295237, "cl_thieu": -15933100, "cl_thua": 5401030, "tong_cl": 21334130, "hao_hut": 733282, "bs_cho_st": 5265360, "tra_ton_dc": 12175378, "rut_ton_st": 2264626},
    {"day": "04/09", "phieu": 446, "gt_chuyen": 2107984127, "gt_nhan": 2097766573, "cl_thieu": -10217554, "cl_thua": 4840898, "tong_cl": 15058452, "hao_hut": 583089, "bs_cho_st": 504970, "tra_ton_dc": 11931671, "rut_ton_st": 103882},
    {"day": "05/09", "phieu": 448, "gt_chuyen": 2338791119, "gt_nhan": 2323787295, "cl_thieu": -15003824, "cl_thua": 3211614, "tong_cl": 18215438, "hao_hut": 1007779, "bs_cho_st": 1381318, "tra_ton_dc": 15108277, "rut_ton_st": 103882},
    {"day": "06/09", "phieu": 448, "gt_chuyen": 2536323487, "gt_nhan": 2521140722, "cl_thieu": -15182765, "cl_thua": 3411067, "tong_cl": 18593832, "hao_hut": 908780, "bs_cho_st": 3189383, "tra_ton_dc": 11802006, "rut_ton_st": 103882},
    {"day": "07/09", "phieu": 448, "gt_chuyen": 2173293809, "gt_nhan": 2158800827, "cl_thieu": -14492982, "cl_thua": 7329286, "tong_cl": 21822268, "hao_hut": 937264, "bs_cho_st": 1189656, "tra_ton_dc": 14253225, "rut_ton_st": 185741},
    {"day": "08/09", "phieu": 448, "gt_chuyen": 2208174087, "gt_nhan": 2184335716, "cl_thieu": -23838371, "cl_thua": 12243109, "tong_cl": 36081480, "hao_hut": 794406, "bs_cho_st": 2978814, "tra_ton_dc": 23925775, "rut_ton_st": 4166912},
    {"day": "09/09", "phieu": 558, "gt_chuyen": 2876784040, "gt_nhan": 2855660984, "cl_thieu": -21123056, "cl_thua": 8539095, "tong_cl": 29662151, "hao_hut": 1409512, "bs_cho_st": 5147038, "tra_ton_dc": 15837445, "rut_ton_st": 166211},
    {"day": "10/09", "phieu": 448, "gt_chuyen": 2673891435, "gt_nhan": 2656565601, "cl_thieu": -17325834, "cl_thua": 5162932, "tong_cl": 22488766, "hao_hut": 1814714, "bs_cho_st": 1417781, "tra_ton_dc": 19524610, "rut_ton_st": 0},
    {"day": "11/09", "phieu": 448, "gt_chuyen": 2270621732, "gt_nhan": 2256202315, "cl_thieu": -14419417, "cl_thua": 5012719, "tong_cl": 19432136, "hao_hut": 1332120, "bs_cho_st": 375014, "tra_ton_dc": 13891383, "rut_ton_st": 790749},
    {"day": "12/09", "phieu": 450, "gt_chuyen": 2445963457, "gt_nhan": 2434019110, "cl_thieu": -11944347, "cl_thua": 3489602, "tong_cl": 15433949, "hao_hut": 1010127, "bs_cho_st": 20776, "tra_ton_dc": 13061387, "rut_ton_st": 0},
    {"day": "13/09", "phieu": 450, "gt_chuyen": 2480900135, "gt_nhan": 2465751991, "cl_thieu": -15148144, "cl_thua": 4514709, "tong_cl": 19662853, "hao_hut": 1381193, "bs_cho_st": 1288136, "tra_ton_dc": 14690838, "rut_ton_st": 0},
    {"day": "14/09", "phieu": 450, "gt_chuyen": 2011659864, "gt_nhan": 1994775191, "cl_thieu": -16884673, "cl_thua": 4829159, "tong_cl": 21713832, "hao_hut": 1064374, "bs_cho_st": 390596, "tra_ton_dc": 18452029, "rut_ton_st": 103882},
    {"day": "15/09", "phieu": 450, "gt_chuyen": 2149391245, "gt_nhan": 2138580345, "cl_thieu": -10810900, "cl_thua": 3701209, "tong_cl": 14512109, "hao_hut": 1652533, "bs_cho_st": 320372, "tra_ton_dc": 10559391, "rut_ton_st": 0}
]

# HÌNH 2: 9 NHÓM PHÂN LOẠI LỖI (CỘT V GSHEET) - 01/09 - 15/09 (TUẦN 36 - 38)
ERROR_CATEGORIES_DATA = [
    {"stt": 1, "loi": "DC giao thiếu", "tuan": "01/09-15/09 (Tuần 36-38)", "sl_case": 6884, "sl_lech": 16502.901, "gia_tri": 263284281, "ty_le": 69.57, "cai_thien": 88.7, "danh_gia": "Kiểm soát tốt"},
    {"stt": 2, "loi": "VT giao sai điểm", "tuan": "01/09-15/09 (Tuần 36-38)", "sl_case": 703, "sl_lech": 2368.040, "gia_tri": 46530157, "ty_le": 9.98, "cai_thien": 70.4, "danh_gia": "Kiểm soát tốt"},
    {"stt": 3, "loi": "Hao hụt", "tuan": "01/09-15/09 (Tuần 36-38)", "sl_case": 13328, "sl_lech": 1384.621, "gia_tri": 47562248, "ty_le": 5.84, "cai_thien": 83.7, "danh_gia": "Kiểm soát tốt"},
    {"stt": 4, "loi": "ST nhập thiếu", "tuan": "01/09-15/09 (Tuần 36-38)", "sl_case": 336, "sl_lech": 1179.776, "gia_tri": 24775261, "ty_le": 4.97, "cai_thien": 92.4, "danh_gia": "Kiểm soát tốt"},
    {"stt": 5, "loi": "DC Pick sai", "tuan": "01/09-15/09 (Tuần 36-38)", "sl_case": 124, "sl_lech": 926.460, "gia_tri": 15010608, "ty_le": 3.91, "cai_thien": 100.0, "danh_gia": "Kiểm soát tốt"},
    {"stt": 6, "loi": "DC giao bù", "tuan": "01/09-15/09 (Tuần 36-38)", "sl_case": 125, "sl_lech": 741.400, "gia_tri": 12263332, "ty_le": 3.13, "cai_thien": 100.0, "danh_gia": "Kiểm soát tốt"},
    {"stt": 7, "loi": "DC thao tác sai", "tuan": "01/09-15/09 (Tuần 36-38)", "sl_case": 82, "sl_lech": 339.400, "gia_tri": 5369936, "ty_le": 1.43, "cai_thien": 100.0, "danh_gia": "Kiểm soát tốt"},
    {"stt": 8, "loi": "ST thông tin sai/không phản hồi", "tuan": "01/09-15/09 (Tuần 36-38)", "sl_case": 30, "sl_lech": 148.800, "gia_tri": 4416262, "ty_le": 0.63, "cai_thien": 100.0, "danh_gia": "Kiểm soát tốt"},
    {"stt": 9, "loi": "ST kiểm sai QT", "tuan": "01/09-15/09 (Tuần 36-38)", "sl_case": 153, "sl_lech": 128.590, "gia_tri": 3036146, "ty_le": 0.54, "cai_thien": 99.1, "danh_gia": "Kiểm soát tốt"}
]

# TOP CÁC VẤN ĐỀ LỖI TĂNG / CHƯA CẢI THIỆN (HÌNH 2)
TOP_UNRESOLVED = [
    {
        "rank": "TOP 1",
        "loi": "DC giao thiếu",
        "so_phieu_anh_huong": 1893,
        "so_ch_anh_huong": 224,
        "gia_tri_chua_cai_thien": 9158392,
        "ty_le_chua_xl": 3.5,
        "muc_do_uu_tien": "Ưu tiên 1 (Gấp)"
    }
]

def generate_stream1():
    print("=== [LUỒNG 1] KHỞI TẠO DỮ LIỆU ĐỐI SOÁT CHUẨN SCM (15 NGÀY TỪ 01/09 ĐẾN 15/09/2026) ===")
    
    # Tính toán tổng hợp By Quantity
    tot_phieu = sum(r["phieu"] for r in QUANTITY_DATA)
    tot_chuyen = sum(r["sl_chuyen"] for r in QUANTITY_DATA)
    tot_nhan = sum(r["sl_nhan"] for r in QUANTITY_DATA)
    tot_thieu = sum(r["cl_thieu"] for r in QUANTITY_DATA)
    tot_thua = sum(r["cl_thua"] for r in QUANTITY_DATA)
    tot_cl = sum(r["tong_cl"] for r in QUANTITY_DATA)
    tot_hao_hut = sum(r["hao_hut"] for r in QUANTITY_DATA)
    tot_bs = sum(r["bs_cho_st"] for r in QUANTITY_DATA)
    tot_tra_dc = sum(r["tra_ton_dc"] for r in QUANTITY_DATA)
    tot_rut_st = sum(r["rut_ton_st"] for r in QUANTITY_DATA)
    tot_wo = sum(r["write_off"] for r in QUANTITY_DATA)
    tot_chua_xl = sum(r["chua_xu_ly"] for r in QUANTITY_DATA)
    tot_da_xl = tot_cl - tot_chua_xl

    # Format timeline_days backward compatible with existing UI
    timeline_days = []
    completed_days = 0
    for r in QUANTITY_DATA:
        pct = 100 if r["chua_xu_ly"] == 0 else round((r["tong_cl"] - r["chua_xu_ly"]) / r["tong_cl"] * 100)
        if pct == 100:
            completed_days += 1
        timeline_days.append({
            "day": r["day"],
            "phieu": r["phieu"],
            "sl_chuyen": r["sl_chuyen"],
            "sl_nhan": r["sl_nhan"],
            "cl_thieu": abs(r["cl_thieu"]),
            "cl_thieu_raw": r["cl_thieu"],
            "cl_thua": r["cl_thua"],
            "tong_cl": r["tong_cl"],
            "hao_hut": r["hao_hut"],
            "bs_cho_st": r["bs_cho_st"],
            "tra_ton_dc": r["tra_ton_dc"],
            "rut_ton_st": r["rut_ton_st"],
            "write_off": r["write_off"],
            "chua_xu_ly": r["chua_xu_ly"],
            "da_xu_ly": round(r["tong_cl"] - r["chua_xu_ly"], 1),
            "con_lai": r["chua_xu_ly"],
            "status": "Hoàn thành" if pct == 100 else "Đang xử lý",
            "tien_do": pct
        })

    # Tính toán tổng hợp By Amount
    tot_gt_chuyen = sum(r["gt_chuyen"] for r in AMOUNT_DATA)
    tot_gt_nhan = sum(r["gt_nhan"] for r in AMOUNT_DATA)
    tot_gt_thieu = sum(r["cl_thieu"] for r in AMOUNT_DATA)
    tot_gt_thua = sum(r["cl_thua"] for r in AMOUNT_DATA)
    tot_gt_cl = sum(r["tong_cl"] for r in AMOUNT_DATA)
    tot_gt_hao_hut = sum(r["hao_hut"] for r in AMOUNT_DATA)
    tot_gt_bs = sum(r["bs_cho_st"] for r in AMOUNT_DATA)
    tot_gt_tra_dc = sum(r["tra_ton_dc"] for r in AMOUNT_DATA)
    tot_gt_rut_st = sum(r["rut_ton_st"] for r in AMOUNT_DATA)

    timeline_amount = []
    for r in AMOUNT_DATA:
        timeline_amount.append({
            "day": r["day"],
            "phieu": r["phieu"],
            "gt_chuyen": r["gt_chuyen"],
            "gt_nhan": r["gt_nhan"],
            "cl_thieu": r["cl_thieu"],
            "cl_thua": r["cl_thua"],
            "tong_cl": r["tong_cl"],
            "hao_hut": r["hao_hut"],
            "bs_cho_st": r["bs_cho_st"],
            "tra_ton_dc": r["tra_ton_dc"],
            "rut_ton_st": r["rut_ton_st"]
        })

    # Summary 5 KPI cards lỗi (Hình 2)
    tot_err_cases = sum(r["sl_case"] for r in ERROR_CATEGORIES_DATA)
    tot_err_qty = sum(r["sl_lech"] for r in ERROR_CATEGORIES_DATA)
    tot_err_val = sum(r["gia_tri"] for r in ERROR_CATEGORIES_DATA)

    stream1_output = {
        "generated_at": "2026-09-15 19:15:00",
        "scope": "01/09/2026 - 15/09/2026 (Tuần 36-38)",
        "timeline_summary": {
            "tong_so_ngay": len(QUANTITY_DATA),
            "hoan_thanh_100": completed_days,
            "dang_xu_ly": len(QUANTITY_DATA) - completed_days,
            "ty_le_hoan_thanh_chung": round(tot_da_xl / tot_cl * 100),
            "tong_phieu": tot_phieu,
            "tong_sl_chuyen": round(tot_chuyen, 1),
            "tong_sl_nhan": round(tot_nhan, 1),
            "tong_cl_thieu": round(tot_thieu, 1),
            "tong_cl_thua": round(tot_thua, 1),
            "tong_cl": round(tot_cl, 1),
            "tong_hao_hut": round(tot_hao_hut, 1),
            "tong_bs_cho_st": round(tot_bs, 1),
            "tong_tra_ton_dc": round(tot_tra_dc, 1),
            "tong_rut_ton_st": round(tot_rut_st, 1),
            "tong_write_off": round(tot_wo, 1),
            "tong_da_xu_ly": round(tot_da_xl, 1),
            "tong_chua_xu_ly": round(tot_chua_xl, 1),
            "tong_con_lai": round(tot_chua_xl, 1),
            # By Amount Summary
            "tong_gt_chuyen": tot_gt_chuyen,
            "tong_gt_nhan": tot_gt_nhan,
            "tong_gt_cl_thieu": tot_gt_thieu,
            "tong_gt_cl_thua": tot_gt_thua,
            "tong_gt_cl": tot_gt_cl,
            "tong_gt_hao_hut": tot_gt_hao_hut,
            "tong_gt_bs_cho_st": tot_gt_bs,
            "tong_gt_tra_ton_dc": tot_gt_tra_dc,
            "tong_gt_rut_ton_st": tot_gt_rut_st
        },
        "timeline_days": timeline_days,
        "timeline_quantity": QUANTITY_DATA,
        "timeline_amount": timeline_amount,
        "timeline_future": [
            {"label": "16-Thg9"}
        ],
        "error_summary": {
            "tong_so_vu_loi": tot_err_cases,       # 21,765 dòng
            "tong_sl_chenh_lech": round(tot_err_qty, 3), # 23,719.988
            "tong_gia_tri_that_thoat": tot_err_val,     # 422,248,231 VNĐ
            "top_van_de_loi": "DC giao thiếu",
            "top_van_de_pct": 69.57,
            "top_van_de_sl": 16502.901,
            "ton_dong_chua_cai_thien": 9158392,         # 9,158,392 VNĐ
            "ton_dong_pct": 2.0                        # 2% tổng phát sinh
        },
        "error_categories": ERROR_CATEGORIES_DATA,
        "top_unresolved_issues": TOP_UNRESOLVED
    }

    out_file = os.path.join(DATA_DIR, "stream1_timeline.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(stream1_output, f, ensure_ascii=False, indent=2)

    print(f"  -> Đã tạo stream1_timeline.json thành công!")
    print(f"     + Tổng số phiếu: {tot_phieu} (Ngày 15/09 = 450 phiếu)")
    print(f"     + Tổng SL chuyển: {tot_chuyen:,.1f} | SL nhận: {tot_nhan:,.1f} | Tổng CL: {tot_cl:,.1f}")
    print(f"     + Tổng GT chuyển: {tot_gt_chuyen:,} VNĐ | GT nhận: {tot_gt_nhan:,} VNĐ")
    print(f"     + Tổng số vụ lỗi (Cột V): {tot_err_cases:,} dòng | SL lệch: {tot_err_qty:,.3f} | Thất thoát: {tot_err_val:,} VNĐ")

if __name__ == "__main__":
    generate_stream1()
