@echo off
chcp 65001 > nul
echo === box-downloader 実行 ===
echo.
npx tsx src/main.ts
echo.
pause
