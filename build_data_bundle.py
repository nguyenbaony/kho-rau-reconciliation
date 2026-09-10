import json
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

s1_path = os.path.join(DATA_DIR, "stream1_timeline.json")
s2_path = os.path.join(DATA_DIR, "stream2_krc_analytics.json")
bundle_path = os.path.join(DATA_DIR, "data_bundle.js")

def build_bundle():
    print("=== TẠO BUNDLE DỮ LIỆU REALTIME CHO GITHUB PAGES & OFFLINE PREVIEW ===")
    s1_data = {}
    s2_data = {}

    if os.path.exists(s1_path):
        with open(s1_path, "r", encoding="utf-8") as f:
            s1_data = json.load(f)
        print(f"  -> Đã nạp Stream 1 ({len(s1_data.get('timeline_days', []))} ngày, {len(s1_data.get('error_categories', []))} nhóm lỗi)")
    else:
        print("  -> Cảnh báo: Không tìm thấy stream1_timeline.json")

    if os.path.exists(s2_path):
        with open(s2_path, "r", encoding="utf-8") as f:
            s2_data = json.load(f)
        print(f"  -> Đã nạp Stream 2 ({len(s2_data.get('products', []))} SKU KRC)")
    else:
        print("  -> Cảnh báo: Không tìm thấy stream2_krc_analytics.json")

    js_content = f"""// Auto-generated Realtime Data Bundle for KRC Dual Pipeline Engine
// Generated at: {s1_data.get('generated_at', '')} | CDC Status: Connected
window.STREAM1_DATA = {json.dumps(s1_data, ensure_ascii=False, indent=2)};

window.STREAM2_DATA = {json.dumps(s2_data, ensure_ascii=False, indent=2)};
"""

    with open(bundle_path, "w", encoding="utf-8") as f:
        f.write(js_content)

    print(f"  -> Đã ghi bundle hoàn chỉnh vào: {bundle_path} ({os.path.getsize(bundle_path)} bytes)")

if __name__ == "__main__":
    build_bundle()
