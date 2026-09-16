import os
import sys
import json
import asyncio
from datetime import datetime, timezone, timedelta

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from telethon import TelegramClient

API_ID = 36940234
API_HASH = "865e54052693f4e96cbb0a7a5c18ede6"
SESSION_FILE = r"C:\Users\ADMIN\.gemini\antigravity-ide\scratch\kho-rau-reconciliation\ny_personal_session"

BASE_DIR = r"C:\Users\ADMIN\.gemini\antigravity-ide\scratch"
KHO_RAU_DIR = os.path.join(BASE_DIR, "kho-rau-reconciliation")
REMOTE_DIR = os.path.join(BASE_DIR, "rau-cu-kfm-remote")

MEDIA_DIR_1 = os.path.join(KHO_RAU_DIR, "web", "media", "telegram")
MEDIA_DIR_2 = os.path.join(REMOTE_DIR, "web", "public", "media", "telegram")

os.makedirs(MEDIA_DIR_1, exist_ok=True)
os.makedirs(MEDIA_DIR_2, exist_ok=True)

URGENT_KEYWORDS = ["điều chuyển", "vượt sức", "giao nhầm", "giao sai", "chuyển", "@nynguyen09", "nynguyen09"]

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

async def main():
    client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
    await client.connect()
    
    me = await client.get_me()
    print(f"Logged in as: {me.first_name} {me.last_name} (@{me.username})", flush=True)
    
    tz_vn = timezone(timedelta(hours=7))
    start_date = datetime(2026, 9, 1, 0, 0, 0, tzinfo=timezone.utc)
    now_date = datetime(2026, 9, 16, 23, 59, 59, tzinfo=timezone.utc)
    
    dialogs = []
    async for d in client.iter_dialogs():
        if d.is_group or d.is_channel:
            dialogs.append(d)
            
    print(f"Total dialogs: {len(dialogs)}", flush=True)
    
    # Priority groups: KRC, ABA, DC
    priority_groups = []
    for d in dialogs:
        t = d.title.upper()
        if any(k in t for k in ["KRC", "RAU", "ABA", "THỊT CÁ", "DC -", "CHẤT LƯỢNG", "ĐỐI SOÁT", "CHÊNH LỆCH"]):
            priority_groups.append(d)
            
    print(f"Targeting {len(priority_groups)} relevant KRC / ABA / DC groups...", flush=True)
    
    matched_items = []
    
    for d in priority_groups:
        title = d.title
        group_type = classify_group_title(title)
        chat_id = d.id
        
        try:
            msg_count = 0
            async for msg in client.iter_messages(d.entity, offset_date=now_date, limit=100):
                if msg.date < start_date:
                    break
                
                text = (msg.text or "").strip()
                has_media = bool(msg.photo or msg.media)
                
                if not text and not has_media:
                    continue
                
                date_vn = msg.date.astimezone(tz_vn)
                date_str = date_vn.strftime("%d/%m/%Y %H:%M")
                timestamp = int(msg.date.timestamp())
                
                is_urgent = any(kw in text.lower() for kw in URGENT_KEYWORDS)
                
                sender = await msg.get_sender()
                sender_name = "Nhân viên"
                sender_username = ""
                if sender:
                    f = getattr(sender, 'first_name', '') or ''
                    l = getattr(sender, 'last_name', '') or ''
                    sender_name = f"{f} {l}".strip() or getattr(sender, 'title', 'Nhân viên')
                    sender_username = f"@{sender.username}" if getattr(sender, 'username', '') else ""
                
                image_rel_path = ""
                img_name = f"{group_type.lower()}_{abs(chat_id)}_{msg.id}.jpg"
                p1 = os.path.join(MEDIA_DIR_1, img_name)
                p2 = os.path.join(MEDIA_DIR_2, img_name)
                
                if os.path.exists(p1):
                    image_rel_path = f"media/telegram/{img_name}"
                    if not os.path.exists(p2):
                        import shutil
                        shutil.copy2(p1, p2)
                elif has_media and msg.photo and is_urgent:
                    # Download only if urgent
                    try:
                        downloaded = await client.download_media(msg, file=p1)
                        if downloaded and os.path.exists(p1):
                            import shutil
                            shutil.copy2(p1, p2)
                            image_rel_path = f"media/telegram/{img_name}"
                    except Exception:
                        pass
                
                store_code = extract_store_code(title, text)
                web_url = get_web_a_url(chat_id, msg.id)
                tme_url = f"https://t.me/c/{str(abs(chat_id)).replace('100', '')}/{msg.id}"
                
                # If text is empty but has media, give description
                display_text = text if text else "(Hình ảnh / chứng từ biên bản giao nhận)"
                
                item = {
                    "id": f"{abs(chat_id)}_{msg.id}",
                    "chat_id": str(chat_id),
                    "message_id": msg.id,
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
                
                matched_items.append(item)
                msg_count += 1
                
            if msg_count > 0:
                print(f"  + [{group_type}] {title}: {msg_count} tin", flush=True)
        except Exception as e:
            continue
            
    # Sort newest first
    matched_items.sort(key=lambda x: x["timestamp"], reverse=True)
    print(f"\n===> TOTAL REAL MESSAGES COLLECTED (01/09/2026 - 16/09/2026): {len(matched_items)}", flush=True)
    
    urgent_count = sum(1 for x in matched_items if any(kw in x['text'].lower() for kw in URGENT_KEYWORDS))
    print(f"===> URGENT MESSAGES FOUND: {urgent_count}", flush=True)
    
    destinations = [
        os.path.join(KHO_RAU_DIR, "data"),
        os.path.join(KHO_RAU_DIR, "web", "data"),
        os.path.join(REMOTE_DIR, "web", "public", "data")
    ]
    
    for dest in destinations:
        os.makedirs(dest, exist_ok=True)
        json_path = os.path.join(dest, "telegram_feed.json")
        js_path = os.path.join(dest, "telegram_data.js")
        
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(matched_items, f, ensure_ascii=False, indent=2)
            
        with open(js_path, "w", encoding="utf-8") as f:
            f.write("// Auto-generated Real Telegram Feed Data from Ny Nguyễn (@nynguyen09)\n")
            f.write(f"// Data period: 01/09/2026 to {datetime.now().strftime('%d/%m/%Y %H:%M')}\n")
            f.write(f"// Total records: {len(matched_items)}\n")
            f.write("window.TELEGRAM_FEED = ")
            json.dump(matched_items, f, ensure_ascii=False, indent=2)
            f.write(";\n")
            
    print("SUCCESSFULLY SAVED TO ALL DATA DESTINATIONS!", flush=True)
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
