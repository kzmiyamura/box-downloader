import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config';

const TOKEN_PATH = path.join(process.cwd(), 'auth', 'drive-token.json');
const REDIRECT_URI = 'http://localhost:3000/callback';

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

/** 保存済みトークンを使ってOAuth2クライアントを生成する */
function createOAuthClient(): OAuth2Client {
  const config = loadConfig();

  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error(
      'Googleドライブの認証トークンが見つかりません。先に setup-drive-auth.bat（Mac: setup-drive-auth.sh）を実行してください。'
    );
  }

  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
  const client = new OAuth2Client(config.oauthClientId, config.oauthClientSecret, REDIRECT_URI);
  client.setCredentials(tokens);

  // アクセストークン更新時にファイルへ保存
  client.on('tokens', (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2));
  });

  return client;
}

/** ファイルをGoogleドライブの指定フォルダへアップロードし、Web表示URLを返す */
export async function uploadToDrive(filePath: string, folderId: string): Promise<string> {
  const auth = createOAuthClient();
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
