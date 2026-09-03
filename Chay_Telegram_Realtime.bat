@echo off
chcp 65001 > nul
title LANG NGHE REALTIME TELEGRAM KHO RAU & ABA
echo ===================================================================
echo     DANG KHOI DONG LUONG LANG NGHE TELEGRAM REALTIME CHO NY...
echo ===================================================================
echo  - Nhom 1: Kho Rau Cu (KRC)
echo  - Nhom 2: Kho Dong Mat ABA ^& DC
echo.
echo Khi co bat ky anh chung tu / chenh lech / camera moi nao tren nhom,
echo he thong se tu dong tai ve va hien thi len Web Dashboard ngay lap tuc!
echo ===================================================================
echo.
"C:\Users\longa\AppData\Local\PythonEmbed\python.exe" "%~dp0telegram_realtime_sync.py"
pause
