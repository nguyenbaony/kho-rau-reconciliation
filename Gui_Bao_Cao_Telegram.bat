@echo off
chcp 65001 > nul
echo ======================================================
echo    DANG GUI BAO CAO DOI SOAT VAO TELEGRAM CUA NY...
echo ======================================================
"C:\Users\longa\AppData\Local\PythonEmbed\python.exe" "%~dp0send_report_session.py" me
echo.
echo ======================================================
echo    DA GUI THANH CONG VAO SAVED MESSAGES TREN TELEGRAM!
echo ======================================================
timeout /t 5
