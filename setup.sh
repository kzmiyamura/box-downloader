#!/bin/bash
echo "=== box-downloader セットアップ ==="
echo ""

echo "[1/2] npm パッケージをインストール中..."
npm install
if [ $? -ne 0 ]; then
  echo "エラー: npm install に失敗しました。"
  exit 1
fi

echo ""
echo "[2/2] Playwright (Chromium) をインストール中..."
npx playwright install chromium
if [ $? -ne 0 ]; then
  echo "エラー: Playwright のインストールに失敗しました。"
  exit 1
fi

echo ""
echo "========================================"
echo "セットアップ完了！"
echo ""
echo "次の手順を実施してください："
echo "  1. config.json.example を config.json にコピーして編集する"
echo "  2. auth/ フォルダを作成し、サービスアカウントの JSON キーを設置する"
echo "  3. run.sh を実行する"
echo "========================================"
