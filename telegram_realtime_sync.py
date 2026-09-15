import os
import re
import sys
import json
import asyncio
from datetime import datetime
from telethon import TelegramClient, events

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

os.makedirs(MEDIA_DIR, exist_ok=True)
os.makedirs(os.path.join(WEB_DIR, "data"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "data"), exist_ok=True)

def extract_store_code(title, text=""):
    combined = f"{title} {text}".upper()
    # Match patterns like A128, A151, LVT, LVL, Midtown, etc.
    m = re.search(r'\b(A\d{3}|[A-Z]{3}|MIDTOWN|CELADON)\b', combined)
    if m:
        return m.group(1)
    return "ST"

def classify_group(title):
    t = title.upper()
    if any(k in t for k in ["THỊT CÁ", "THIT CA", "ABA", "ĐÔNG MÁT", "DC -"]):
        return "ABA_DC"
    if any(k in t for k in ["KRC", "RAU", "CHẤT LƯỢNG", "KHO RAU"]):
        return "RAU_CU"
    if "HÌNH ẢNH CHÊNH LỆCH" in t:
        return "RAU_CU" if "KRC" in t else "ABA_DC"
    return None

feed_items = []

def save_feed():
    # Sort newest first and limit to 100 items
    feed_items.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    trimmed = feed_items[:100]
    for p in [FEED_JSON, FEED_JSON_ROOT]:
        try:
            with open(p, "w", encoding="utf-8") as f:
                json.dump(trimmed, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Lỗi lưu feed tại {p}: {e}")

async def download_msg_media(client, msg, group_type, group_title):
    global feed_items
    if not (msg.photo or msg.media):
        return None

    msg_id = msg.id
    chat_id = abs(msg.chat_id)
    filename = f"{group_type.lower()}_{chat_id}_{msg_id}.jpg"
    filepath = os.path.join(MEDIA_DIR, filename)

    if not os.path.exists(filepath):
        try:
            downloaded = await client.download_media(msg, file=filepath)
            if not downloaded or not os.path.exists(filepath):
                return None
        except Exception as e:
            # Skip media that cannot be downloaded as image
            return None

    sender = await msg.get_sender()
    sender_name = "Nhân viên"
    if sender:
        first = getattr(sender, 'first_name', '') or ''
        last = getattr(sender, 'last_name', '') or ''
        sender_name = f"{first} {last}".strip() or getattr(sender, 'title', 'Nhân viên')

    text = msg.text or ""
    store = extract_store_code(group_title, text)
    date_str = msg.date.strftime("%d/%m/%Y %H:%M")
    timestamp = int(msg.date.timestamp())

    item = {
        "id": f"{chat_id}_{msg_id}",
        "group_type": group_type,
        "group_title": group_title,
        "store_code": store,
        "sender_name": sender_name,
        "date": date_str,
        "timestamp": timestamp,
        "text": text,
        "image_url": f"media/telegram/{filename}"
    }

    # Avoid duplicate
    if not any(x["id"] == item["id"] for x in feed_items):
        feed_items.append(item)
        return item
    return None

async def init_historical_feed(client):
    print("Đang nạp ảnh và tin nhắn gần nhất từ các nhóm KRC và ABA/DC...")
    target_krc = []
    target_aba = []

    async for d in client.iter_dialogs():
        if d.is_group:
            cat = classify_group(d.title)
            if cat == "RAU_CU" and len(target_krc) < 10:
                target_krc.append((d.id, d.title))
            elif cat == "ABA_DC" and len(target_aba) < 10:
                target_aba.append((d.id, d.title))

    all_targets = [(gid, title, "RAU_CU") for gid, title in target_krc] + \
                  [(gid, title, "ABA_DC") for gid, title in target_aba]

    for gid, title, cat in all_targets:
        try:
            count = 0
            async for msg in client.iter_messages(gid, limit=10):
                if msg.photo or msg.media:
                    item = await download_msg_media(client, msg, cat, title)
                    if item:
                        count += 1
                        if count >= 3:
                            break
        except Exception as e:
            continue

    save_feed()
    print(f"Đã nạp khởi tạo thành công {len(feed_items)} hình ảnh & bài đăng nghiệp vụ!")

async def main():
    client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
    await client.connect()

    if not await client.is_user_authorized():
        print("Lỗi: Session chưa xác thực!")
        return

    me = await client.get_me()
    print(f"Đã kết nối với Telegram cá nhân: {me.first_name} (@{me.username})")

    # Nạp dữ liệu ảnh ban đầu
    await init_historical_feed(client)

    # Đăng ký listener nhận tin nhắn mới Realtime
    @client.on(events.NewMessage)
    async def handler(event):
        try:
            chat = await event.get_chat()
            chat_title = getattr(chat, 'title', '')
            cat = classify_group(chat_title)
            if cat and (event.message.photo or event.message.media):
                print(f"[REALTIME NEW] Nhóm: {chat_title} ({cat}) - Tải ảnh...")
                item = await download_msg_media(client, event.message, cat, chat_title)
                if item:
                    save_feed()
                    print(f" -> Đã lưu ảnh mới: {item['image_url']} (Siêu thị: {item['store_code']})")
        except Exception as e:
            print("Lỗi xử lý tin realtime:", e)

    print("\n" + "=" * 60)
    print("  HỆ THỐNG ĐANG LẮNG NGHE REALTIME TỪ CÁC NHÓM TELEGRAM...  ")
    print("  (Bất kỳ ảnh chênh lệch nào gửi lên nhóm sẽ tự động nạp)  ")
    print("=" * 60)

    # Chạy lắng nghe nếu không truyền cờ --once
    if "--once" not in sys.argv:
        await client.run_until_disconnected()
    else:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
