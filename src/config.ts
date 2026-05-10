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

  // type: "service_account" を持つファイルをサービスアカウントキーとして判別
  for (const file of files) {
    const filePath = path.join(authDir, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (content.type === 'service_account') {
        return filePath;
      }
    } catch {
      // 解析失敗はスキップ
    }
  }

  throw new Error(
    'auth/ フォルダにサービスアカウントキー（type: "service_account"）が見つかりません。'
  );
}

/** waitRange に基づくランダム待機 */
export function randomWait(range: [number, number]): Promise<void> {
  const ms = Math.floor(Math.random() * (range[1] - range[0]) + range[0]);
  console.log(`  待機中... ${ms}ms`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
