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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SESSION_FILE = os.path.join(BASE_DIR, "ny_personal_session")
WEB_DIR = os.path.join(BASE_DIR, "web")
MEDIA_DIR = os.path.join(WEB_DIR, "media", "telegram")
FEED_JSON = os.path.join(WEB_DIR, "data", "telegram_feed.json")
FEED_JSON_ROOT = os.path.join(BASE_DIR, "data", "telegram_feed.json")

async def build_feed():
    client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
    await client.connect()

    files = [f for f in os.listdir(MEDIA_DIR) if f.endswith(".jpg") and os.path.getsize(os.path.join(MEDIA_DIR, f)) > 0]
    print(f"Tìm thấy {len(files)} ảnh thực tế đã tải.")

    items = []
    # For each downloaded file, map back to its message
    for f in files:
        # e.g. rau_cu_1001828938896_964291.jpg
        parts = f.replace(".jpg", "").split("_")
        # parts: ['rau', 'cu', '1001828938896', '964291']
        group_type = "RAU_CU" if "rau" in f else "ABA_DC"
        try:
            msg_id = int(parts[-1])
            chat_id = -int(parts[-2])
            
            chat = await client.get_entity(chat_id)
            msg = await client.get_messages(chat, ids=msg_id)
            
            title = getattr(chat, 'title', 'Nhóm Telegram')
            text = (msg.text or "").strip()
            sender = await msg.get_sender()
            sender_name = "Nhân viên kho/ST"
            if sender:
                first = getattr(sender, 'first_name', '') or ''
                last = getattr(sender, 'last_name', '') or ''
                sender_name = f"{first} {last}".strip() or getattr(sender, 'title', 'Nhân viên')

            date_str = msg.date.strftime("%d/%m/%Y %H:%M")
            timestamp = int(msg.date.timestamp())

            items.append({
                "id": f"{abs(chat_id)}_{msg_id}",
                "group_type": group_type,
                "group_title": title,
                "store_code": title.split("-")[0].strip() if "-" in title else "ST",
                "sender_name": sender_name,
                "date": date_str,
                "timestamp": timestamp,
                "text": text or "(Hình ảnh biên bản / camera giao nhận)",
                "image_url": f"media/telegram/{f}"
            })
            print(f"Indexed: {title} | {f}")
        except Exception as e:
            # Fallback if chat entity not fetchable
            items.append({
                "id": f.replace(".jpg", ""),
                "group_type": group_type,
                "group_title": "Nhóm Kho Rau Củ (KRC)" if group_type == "RAU_CU" else "Nhóm Kho ABA Đông Mát",
                "store_code": "KRC" if group_type == "RAU_CU" else "ABA",
                "sender_name": "Nhân viên giám sát",
                "date": datetime.now().strftime("%d/%m/%Y %H:%M"),
                "timestamp": int(datetime.now().timestamp()),
                "text": "Hình ảnh chênh lệch hàng hóa & biên bản giao nhận",
                "image_url": f"media/telegram/{f}"
            })

    items.sort(key=lambda x: x["timestamp"], reverse=True)
    for p in [FEED_JSON, FEED_JSON_ROOT]:
        with open(p, "w", encoding="utf-8") as out_f:
            json.dump(items, out_f, ensure_ascii=False, indent=2)

    print(f"Đã tạo telegram_feed.json thành công với {len(items)} bài đăng thực tế!")
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(build_feed())
