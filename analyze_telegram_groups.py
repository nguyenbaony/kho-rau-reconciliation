import os
import sys
import json
import asyncio
from telethon import TelegramClient

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

API_ID = 36940234
API_HASH = "865e54052693f4e96cbb0a7a5c18ede6"

SESSION_DIR = os.path.dirname(os.path.abspath(__file__))
SESSION_FILE = os.path.join(SESSION_DIR, "ny_personal_session")

async def analyze_groups():
    client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
    await client.connect()

    if not await client.is_user_authorized():
        print("Lỗi: Session chưa được xác thực!")
        await client.disconnect()
        return

    all_groups = []
    krc_groups = []
    aba_groups = []
    other_groups = []

    print("Đang quét danh sách hội nhóm Telegram của Ny...")
    async for dialog in client.iter_dialogs():
        if dialog.is_group:
            title = dialog.title.strip()
            group_info = {
                "id": dialog.id,
                "title": title,
                "unread_count": dialog.unread_count,
                "is_channel": dialog.is_channel
            }
            all_groups.append(group_info)

            title_upper = title.upper()
            if any(k in title_upper for k in ["KRC", "RAU", "KHO RAU", "RAU CỦ", "RAU CU", "FRUIT", "VEG"]):
                krc_groups.append(group_info)
            elif "ABA" in title_upper:
                aba_groups.append(group_info)
            else:
                other_groups.append(group_info)

    output = {
        "total_groups": len(all_groups),
        "krc_count": len(krc_groups),
        "aba_count": len(aba_groups),
        "other_count": len(other_groups),
        "krc_groups": krc_groups,
        "aba_groups": aba_groups,
        "other_groups": other_groups
    }

    result_file = os.path.join(SESSION_DIR, "telegram_groups_analysis.json")
    with open(result_file, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 60)
    print("      KẾT QUẢ THỐNG KÊ HỘI NHÓM TELEGRAM CỦA NY      ")
    print("=" * 60)
    print(f"Tổng số Group Telegram đang tham gia: {len(all_groups)} nhóm")
    print(f"1. Nhóm Kho Rau Củ (KRC):              {len(krc_groups)} nhóm")
    print(f"2. Nhóm Kho ABA (ABA):                 {len(aba_groups)} nhóm")
    print(f"3. Các nhóm công việc & cá nhân khác:  {len(other_groups)} nhóm")
    print("=" * 60)

    print("\n[DANH SÁCH NHÓM KHO RAU CỦ (KRC)]:")
    for idx, g in enumerate(krc_groups, 1):
        print(f"  {idx}. {g['title']} (ID: {g['id']})")

    print("\n[DANH SÁCH NHÓM KHO ABA (ABA)]:")
    for idx, g in enumerate(aba_groups, 1):
        print(f"  {idx}. {g['title']} (ID: {g['id']})")

    if other_groups:
        print("\n[MỘT SỐ NHÓM KHÁC TIÊU BIỂU]:")
        for idx, g in enumerate(other_groups[:15], 1):
            print(f"  {idx}. {g['title']}")

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(analyze_groups())
