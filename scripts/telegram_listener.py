"""
Telegram Realtime Message Monitor for KRC, ABA, DC Groups
Targeting Telegram Web A (https://web.telegram.org/a/)
Automated keyword detection & urgent alerts for SCM operations.

Keywords: "chuyển", "vượt sức", "giao sai", "giao nhầm", "điều chuyển", "@nynguyen09"
"""

import json
import re
import os
import sys
from datetime import datetime

# Optional Telethon import - if installed, can connect directly to Telegram MTProto
try:
    from telethon import TelegramClient, events
except ImportError:
    TelegramClient = None
    events = None

# Telegram API Configuration (get from my.telegram.org)
API_ID = os.environ.get("TG_API_ID", "YOUR_API_ID")
API_HASH = os.environ.get("TG_API_HASH", "YOUR_API_HASH")
SESSION_NAME = "scm_nynguyen09_monitor"

# Monitored Keywords
URGENT_KEYWORDS = [
    "điều chuyển",
    "vượt sức",
    "giao nhầm",
    "giao sai",
    "chuyển",
    "@nynguyen09",
    "@@nynguyen09"
]

OUTPUT_JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "web", "public", "data", "telegram_feed.json")

def detect_urgent(text: str):
    if not text:
        return False, []
    lower = text.lower()
    matched = []
    if "@nynguyen09" in lower or "@@nynguyen09" in lower:
        matched.append("@nynguyen09")
    for kw in ["điều chuyển", "vượt sức", "giao nhầm", "giao sai", "chuyển"]:
        if kw in lower and kw not in matched:
            matched.append(kw)
    return len(matched) > 0, matched

def classify_group(group_title: str):
    upper = (group_title or "").upper()
    if any(k in upper for k in ["RAU CỦ", "KRC", "RAU", "VIETGAP"]):
        return "KRC"
    elif any(k in upper for k in ["ABA", "THỊT CÁ", "ĐÔNG MÁT", "MÁT", "TRỮ ĐÔNG"]):
        return "ABA"
    elif any(k in upper for k in ["DC", "TRUNG TÂM", "TUYẾN XE", "XE", "VẬN TẢI", "HUB"]):
        return "DC"
    return "KRC"

def build_web_a_url(chat_id: int or str, message_id: int or str):
    clean_id = str(chat_id).replace("-100", "").replace("-", "")
    return f"https://web.telegram.org/a/#-100{clean_id}?message={message_id}"

async def main():
    if not TelegramClient:
        print("Vui lòng cài đặt thư viện Telethon: pip install telethon")
        sys.exit(1)

    print(f"[*] Đang khởi động Telegram MTProto Listener cho @nynguyen09...")
    print(f"[*] Theo dõi các từ khóa: {', '.join(URGENT_KEYWORDS)}")

    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()

    print("[✓] Kết nối Telegram thành công! Đang giám sát tất cả các nhóm...")

    @client.on(events.NewMessage)
    async def handler(event):
        if not event.is_group and not event.is_channel:
            return

        chat = await event.get_chat()
        sender = await event.get_sender()
        text = event.message.message or ""

        group_title = getattr(chat, "title", "Nhóm Telegram")
        sender_name = f"{getattr(sender, 'first_name', '')} {getattr(sender, 'last_name', '')}".strip() or "Thành viên"
        group_type = classify_group(group_title)

        is_urgent, matched_keys = detect_urgent(text)

        msg_record = {
            "id": f"msg_{chat.id}_{event.message.id}",
            "chat_id": str(chat.id),
            "message_id": event.message.id,
            "group_type": group_type,
            "group_title": group_title,
            "sender_name": sender_name,
            "date": datetime.now().strftime("%d/%m/%Y %H:%M"),
            "timestamp": int(datetime.now().timestamp()),
            "text": text,
            "web_url": build_web_a_url(chat.id, event.message.id),
            "tme_url": f"https://t.me/c/{str(chat.id).replace('-100', '')}/{event.message.id}"
        }

        if is_urgent:
            print(f"\n[🚨 TIN KHẨN CẤP] [{group_type}] {group_title}")
            print(f"    Người gửi: {sender_name}")
            print(f"    Khớp từ khóa: {matched_keys}")
            print(f"    Nội dung: {text[:100]}...")
            print(f"    Link Web A: {msg_record['web_url']}\n")

        # Update JSON file
        try:
            feed = []
            if os.path.exists(OUTPUT_JSON_PATH):
                with open(OUTPUT_JSON_PATH, "r", encoding="utf-8") as f:
                    feed = json.load(f)
            feed.insert(0, msg_record)
            # Keep latest 100 messages
            feed = feed[:100]
            with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
                json.dump(feed, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[!] Lỗi ghi file JSON: {e}")

    await client.run_until_disconnected()

if __name__ == "__main__":
    import asyncio
    if TelegramClient:
        asyncio.run(main())
    else:
        print("Script sẵn sàng! Cài đặt telethon để kết nối realtime.")
