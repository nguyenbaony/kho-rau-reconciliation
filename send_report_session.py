import os
import sys
import json
import asyncio
from datetime import datetime
from telethon import TelegramClient

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

API_ID = 36940234
API_HASH = "865e54052693f4e96cbb0a7a5c18ede6"

SESSION_DIR = os.path.dirname(os.path.abspath(__file__))
SESSION_FILE = os.path.join(SESSION_DIR, "ny_personal_session")
SUMMARY_FILE = os.path.join(SESSION_DIR, "data", "datapay_summary.json")

def format_vnd(val):
    try:
        return f"{int(val):,}".replace(",", ".")
    except:
        return str(val)

async def send_report(target="me"):
    client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
    await client.connect()

    if not await client.is_user_authorized():
        print("Lỗi: Session chưa được xác thực!")
        await client.disconnect()
        return False

    summary = {
        "total_records": 6384,
        "total_qty_diff": 7245.60,
        "financial_summary": {
            "total_natural_loss_vnd": 13744798,
            "total_warehouse_penalty_vnd": 99854622,
            "total_store_penalty_vnd": 19659253,
            "total_undetermined_vnd": 0
        }
    }

    if os.path.exists(SUMMARY_FILE):
        try:
            with open(SUMMARY_FILE, "r", encoding="utf-8-sig") as f:
                summary = json.load(f)
        except Exception as e:
            print("Lỗi đọc summary file:", e)

    now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    fin = summary.get("financial_summary", {})

    msg = (
        "🥦 <b>BÁO CÁO ĐỐI SOÁT KHO RAU - THÁNG 09.2026</b>\n"
        f"⏰ <i>Cập nhật: {now_str}</i>\n"
        "━━━━━━━━━━━━━━━━━━━\n"
        f"📦 <b>Tổng số dòng đối soát:</b> {summary.get('total_records', 0):,} dòng\n"
        f"⚖️ <b>Tổng lượng chênh lệch:</b> {summary.get('total_qty_diff', 0):,.2f} KG/Pack\n\n"
        "💰 <b>TỔNG HỢP DATAPAY TÀI CHÍNH:</b>\n"
        f"• 📉 <b>Hao hụt tự nhiên:</b> {format_vnd(fin.get('total_natural_loss_vnd', 0))} đ\n"
        f"• 🏭 <b>Phạt Kho Rau (DC):</b> {format_vnd(fin.get('total_warehouse_penalty_vnd', 0))} đ\n"
        f"• 🏪 <b>Phạt Siêu Thị (ST):</b> {format_vnd(fin.get('total_store_penalty_vnd', 0))} đ\n"
        f"• ❓ <b>Chưa xác định:</b> {format_vnd(fin.get('total_undetermined_vnd', 0))} đ\n"
        "━━━━━━━━━━━━━━━━━━━\n"
        "🌐 <b>Xem Web Dashboard:</b>\n"
        "https://nguyenbaony.github.io/kho-rau-reconciliation/"
    )

    await client.send_message(target, msg, parse_mode="html")
    print(f"Đã gửi báo cáo thành công tới '{target}'!")
    await client.disconnect()
    return True

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "me"
    asyncio.run(send_report(target))
