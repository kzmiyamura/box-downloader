# box-downloader

GoogleスプレッドシートにリストアップされたBoxの共有URLから経歴書ファイルを自動取得し、自組織のGoogleドライブへ転送するCUIバッチアプリです。

## 動作環境

| 項目 | 内容 |
|---|---|
| Runtime | Node.js (LTS) |
| 言語 | TypeScript（tsx で直接実行） |
| ブラウザ自動化 | Playwright (Headless Chromium) |
| 対応OS | Windows / Mac |

---

## セットアップ手順

### 1. Google Cloud Console の設定

#### サービスアカウント（スプレッドシート用）

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. 「APIとサービス」→「ライブラリ」で以下を**有効化**
   - `Google Sheets API`
   - `Google Drive API`
3. 「認証情報」→「認証情報を作成」→「サービスアカウント」で作成
4. 作成したサービスアカウント →「キー」タブ →「鍵を追加」→「JSON」でダウンロード
5. ダウンロードしたJSONを `auth/` フォルダに設置

#### OAuth2クライアント（Googleドライブアップロード用）

1. 「Google Auth Platform」→「対象」→ 対象ユーザー: **外部** で作成
2. 「対象」→「テストユーザー」に自分のGmailアドレスを追加
3. 「クライアント」→「クライアントを作成」→ アプリの種類: **デスクトップアプリ**
4. 作成された **クライアントID** と **クライアントシークレット** を `config.json` に設定

### 2. スプレッドシートの準備

1. Googleスプレッドシートを新規作成
2. **1行目（ヘッダー）** に以下を入力

   | A列 | B列 | C列 |
   |---|---|---|
   | `boxurl` | `driveurl` | `実施` |

3. A列にBoxの共有URLを入力
4. スプレッドシートをサービスアカウントのメールアドレス（`xxxx@yyyy.iam.gserviceaccount.com`）に**編集者**として共有

### 3. Googleドライブの準備

1. ファイルの保存先フォルダを作成
2. フォルダをサービスアカウントのメールアドレスに**編集者**として共有
3. フォルダのIDをコピー（URLの末尾）
   ```
   https://drive.google.com/drive/folders/【このID】
   ```

### 4. config.json の設定

`config.json.example` を `config.json` にコピーして編集します。

```json
{
  "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit",
  "driveFolderId": "YOUR_GOOGLE_DRIVE_FOLDER_ID",
  "waitRange": [3000, 7000],
  "oauthClientId": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "oauthClientSecret": "YOUR_CLIENT_SECRET"
}
```

| 項目 | 説明 |
|---|---|
| `spreadsheetUrl` | 対象スプレッドシートのURL |
| `driveFolderId` | 保存先GoogleドライブフォルダのID |
| `waitRange` | 処理間の待機時間（ミリ秒）。ランダムで選ばれる |
| `oauthClientId` | OAuth2クライアントID |
| `oauthClientSecret` | OAuth2クライアントシークレット |

### 5. 環境構築（初回のみ）

**Windows:**
```
setup.bat をダブルクリック
```

**Mac:**
```bash
./setup.sh
```

### 6. Googleドライブ認証（初回のみ）

**Windows:**
```
setup-drive-auth.bat をダブルクリック
```

**Mac:**
```bash
./setup-drive-auth.sh
```

実行するとURLが表示されます。ブラウザでそのURLを開き、Googleアカウントでログインしてください。完了すると `auth/drive-token.json` が自動保存されます。

---

## 実行方法

**Windows:**
```
run.bat をダブルクリック
```

**Mac:**
```bash
./run.sh
```

### 処理の流れ

1. `config.json` を読み込む
2. スプレッドシートの「実施」列が**空欄**の行を取得
3. 各行のBoxURLにアクセスしてファイルをダウンロード
4. ダウンロードしたファイルをGoogleドライブにアップロード（ファイル名: `タイムスタンプ_元のファイル名`）
5. スプレッドシートに結果を書き戻す
   - 成功: `driveurl` 列にGoogleドライブのURL、`実施` 列に `成功`
   - 失敗: `実施` 列に `失敗`

---

## エラー時の確認

| 状況 | 確認先 |
|---|---|
| パスワード保護されたリンク | `実施` 列が `失敗`、`temp/error_log/` にスクリーンショット |
| リンク切れ・無効なURL | 同上 |
| ログイン要求 | 同上 |

エラースクリーンショットは `temp/error_log/` フォルダに保存されます。

---

## ファイル構成

```
box-downloader/
├── src/
│   ├── main.ts                # メインループ
│   ├── config.ts              # 設定読み込み・共通ユーティリティ
│   ├── spreadsheet.ts         # Googleスプレッドシート操作
│   ├── boxDownloader.ts       # Playwright によるBoxダウンロード
│   ├── driveUploader.ts       # Googleドライブアップロード（OAuth2）
│   ├── setup-drive-auth.ts    # Googleドライブ認証セットアップ
│   └── types.ts               # 型定義
├── auth/                      # 認証ファイル置き場（gitignore対象）
│   ├── service-account.json   # サービスアカウントキー（要設置）
│   └── drive-token.json       # OAuth2トークン（自動生成）
├── temp/                      # 一時ファイル（gitignore対象）
│   └── error_log/             # エラー時スクリーンショット
├── config.json                # 設定ファイル（gitignore対象）
├── config.json.example        # 設定ファイルのサンプル
├── setup.bat / setup.sh       # 環境構築スクリプト
├── setup-drive-auth.bat / .sh # Googleドライブ認証スクリプト
└── run.bat / run.sh           # 実行スクリプト
```

---

## 注意事項

- `config.json` / `auth/` / `temp/` は `.gitignore` により除外されています。機密情報をコミットしないよう注意してください。
- Boxのページ構造が変わった場合、ダウンロードボタンの検出に失敗することがあります。`temp/error_log/` のスクリーンショットで確認してください。
