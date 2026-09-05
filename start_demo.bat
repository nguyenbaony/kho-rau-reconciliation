@echo off
chcp 65001 > nul
echo ================================================================
echo    🥦 KHỞI CHẠY DEMO HỆ THỐNG ĐỐI SOÁT KHO RAU ^& DATAPAY
echo ================================================================
echo.
echo [*] Đang chuẩn bị môi trường và mở ứng dụng...
echo [*] Thư mục: %~dp0
echo.

REM Ưu tiên mở trực tiếp trang web dashboard local
start "" "%~dp0index.html"

echo.
echo [✓] Dashboard đối soát đã được mở trên trình duyệt của bạn!
echo [✓] Bộ lọc Ngày (Date Filter) và tính toán KPI tự động đã sẵn sàng.
echo.
echo Link xem online (GitHub Pages):
echo    https://nguyenbaony.github.io/kho-rau-reconciliation/
echo.
echo Nhấn phím bất kỳ để đóng cửa sổ này...
pause > nul
