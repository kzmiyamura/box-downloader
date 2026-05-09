import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, extractSpreadsheetId, randomWait } from './config';
import { createSpreadsheetClient, getUnprocessedRows, updateRowSuccess, updateRowFailure } from './spreadsheet';
import { downloadFromBox } from './boxDownloader';
import { uploadToDrive } from './driveUploader';

async function main(): Promise<void> {
  console.log('=== box-downloader 開始 ===');
  console.log(`実行日時: ${new Date().toLocaleString('ja-JP')}`);
  console.log();

  // 作業ディレクトリを確保
  const tempDownloadDir = path.join(process.cwd(), 'temp', 'downloads');
  const errorLogDir     = path.join(process.cwd(), 'temp', 'error_log');
  fs.mkdirSync(tempDownloadDir, { recursive: true });
  fs.mkdirSync(errorLogDir,     { recursive: true });

  // 設定読み込み
  const config = loadConfig();
  const spreadsheetId = extractSpreadsheetId(config.spreadsheetUrl);

  // スプレッドシート接続
  const sheet = await createSpreadsheetClient(spreadsheetId);

  // 未処理行の取得
  const rows = await getUnprocessedRows(sheet);
  console.log(`未処理件数: ${rows.length} 件\n`);

  if (rows.length === 0) {
    console.log('処理対象がありません。終了します。');
    return;
  }

  // 二重実行防止用: このセッション内で処理済みのURL
  const processedUrls = new Set<string>();

  let successCount = 0;
  let failureCount = 0;

  for (const row of rows) {
    const boxUrl = (row.get('boxurl') as string | undefined)?.trim() ?? '';

    if (!boxUrl) {
      console.log(`行 ${row.rowNumber}: URLが空のためスキップ`);
      continue;
    }

    if (processedUrls.has(boxUrl)) {
      console.log(`行 ${row.rowNumber}: 同一URLが既に処理済みのためスキップ: ${boxUrl}`);
      continue;
    }

    console.log(`--- 行 ${row.rowNumber} 処理開始 ---`);
    console.log(`URL: ${boxUrl}`);

    let downloadedFilePath: string | null = null;

    try {
      // 1. Boxからダウンロード
      downloadedFilePath = await downloadFromBox(boxUrl, tempDownloadDir, errorLogDir);

      // 2. Googleドライブへアップロード
      const driveUrl = await uploadToDrive(downloadedFilePath, config.driveFolderId);

      // 3. スプレッドシートを成功で更新
      await updateRowSuccess(row, driveUrl);

      processedUrls.add(boxUrl);
      successCount++;
      console.log(`行 ${row.rowNumber}: 完了 ✓\n`);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`行 ${row.rowNumber}: 失敗 - ${message}`);

      // スプレッドシートを失敗で更新
      try {
        await updateRowFailure(row);
      } catch (updateError) {
        console.error(`行 ${row.rowNumber}: スプレッドシート更新にも失敗しました:`, updateError);
      }

      failureCount++;
      console.log();

    } finally {
      // 一時ファイルの削除
      if (downloadedFilePath && fs.existsSync(downloadedFilePath)) {
        try {
          fs.unlinkSync(downloadedFilePath);
        } catch {
          // 削除失敗は無視
        }
      }
    }

    // 次の処理まで待機（最後の行は待機不要）
    if (row !== rows[rows.length - 1]) {
      await randomWait(config.waitRange);
    }
  }

  console.log('=== 処理完了 ===');
  console.log(`成功: ${successCount} 件 / 失敗: ${failureCount} 件`);
}

main().catch((err: unknown) => {
  console.error('\n致命的エラーが発生しました:');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
