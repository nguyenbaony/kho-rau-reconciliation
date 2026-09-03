import os
import sys
import asyncio
from telethon import TelegramClient

PHONE_NUMBER = "+84352377653"

async def main():
    print("=" * 55)
    print("   KẾT NỐI TELEGRAM CÁ NHÂN (USER SESSION) CHO NY   ")
    print("=" * 55)
    print(f"Tài khoản mục tiêu: {PHONE_NUMBER} (@nynguyen09)")
    print("\nĐể kết nối Telegram Session chính chủ, Telegram yêu cầu")
    print("api_id và api_hash lấy từ trang chính thức: https://my.telegram.org\n")

    api_id = input("Nhập API ID (hoặc nhấn Enter nếu dùng mặc định): ").strip()
    api_hash = input("Nhập API HASH (hoặc nhấn Enter nếu dùng mặc định): ").strip()

    if not api_id or not api_hash:
        print("\n[!] Cần có API ID và API HASH từ https://my.telegram.org để Telegram gửi mã xác minh!")
        return

    session_path = os.path.join(os.path.dirname(__file__), "ny_account.session")
    client = TelegramClient(session_path, int(api_id), api_hash)

    await client.connect()
    if not await client.is_user_authorized():
        print(f"\nĐang yêu cầu Telegram gửi mã xác minh về ứng dụng Telegram của Ny ({PHONE_NUMBER})...")
        sent = await client.send_code_request(PHONE_NUMBER)
        print(">>> Telegram đã gửi mã xác nhận 5 chữ số vào ứng dụng Telegram Desktop của Ny! <<<")
        code = input("Nhập mã xác nhận Telegram vừa gửi: ").strip()
        try:
            await client.sign_in(PHONE_NUMBER, code)
        except Exception as e:
            if "SessionPasswordNeededError" in str(type(e)):
                pwd = input("Tài khoản của Ny có bật mật khẩu 2 bước (2FA). Vui lòng nhập mật khẩu: ")
                await client.sign_in(password=pwd)
            else:
                raise e

    me = await client.get_me()
    print("\n" + "=" * 55)
    print(f"KẾT NỐI THÀNH CÔNG SESSION CÁ NHÂN: {me.first_name} {me.last_name or ''} (@{me.username})")
    print("File session đã được lưu tại:", session_path)
    print("=" * 55)

    # Gửi tin nhắn thử nghiệm vào Saved Messages (Tin nhắn đã lưu) của chính Ny
    test_msg = (
        "🥦 <b>KHO RAU RECONCILIATION - KẾT NỐI SESSION THÀNH CÔNG!</b>\n\n"
        "Xin chào Ny! Phiên làm việc Telegram cá nhân (User Session) đã được liên kết trực tiếp với hệ thống đối soát.\n\n"
        "Từ bây giờ, hệ thống có thể tự động gửi báo cáo đối soát và Datapay trực tiếp qua tài khoản này mà không cần bấm xác nhận thủ công!"
    )
    await client.send_message("me", test_msg, parse_mode="html")
    print("\nĐã gửi tin nhắn xác nhận thành công vào mục 'Saved Messages' của Ny trên Telegram!")

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
