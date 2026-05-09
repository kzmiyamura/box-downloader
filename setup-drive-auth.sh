#!/bin/bash
echo "=== Googleドライブ 認証セットアップ ==="
echo ""
npx tsx src/setup-drive-auth.ts
echo ""
read -p "Enterキーを押すと終了します..."
