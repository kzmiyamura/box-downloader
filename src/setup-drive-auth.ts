/**
 * Googleドライブ認証セットアップ（初回のみ実行）
 * ブラウザでGoogleアカウントにログインして認証トークンを取得・保存します。
 */
import { OAuth2Client } from 'google-auth-library';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config';

const TOKEN_PATH = path.join(process.cwd(), 'auth', 'drive-token.json');
const REDIRECT_URI = 'http://localhost:3000/callback';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

async function main(): Promise<void> {
  const config = loadConfig();

  const oAuth2Client = new OAuth2Client(
    config.oauthClientId,
    config.oauthClientSecret,
    REDIRECT_URI
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('=== Googleドライブ 認証セットアップ ===');
  console.log('');
  console.log('以下のURLをブラウザで開いて、Googleアカウントでログインしてください:');
  console.log('');
  console.log(authUrl);
  console.log('');
  console.log('ログイン後、自動的に認証が完了します...');

  // ローカルHTTPサーバーで認証コードを受け取る
  const code = await waitForAuthCode();

  const { tokens } = await oAuth2Client.getToken(code);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

  console.log('');
  console.log('認証完了！auth/drive-token.json に保存しました。');
  console.log('次回から run.bat（Mac: run.sh）で実行できます。');
}

function waitForAuthCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url) return;

      const urlObj = new URL(req.url, 'http://localhost:3000');
      const code  = urlObj.searchParams.get('code');
      const error = urlObj.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h2>認証がキャンセルされました。このタブを閉じてください。</h2>');
        server.close();
        reject(new Error(`認証エラー: ${error}`));
        return;
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h2>認証完了！このタブを閉じてください。</h2>');
        server.close();
        resolve(code);
      }
    });

    server.listen(3000, () => {
      console.log('認証待機中... (ポート3000)');
    });

    server.on('error', (err) => {
      reject(new Error(`サーバー起動エラー: ${err.message}`));
    });

    // 5分でタイムアウト
    setTimeout(() => {
      server.close();
      reject(new Error('認証がタイムアウトしました（5分）。もう一度実行してください。'));
    }, 5 * 60 * 1000);
  });
}

main().catch((err: unknown) => {
  console.error('エラー:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
