import os
import sys
import json
import asyncio
from datetime import datetime, timezone, timedelta

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from telethon import TelegramClient, events

API_ID = 36940234
API_HASH = "865e54052693f4e96cbb0a7a5c18ede6"
SESSION_FILE = r"C:\Users\ADMIN\.gemini\antigravity-ide\scratch\kho-rau-reconciliation\ny_personal_session"

BASE_DIR = r"C:\Users\ADMIN\.gemini\antigravity-ide\scratch"
KHO_RAU_DIR = os.path.join(BASE_DIR, "kho-rau-reconciliation")
REMOTE_DIR = os.path.join(BASE_DIR, "rau-cu-kfm-remote")

MEDIA_DIRS = [
    os.path.join(KHO_RAU_DIR, "web", "media", "telegram"),
    os.path.join(REMOTE_DIR, "web", "public", "media", "telegram")
]

DATA_DESTS = [
    os.path.join(KHO_RAU_DIR, "data"),
    os.path.join(KHO_RAU_DIR, "web", "data"),
    os.path.join(REMOTE_DIR, "web", "public", "data")
]

for d in MEDIA_DIRS:
    os.makedirs(d, exist_ok=True)
for d in DATA_DESTS:
    os.makedirs(d, exist_ok=True)

URGENT_KEYWORDS = ["điều chuyển", "vượt sức", "giao nhầm", "giao sai", "chuyển", "@nynguyen09", "nynguyen09"]

feed_items = []

def load_current_feed():
    global feed_items
    feed_path = os.path.join(REMOTE_DIR, "web", "public", "data", "telegram_feed.json")
    if os.path.exists(feed_path):
        try:
            with open(feed_path, "r", encoding="utf-8") as f:
                feed_items = json.load(f)
            print(f"Loaded existing feed with {len(feed_items)} items.", flush=True)
        except Exception as e:
            print(f"Error loading feed: {e}", flush=True)

def save_feed_to_all():
    global feed_items
    feed_items.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    
    total = len(feed_items)
    now_str = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    
    for dest in DATA_DESTS:
        json_file = os.path.join(dest, "telegram_feed.json")
        js_file = os.path.join(dest, "telegram_data.js")
        try:
            with open(json_file, "w", encoding="utf-8") as f:
                json.dump(feed_items, f, ensure_ascii=False, indent=2)
                
            with open(js_file, "w", encoding="utf-8") as f:
                f.write("// Realtime Telegram Feed Data - Ny Nguyễn (@nynguyen09)\n")
                f.write(f"// Last updated: {now_str} | Total records: {total}\n")
                f.write("window.TELEGRAM_FEED = ")
                json.dump(feed_items, f, ensure_ascii=False, indent=2)
                f.write(";\n")
        except Exception as e:
            print(f"Error writing to {dest}: {e}", flush=True)
            
    print(f"[{now_str}] Sync saved to all destinations: {total} items", flush=True)

def classify_group_title(title):
    t = title.upper()
    if any(k in t for k in ["THỊT CÁ", "THIT CA", "ABA", "ĐÔNG MÁT", "DONG MAT"]):
        return "ABA"
    if any(k in t for k in ["DC -", "TỔNG KHO", "TONG KHO", "DC "]):
        return "DC"
    return "KRC"

def extract_store_code(title, text):
    import re
    combined = f"{title} {text}".upper()
    m = re.search(r'\b(A\d{3}|[A-Z]{3,4}\b|MIDTOWN|CELADON|VGP|SSR|TNO|LVL|LVT|ECG)\b', combined)
    if m:
        return m.group(1)
    return "ST"

def get_web_a_url(chat_id, message_id):
    s_id = str(chat_id)
    if s_id.startswith("-100"):
        clean_id = s_id.replace("-100", "")
        return f"https://web.telegram.org/a/#-100{clean_id}?message={message_id}"
    elif s_id.startswith("-"):
        clean_id = s_id.replace("-", "")
        return f"https://web.telegram.org/a/#-{clean_id}?message={message_id}"
    else:
        return f"https://web.telegram.org/a/#{s_id}?message={message_id}"

