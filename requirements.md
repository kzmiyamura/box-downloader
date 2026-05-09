プロジェクト名: box-downloader

1. プロジェクト概要

古いWindows PCを「データ取得専用機」として活用し、GoogleスプレッドシートにリストアップされたBoxの共有URLから経歴書ファイルを自動取得、自組織のGoogleドライブへ転送するCUIバッチアプリケーション。

2. 技術スタック & 実行環境

Runtime: Node.js (LTS)

Language: TypeScript

Execution: tsx (TypeScript Execute) を使用。ビルド工程なしでTSを直接実行。

Browser Automation: Playwright (Chromium / Headlessモード)

Google API: google-spreadsheet, googleapis (認証: サービスアカウント JSON)

OS: Windows (古いPCでの稼働)

3. 設定と入力 (Config & Input)

A. 設定ファイル (config.json)

ユーザーがメモ帳等で簡単に編集できるよう、以下の項目を管理する。

spreadsheetUrl: 対象GoogleスプレッドシートのURL（ID抽出ロジックを実装すること）

driveFolderId: ファイルを保存するGoogleドライブのフォルダID

waitRange: 処理間の待機時間（ミリ秒、例: [3000, 7000]）

B. スプレッドシート構造

以下の3列構成（1行目はヘッダー）。

Column A (boxurl): Boxの共有URL（人間が入力）

Column B (driveurl): 保存済みGoogleドライブのリンク（自動出力）

Column C (実施): ステータス管理（空欄:未実施 / 成功 / 失敗）

4. 機能要件

A. メインループ

config.json を読み込み、スプレッドシートの「実施」列が空欄の行を抽出。

1件ずつ順次処理し、完了または失敗ごとに即座にスプレッドシートを更新する（べき等性の確保）。

同一URLの二重実行を防止するロジックを実装する。

B. Boxファイル取得 (Playwright)

Boxの共有URLからダウンロードを実行。

例外検知: パスワード保護、リンク切れ、ログイン要求画面を検知した場合は深追いせず、ステータスを「失敗」として記録する。

1件ごとに waitRange に基づくランダムな待機時間を入れ、ロボット検知を回避する。

C. Googleドライブ転送

取得したファイルをGoogleドライブの指定フォルダへアップロード。

ファイル名: [タイムスタンプ]_元のファイル名

アップロード成功後、Web表示用URLをスプレッドシートの driveurl 列に書き戻す。

D. Windows運用サポート

setup.bat: npm install と playwright install を行う環境構築用。

run.bat: npx tsx src/main.ts を実行し、終了後に pause する実行用。

5. 実装ルール (Claude Codeへの指示)

サービスアカウント認証を使用し、auth/ フォルダ内のJSON鍵を読み込むこと。

.gitignore に auth/, .env, node_modules/, temp/, config.json を含めること（config.json.example を提供すること）。

失敗時はデバッグ用スクリーンショットを temp/error_log/ に保存すること。

コード内のコメントやエラーメッセージは日本語にすること。

6. 人間の手作業

Google Cloudでサービスアカウントを作成し、JSON鍵を auth/ に設置。

スプレッドシートをサービスアカウントに「編集者」として共有。

config.json にスプレッドシートURLを設定して run.bat を実行。