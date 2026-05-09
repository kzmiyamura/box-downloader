@echo off
chcp 65001 > nul
echo === box-downloader セットアップ ===
echo.

echo [1/2] npm パッケージをインストール中...
npm install
if %errorlevel% neq 0 (
  echo エラー: npm install に失敗しました。
  pause
  exit /b 1
)

echo.
echo [2/2] Playwright (Chromium) をインストール中...
npx playwright install chromium
if %errorlevel% neq 0 (
  echo エラー: Playwright のインストールに失敗しました。
  pause
  exit /b 1
)

echo.
echo ========================================
echo セットアップ完了！
echo.
echo 次の手順を実施してください：
echo  1. config.json.example を config.json にコピーして編集する
echo  2. auth\ フォルダを作成し、サービスアカウントの JSON キーを設置する
echo  3. run.bat を実行する
echo ========================================
pause
