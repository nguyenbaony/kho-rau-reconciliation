import os
import sys
import asyncio
from telethon import TelegramClient

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

API_ID = 36940234
API_HASH = "865e54052693f4e96cbb0a7a5c18ede6"
SESSION_DIR = os.path.dirname(os.path.abspath(__file__))
SESSION_FILE = os.path.join(SESSION_DIR, "ny_personal_session")

MSG = """🥦 <b>BẢN DEMO ĐỐI SOÁT KHO RAU & DATAPAY MỚI NHẤT</b>
⏰ <i>Phiên bản V5 - Cập nhật ngày 10/09/2026</i>
━━━━━━━━━━━━━━━━━━━
Ny ơi, đây là bản demo hoàn chỉnh và mới nhất của hệ thống Đối Soát Kho Rau & Datapay Hub:

🌐 <b>1. TRUY CẬP TRỰC TUYẾN (GitHub Pages):</b>
👉 https://nguyenbaony.github.io/kho-rau-reconciliation/

💻 <b>2. CHẠY TẠI MÁY (Local Server):</b>
👉 http://localhost:8085/

📦 <b>3. SỐ LIỆU ĐỐI SOÁT MỚI NHẤT:</b>
• Tổng số dòng đối soát: <b>11.150 dòng</b>
• Chênh lệch khối lượng: <b>12.722,92 KG/Pack</b>
• 📉 Hao hụt tự nhiên: <b>25.527.802 đ</b>
• 🏭 Phạt Kho Rau (DC): <b>172.948.502 đ</b>
• 🏪 Phạt Siêu Thị (ST): <b>30.413.601 đ</b>

✨ <b>4. CÁC TÍNH NĂNG NỔI BẬT:</b>
1. <b>Tab 1 - Phân tích & Biểu đồ CDC:</b> Ma trận Datapay động, biểu đồ cơ cấu lỗi và top siêu thị lệch cao.
2. <b>Tab 2 - Chi tiết đối soát TO/PT:</b> Bóc tách từng mã đơn, xem camera & chứng từ đối chiếu.
3. <b>Tab 3 - Telegram Live Feed:</b> Quản lý hình ảnh từ 459 nhóm Telegram (206 nhóm KRC, 192 nhóm ABA).
4. <b>Bộ lọc ngày:</b> Đã hỗ trợ lọc nhanh từ 26/08 đến 10/09/2026 hoặc khoảng ngày tùy chọn.
5. <b>Tự động hóa 7:00 AM:</b> Đã cài lịch Windows tự động cập nhật Google Sheet và gửi báo cáo mỗi sáng!
━━━━━━━━━━━━━━━━━━━
<i>Chúc Ny làm việc hiệu quả và theo dõi số liệu thật tiện lợi nhé! 🌟</i>"""

async def main():
    client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
    await client.connect()
    if not await client.is_user_authorized():
        print("NOT_AUTHORIZED")
        await client.disconnect()
        return

    await client.send_message("me", MSG, parse_mode="html")
    print("SUCCESS_SENT_TO_TELEGRAM")
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