async def process_single_message(client, msg, chat_id, title):
    global feed_items
    text = (msg.text or "").strip()
    has_media = bool(msg.photo or msg.media)
    
    if not text and not has_media:
        return None
        
    msg_id = msg.id
    item_id = f"{abs(chat_id)}_{msg_id}"
    
    # Check duplicate
    if any(x["id"] == item_id for x in feed_items):
        return None
        
    group_type = classify_group_title(title)
    tz_vn = timezone(timedelta(hours=7))
    date_vn = msg.date.astimezone(tz_vn)
    date_str = date_vn.strftime("%d/%m/%Y %H:%M")
    timestamp = int(msg.date.timestamp())
    
    sender = await msg.get_sender()
    sender_name = "Nhân viên"
    sender_username = ""
    if sender:
        f = getattr(sender, 'first_name', '') or ''
        l = getattr(sender, 'last_name', '') or ''
        sender_name = f"{f} {l}".strip() or getattr(sender, 'title', 'Nhân viên')
        sender_username = f"@{sender.username}" if getattr(sender, 'username', '') else ""
        
    is_urgent = any(kw in text.lower() for kw in URGENT_KEYWORDS)
    
    image_rel_path = ""
    img_name = f"{group_type.lower()}_{abs(chat_id)}_{msg_id}.jpg"
    p1 = os.path.join(MEDIA_DIRS[0], img_name)
    p2 = os.path.join(MEDIA_DIRS[1], img_name)
    
    if os.path.exists(p1):
        image_rel_path = f"media/telegram/{img_name}"
    elif has_media and msg.photo and is_urgent:
        try:
            downloaded = await client.download_media(msg, file=p1)
            if downloaded and os.path.exists(p1):
                import shutil
                shutil.copy2(p1, p2)
                image_rel_path = f"media/telegram/{img_name}"
        except Exception:
            pass
            
    store_code = extract_store_code(title, text)
    web_url = get_web_a_url(chat_id, msg_id)
    tme_url = f"https://t.me/c/{str(abs(chat_id)).replace('100', '')}/{msg_id}"
    display_text = text if text else "(Hình ảnh / chứng từ biên bản giao nhận)"
    
    new_item = {
        "id": item_id,
        "chat_id": str(chat_id),
        "message_id": msg_id,
        "group_type": group_type,
        "group_title": title,
        "store_code": store_code,
        "sender_name": sender_name,
        "sender_role": "KFM SCM",
        "sender_username": sender_username,
        "date": date_str,
        "timestamp": timestamp,
        "text": display_text,
        "image_url": image_rel_path,
        "web_url": web_url,
        "tme_url": tme_url
    }
    
    feed_items.insert(0, new_item)
    return new_item

async def main():
    load_current_feed()
    
    client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
    await client.connect()
    
    me = await client.get_me()
    print(f"Connected as {me.first_name} (@{me.username}) - {me.phone}", flush=True)
    
    # 1. Register Realtime Event Listener FIRST so NO messages are missed
    @client.on(events.NewMessage)
    async def on_new_message(event):
        try:
            chat = await event.get_chat()
            title = getattr(chat, 'title', '')
            if not title:
                return
            t_upper = title.upper()
            if any(k in t_upper for k in ["KRC", "RAU", "ABA", "THỊT CÁ", "DC", "CHẤT LƯỢNG", "ĐỐI SOÁT"]):
                item = await process_single_message(client, event.message, chat.id, title)
                if item:
                    save_feed_to_all()
                    print(f"⚡ [REALTIME EVENT] [{item['date']}] {title} | {item['sender_name']}: {item['text'][:60]}", flush=True)
        except Exception as e:
            print(f"Listener error: {e}", flush=True)
            
    print("Realtime event listener registered and ACTIVE!", flush=True)
    
    # 2. Fast catch-up recent messages across top 50 active groups (from 14:00 to now)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=3)
    print("Catching up recent messages from top active groups...", flush=True)
    
    active_dialogs = []
    async for d in client.iter_dialogs():
        if d.is_group or d.is_channel:
            t = d.title.upper()
            if any(k in t for k in ["KRC", "RAU", "ABA", "THỊT CÁ", "DC -", "CHẤT LƯỢNG", "ĐỐI SOÁT"]):
                active_dialogs.append(d)
                if len(active_dialogs) >= 60:
                    break
                    
    added = 0
    for d in active_dialogs:
        try:
            async for msg in client.iter_messages(d.entity, limit=8):
                if msg.date < cutoff:
                    break
                item = await process_single_message(client, msg, d.id, d.title)
                if item:
                    added += 1
        except Exception:
            continue
            
    if added > 0:
        print(f"Catch-up completed: {added} new messages added.", flush=True)
        save_feed_to_all()
    else:
        print("Catch-up completed: All messages are already up to date.", flush=True)
        save_feed_to_all()
        
    print("\n" + "=" * 65, flush=True)
    print("  REALTIME TELEGRAM LISTENER DAEMON IS ACTIVE AND RUNNING!  ", flush=True)
    print("  Listening to all KRC, ABA, and DC group messages live...  ", flush=True)
    print("=" * 65 + "\n", flush=True)
    
    await client.run_until_disconnected()

if __name__ == "__main__":
    asyncio.run(main())
