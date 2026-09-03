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

async def fetch_aba():
    client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
    await client.connect()

    aba_targets = []
    async for d in client.iter_dialogs():
        if d.is_group and "ABA" in d.title.upper():
            aba_targets.append((d.id, d.title))
            if len(aba_targets) >= 8:
                break

    with open(FEED_JSON, "r", encoding="utf-8") as f:
        items = json.load(f)

    for gid, title in aba_targets:
        try:
            count = 0
            async for msg in client.iter_messages(gid, limit=10):
                if msg.photo or msg.media:
                    fname = f"aba_dc_{abs(gid)}_{msg.id}.jpg"
                    fpath = os.path.join(MEDIA_DIR, fname)
                    if not os.path.exists(fpath):
                        await client.download_media(msg, file=fpath)
                    
                    if os.path.exists(fpath) and os.path.getsize(fpath) > 0:
                        sender = await msg.get_sender()
                        first = getattr(sender, 'first_name', '') or ''
                        last = getattr(sender, 'last_name', '') or ''
                        sname = f"{first} {last}".strip() or "Nhân viên kho ABA"
                        text = (msg.text or "").strip() or "(Hình ảnh camera nhận hàng & chứng từ đông mát)"

                        items.append({
                            "id": f"{abs(gid)}_{msg.id}",
                            "group_type": "ABA_DC",
                            "group_title": title,
                            "store_code": title.split("-")[0].strip() if "-" in title else "ST",
                            "sender_name": sname,
                            "date": msg.date.strftime("%d/%m/%Y %H:%M"),
                            "timestamp": int(msg.date.timestamp()),
                            "text": text,
                            "image_url": f"media/telegram/{fname}"
                        })
                        count += 1
                        print(f"Downloaded ABA: {title} | {fname}")
                        if count >= 2:
                            break
        except Exception as e:
            continue

    # Deduplicate and sort
    seen = set()
    uniq = []
    for it in items:
        if it["id"] not in seen:
            seen.add(it["id"])
            uniq.append(it)

    uniq.sort(key=lambda x: x["timestamp"], reverse=True)
    with open(FEED_JSON, "w", encoding="utf-8") as f:
        json.dump(uniq, f, ensure_ascii=False, indent=2)
    with open(os.path.join(BASE_DIR, "data", "telegram_feed.json"), "w", encoding="utf-8") as f:
        json.dump(uniq, f, ensure_ascii=False, indent=2)

    print(f"Tổng số bài đăng sau khi nạp ABA: {len(uniq)} bài!")
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(fetch_aba())
