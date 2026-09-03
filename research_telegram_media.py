import os
import sys
import asyncio
from telethon import TelegramClient

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

API_ID = 36940234
API_HASH = "865e54052693f4e96cbb0a7a5c18ede6"
SESSION_FILE = r"C:\Users\longa\.gemini\antigravity-ide\scratch\kho-rau-reconciliation\ny_personal_session"

async def check_recent_media():
    client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
    await client.connect()

    target_groups = []
    async for d in client.iter_dialogs():
        if d.is_group:
            title_upper = d.title.upper()
            if "HÌNH ẢNH CHÊNH LỆCH" in title_upper or "CHẤT LƯỢNG" in title_upper or "KRC" in title_upper:
                target_groups.append((d.id, d.title, "RAU_CU"))
            elif "ABA" in title_upper:
                if len([x for x in target_groups if x[2] == "ABA_DC"]) < 5:
                    target_groups.append((d.id, d.title, "ABA_DC"))

    print(f"Target sample groups found: {len(target_groups)}")
    for gid, title, cat in target_groups[:6]:
        print(f"\n--- Checking: {title} ({cat}) ---")
        async for msg in client.iter_messages(gid, limit=5):
            has_media = bool(msg.photo or msg.media)
            text_snippet = (msg.text or "").replace("\n", " ")[:60]
            print(f"[{msg.date.strftime('%d/%m %H:%M')}] Media: {has_media} | Text: {text_snippet}")

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(check_recent_media())
