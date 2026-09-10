@echo off
chcp 65001 > nul
echo =====================================================================
echo    TI?N H?NH ??NG B? D? LI?U DATAPAY V?O STARROCKS (kfm_scm)
echo =====================================================================
echo [*] Host: 103.147.122.103:9030
echo [*] Database: kfm_scm  ^|  User: kfm_scm_tho_nguyen
echo.
echo [*] ?ang ki?m tra k?t n?i t?i StarRocks...
powershell -Command "Test-NetConnection -ComputerName 103.147.122.103 -Port 9030 -InformationLevel Quiet" > "%temp%\sr_test.txt"
set /p TEST_RESULT=<"%temp%\sr_test.txt"
del "%temp%\sr_test.txt" 2>nul

if "%TEST_RESULT%"=="False" (
    echo [CANH BAO] Khong the ket noi toi 103.147.122.103:9030!
    echo Vui long kiem tra WireGuard VPN da duoc Activate chua.
    echo Neu chua, hay mo WireGuard hoac chay Connect-VPN.bat ngoai Desktop!
    echo.
    pause
    exit /b 1
)

echo [+] Ket noi mang qua WireGuard OK!
echo [*] Dang chay script dong bo Datapay...
"C:\Users\longa\AppData\Local\PythonEmbed\python.exe" -u "C:\Users\longa\Desktop\ISOTKH~1\sync_datapay_to_starrocks.py"
echo.
echo =====================================================================
echo    HO?N T?T ??NG B? DATAPAY V?O STARROCKS!
echo =====================================================================
pause
