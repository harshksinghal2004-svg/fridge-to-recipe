@echo off
chcp 65001 >nul
echo ===================================================
echo   Starting FridgeChef AI Server on http://localhost:3001
echo ===================================================
echo.
.\.venv\Scripts\python.exe main.py
pause
