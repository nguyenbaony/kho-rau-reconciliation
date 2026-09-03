import os
import sys
import json
import asyncio
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

SESSION_DIR = os.path.dirname(os.path.abspath(__file__))
SESSION_FILE = os.path.join(SESSION_DIR, "ny_personal_session")
STATE_FILE = os.path.join(SESSION_DIR, "telegram_auth_state.json")

async def complete_login(code, password=None):
    if not os.path.exists(STATE_FILE):
        print("Lỗi: Không tìm thấy file auth_state. Hãy chạy request_telegram_code.py trước!")
        return False

    with open(STATE_FILE, "r", encoding="utf-8") as f:
        state = json.load(f)

    api_id = state["api_id"]
    api_hash = state["api_hash"]
    phone = state["phone"]
    phone_code_hash = state["phone_code_hash"]

    client = TelegramClient(SESSION_FILE, api_id, api_hash)
    await client.connect()

    try:
        await client.sign_in(phone=phone, code=code, phone_code_hash=phone_code_hash)
    except SessionPasswordNeededError:
        if not password:
            print("NEED_2FA: Tài khoản có bảo mật 2 bước (2FA). Vui lòng cung cấp thêm mật khẩu 2FA!")
            await client.disconnect()
            return "NEED_2FA"
        await client.sign_in(password=password)
    except Exception as e:
        print(f"Lỗi đăng nhập: {e}")
        await client.disconnect()
        return False

    me = await client.get_me()
    print("=" * 60)
    print(f"KẾT NỐI THÀNH CÔNG SESSION: {me.first_name} {me.last_name or ''} (@{me.username})")
    print(f"Session file đã lưu tại: {SESSION_FILE}.session")
    print("=" * 60)

    # Gửi tin nhắn chào mừng vào Saved Messages
    welcome_msg = (
        "🥦 <b>HỆ THỐNG ĐỐI SOÁT KHO RAU - KẾT NỐI THÀNH CÔNG</b>\n\n"
        f"Xin chào {me.first_name}!\n"
        "Phiên làm việc Telegram cá nhân (Session) đã được kích hoạt thành công trên máy tính của Ny.\n\n"
        "Báo cáo đối soát và Datapay sẽ được gửi trực tiếp tự động qua kênh này!"
    )
    await client.send_message("me", welcome_msg, parse_mode="html")
    print("Đã gửi tin nhắn xác nhận vào mục 'Saved Messages' của Ny!")

    await client.disconnect()
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Cách dùng: python complete_telegram_login.py <CODE> [2FA_PASSWORD]")
        sys.exit(1)

    code = sys.argv[1].strip()
    pwd = sys.argv[2].strip() if len(sys.argv) > 2 else None
    asyncio.run(complete_login(code, pwd))
