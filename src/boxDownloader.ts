import { chromium, Page, Download } from 'playwright';
import * as path from 'path';

/** BoxのURLからファイルをダウンロードし、保存先パスを返す */
export async function downloadFromBox(
  boxUrl: string,
  downloadDir: string,
  errorLogDir: string
): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    console.log(`  ページ読み込み中: ${boxUrl}`);
    await page.goto(boxUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // ページが落ち着くまで待機（最大15秒）
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      // タイムアウトしても続行
    });

    // エラー状態の検知
    await checkForErrors(page, errorLogDir);

    // ダウンロードを実行
    const download = await triggerDownload(page, errorLogDir);

    // ファイル名にタイムスタンプを付与して保存
    const suggestedFilename = download.suggestedFilename() || 'downloaded_file';
    const timestamp = new Date()
      .toISOString()
      .replace(/T/, '_')
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const fileName = `${timestamp}_${suggestedFilename}`;
    const destPath = path.join(downloadDir, fileName);

    await download.saveAs(destPath);
    console.log(`  ダウンロード完了: ${fileName}`);

    return destPath;
  } finally {
    await context.close();
    await browser.close();
  }
}

/** パスワード保護・リンク切れ・ログイン要求を検知する */
async function checkForErrors(page: Page, errorLogDir: string): Promise<void> {
  const currentUrl = page.url();

  // ログイン要求の検知（URLベース）
  if (
    currentUrl.includes('/login') ||
    currentUrl.includes('/account/login') ||
    currentUrl.includes('sso.services.box.net')
  ) {
    await saveErrorScreenshot(page, errorLogDir, 'login_required');
    throw new Error('ログインが要求されました（共有リンクがログイン必須になっています）');
  }

  // パスワード保護の検知
  const passwordInputCount = await page.locator('input[type="password"]').count();
  if (passwordInputCount > 0) {
    await saveErrorScreenshot(page, errorLogDir, 'password_protected');
    throw new Error('パスワードで保護されています');
  }

  // ページ本文のテキストでエラーを検知
  const bodyText = (await page.locator('body').textContent()) ?? '';
  const errorPatterns: Array<{ pattern: string; label: string }> = [
    { pattern: 'Link Not Found',                                        label: 'リンクが見つかりません' },
    { pattern: 'This shared link has expired',                          label: '共有リンクの有効期限切れ' },
    { pattern: 'This link has been disabled',                           label: '共有リンクが無効化されています' },
    { pattern: 'The shared link you are trying',                        label: 'リンクエラー' },
    { pattern: 'shared file or folder link has been removed',           label: '共有リンクが削除または無効です' },
    { pattern: 'is unavailable to you',                                 label: '共有リンクにアクセスできません' },
    { pattern: 'リンクが見つかりません',                                   label: 'リンクが見つかりません' },
    { pattern: 'リンクの有効期限が切れています',                            label: 'リンクの期限切れ' },
  ];

  for (const { pattern, label } of errorPatterns) {
    if (bodyText.includes(pattern)) {
      await saveErrorScreenshot(page, errorLogDir, 'link_error');
      throw new Error(`リンクエラー: ${label}`);
    }
  }
}

/** ダウンロードボタンを探してクリックし、ダウンロードオブジェクトを返す */
async function triggerDownload(page: Page, errorLogDir: string): Promise<Download> {
  // Box UIで使われるダウンロードボタンのセレクター候補（優先順）
  const selectors = [
    '[data-resin-target="download"]',
    '[data-testid="download-button"]',
    'button[aria-label="Download"]',
    'button[aria-label="ダウンロード"]',
    '[role="button"][aria-label*="Download"]',
    'button:has-text("Download")',
    'button:has-text("ダウンロード")',
    'a:has-text("Download")',
    '.bcpr-btn-download',
  ];

  let downloadButton = null;
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const visible = await locator.isVisible({ timeout: 2000 }).catch(() => false);
    if (visible) {
      downloadButton = locator;
      console.log(`  ダウンロードボタン検出: ${selector}`);
      break;
    }
  }

  if (!downloadButton) {
    await saveErrorScreenshot(page, errorLogDir, 'no_download_button');
    throw new Error('ダウンロードボタンが見つかりませんでした（Boxのページ構造が変わった可能性があります）');
  }

  // ダウンロードイベントを待機してからボタンをクリック
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await downloadButton.click();
  const download = await downloadPromise;

  // ダウンロード失敗チェック
  const failure = await download.failure();
  if (failure) {
    throw new Error(`ダウンロードに失敗しました: ${failure}`);
  }

  return download;
}

/** エラー時のスクリーンショットを保存する */
async function saveErrorScreenshot(
  page: Page,
  errorLogDir: string,
  label: string
): Promise<void> {
  try {
    const timestamp = new Date()
      .toISOString()
      .replace(/T/, '_')
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const screenshotPath = `${errorLogDir}/${timestamp}_${label}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  エラースクリーンショット保存: ${screenshotPath}`);
  } catch {
    // スクリーンショット保存失敗は無視して処理を続ける
  }
}
