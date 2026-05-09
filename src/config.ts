import * as fs from 'fs';
import * as path from 'path';
import { Config } from './types';

/** config.json を読み込んで検証する */
export function loadConfig(): Config {
  const configPath = path.join(process.cwd(), 'config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(
      'config.json が見つかりません。config.json.example をコピーして設定してください。'
    );
  }

  let config: Config;
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(raw) as Config;
  } catch {
    throw new Error('config.json の解析に失敗しました。JSON形式を確認してください。');
  }

  if (!config.spreadsheetUrl) {
    throw new Error('config.json: spreadsheetUrl が設定されていません。');
  }
  if (!config.driveFolderId) {
    throw new Error('config.json: driveFolderId が設定されていません。');
  }
  if (!Array.isArray(config.waitRange) || config.waitRange.length !== 2) {
    throw new Error('config.json: waitRange が正しく設定されていません。例: [3000, 7000]');
  }
  if (!config.oauthClientId) {
    throw new Error('config.json: oauthClientId が設定されていません。');
  }
  if (!config.oauthClientSecret) {
    throw new Error('config.json: oauthClientSecret が設定されていません。');
  }

  return config;
}

/** スプレッドシートURLからIDを抽出する */
export function extractSpreadsheetId(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error(
      'スプレッドシートURLからIDを抽出できませんでした。URLを確認してください。'
    );
  }
  return match[1];
}

/** auth/ フォルダ内のサービスアカウントJSONキーのパスを返す */
export function findServiceAccountKey(): string {
  const authDir = path.join(process.cwd(), 'auth');
  if (!fs.existsSync(authDir)) {
    throw new Error(
      'auth/ フォルダが見つかりません。サービスアカウントのJSONキーを auth/ フォルダに設置してください。'
    );
  }

  const files = fs.readdirSync(authDir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    throw new Error('auth/ フォルダにJSONキーファイルが見つかりません。');
  }
  if (files.length > 1) {
    console.warn(`警告: auth/ フォルダに複数のJSONファイルがあります。${files[0]} を使用します。`);
  }

  return path.join(authDir, files[0]);
}

/** waitRange に基づくランダム待機 */
export function randomWait(range: [number, number]): Promise<void> {
  const ms = Math.floor(Math.random() * (range[1] - range[0]) + range[0]);
  console.log(`  待機中... ${ms}ms`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
