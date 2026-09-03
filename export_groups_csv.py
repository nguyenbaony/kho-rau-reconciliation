import os
import sys
import json
import csv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

SOURCE_FILE = r"C:\Users\longa\.gemini\antigravity-ide\scratch\kho-rau-reconciliation\telegram_groups_analysis.json"
DESKTOP_DIR = r"C:\Users\longa\Desktop\ĐỐI SOÁT KHO RAU"
OUT_CSV = os.path.join(DESKTOP_DIR, "Danh_Sach_459_Group_Telegram.csv")
OUT_CSV_LOCAL = r"C:\Users\longa\.gemini\antigravity-ide\scratch\kho-rau-reconciliation\Danh_Sach_459_Group_Telegram.csv"

with open(SOURCE_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

rows = []
stt = 1

for g in data.get("krc_groups", []):
    rows.append({
        "STT": stt,
        "Phân Loại": "1. Kho Rau Củ (KRC)",
        "Tên Group": g["title"],
        "Group ID": g["id"],
        "Tin Chưa Đọc": g.get("unread_count", 0),
        "Loại": "Kênh/Supergroup" if g.get("is_channel") else "Nhóm chat"
    })
    stt += 1

for g in data.get("aba_groups", []):
    rows.append({
        "STT": stt,
        "Phân Loại": "2. Kho ABA (ABA)",
        "Tên Group": g["title"],
        "Group ID": g["id"],
        "Tin Chưa Đọc": g.get("unread_count", 0),
        "Loại": "Kênh/Supergroup" if g.get("is_channel") else "Nhóm chat"
    })
    stt += 1

for g in data.get("other_groups", []):
    rows.append({
        "STT": stt,
        "Phân Loại": "3. Nhóm Khác",
        "Tên Group": g["title"],
        "Group ID": g["id"],
        "Tin Chưa Đọc": g.get("unread_count", 0),
        "Loại": "Kênh/Supergroup" if g.get("is_channel") else "Nhóm chat"
    })
    stt += 1

fieldnames = ["STT", "Phân Loại", "Tên Group", "Group ID", "Tin Chưa Đọc", "Loại"]

for out_path in [OUT_CSV, OUT_CSV_LOCAL]:
    try:
        with open(out_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        print(f"Exported successfully to: {out_path}")
    except Exception as e:
        print(f"Error exporting to {out_path}: {e}")
