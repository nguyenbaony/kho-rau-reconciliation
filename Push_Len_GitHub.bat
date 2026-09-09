@echo off
chcp 65001 >nul
title Push Kho Rau Reconciliation len GitHub
echo ========================================================
echo   DONG BO & PUSH CODE KHO RAU RECONCILIATION LEN GITHUB
echo ========================================================
echo.
powershell -ExecutionPolicy Bypass -File .\push_clean.ps1
echo.
pause
