@echo off
chcp 65001 > nul
echo === Googleドライブ 認証セットアップ ===
echo.
npx tsx src/setup-drive-auth.ts
echo.
pause
