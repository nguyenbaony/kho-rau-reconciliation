import os
import sys
import json
import asyncio
from telethon import TelegramClient

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

API_ID = 36940234
API_HASH = "865e54052693f4e96cbb0a7a5c18ede6"
PHONE = "+84352377653"

SESSION_DIR = os.path.dirname(os.path.abspath(__file__))
SESSION_FILE = os.path.join(SESSION_DIR, "ny_personal_session")
STATE_FILE = os.path.join(SESSION_DIR, "telegram_auth_state.json")

async def request_code():
    print(f"Đang kết nối tới Telegram API với App ID: {API_ID}...")
    client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
    await client.connect()

    if await client.is_user_authorized():
        me = await client.get_me()
        print(f"Tài khoản đã được xác thực trước đó: {me.first_name} (@{me.username})")
        await client.disconnect()
        return

    print(f"Đang gửi yêu cầu mã xác nhận về Telegram của Ny ({PHONE})...")
    res = await client.send_code_request(PHONE)

    state = {
        "api_id": API_ID,
        "api_hash": API_HASH,
        "phone": PHONE,
        "phone_code_hash": res.phone_code_hash
    }

    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

    print("=" * 60)
    print(">>> THÀNH CÔNG: Telegram đã gửi mã xác nhận 5 chữ số vào app Telegram của Ny! <<<")
    print(f"Phone Code Hash: {res.phone_code_hash}")
    print("=" * 60)

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(request_code())
