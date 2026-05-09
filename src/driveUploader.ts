import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import { findServiceAccountKey } from './config';

/** 拡張子からMIMEタイプを取得する */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.pdf':  'application/pdf',
    '.doc':  'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls':  'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt':  'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.zip':  'application/zip',
    '.txt':  'text/plain',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  return mimeMap[ext] ?? 'application/octet-stream';
}

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
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

/** ファイルをGoogleドライブの指定フォルダへアップロードし、Web表示URLを返す */
export async function uploadToDrive(filePath: string, folderId: string): Promise<string> {
  const auth = createAuth();
  const drive = google.drive({ version: 'v3', auth });

  const fileName = path.basename(filePath);
  const mimeType = getMimeType(filePath);

  console.log(`  Googleドライブへアップロード中: ${fileName}`);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: fs.createReadStream(filePath),
    },
    fields: 'id,webViewLink',
  });

  const fileId = response.data.id;
  const webViewLink = response.data.webViewLink;

  if (!fileId || !webViewLink) {
    throw new Error(
      'Googleドライブへのアップロードは成功しましたが、ファイルURLの取得に失敗しました'
    );
  }

  console.log(`  アップロード完了: ${webViewLink}`);
  return webViewLink;
}
