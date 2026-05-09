import { GoogleSpreadsheet, GoogleSpreadsheetRow, GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import * as fs from 'fs';
import { findServiceAccountKey } from './config';

/** サービスアカウントで認証したJWTを生成する */
function createAuth(): JWT {
  const keyPath = findServiceAccountKey();
  const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf-8')) as {
    client_email: string;
    private_key: string;
  };

  return new JWT({
    email: keyFile.client_email,
    key: keyFile.private_key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });
}

/** スプレッドシートに接続して最初のシートを返す */
export async function createSpreadsheetClient(
  spreadsheetId: string
): Promise<GoogleSpreadsheetWorksheet> {
  const auth = createAuth();
  const doc = new GoogleSpreadsheet(spreadsheetId, auth);
  await doc.loadInfo();
  console.log(`スプレッドシート接続完了: "${doc.title}"`);

  const sheet = doc.sheetsByIndex[0];
  await sheet.loadHeaderRow();
  return sheet;
}

/** 「実施」列が空欄の未処理行を返す */
export async function getUnprocessedRows(
  sheet: GoogleSpreadsheetWorksheet
): Promise<GoogleSpreadsheetRow[]> {
  const rows = await sheet.getRows();
  return rows.filter((row) => {
    const status = row.get('実施') as string | undefined;
    return !status || status.trim() === '';
  });
}

/** 成功時: driveurl とステータスを更新する */
export async function updateRowSuccess(
  row: GoogleSpreadsheetRow,
  driveUrl: string
): Promise<void> {
  row.set('driveurl', driveUrl);
  row.set('実施', '成功');
  await row.save();
}

/** 失敗時: ステータスを「失敗」に更新する */
export async function updateRowFailure(row: GoogleSpreadsheetRow): Promise<void> {
  row.set('実施', '失敗');
  await row.save();
}
