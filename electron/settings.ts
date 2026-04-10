import keytar from 'keytar';
import { app } from 'electron';
import { getDb } from './db/database';
import type { ScheduleFrequency } from '../shared/types';

const KEYTAR_SERVICE = 'PreventAI';
const KEYTAR_ACCOUNT = 'anthropic_api_key';

export async function getApiKey(): Promise<string | null> {
  try {
    return await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
  } catch (err) {
    console.warn('Failed to read API key from keychain:', err);
    return null;
  }
}

export async function setApiKey(key: string): Promise<void> {
  await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, key);
}

export async function deleteApiKey(): Promise<void> {
  try {
    await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
  } catch {
    // ignore
  }
}

export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return !!key && key.length > 10;
}

// Simple key/value settings stored in SQLite
export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value || null;
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

export function getDefaultSchedule(): ScheduleFrequency {
  return (getSetting('default_schedule') as ScheduleFrequency) || 'biweekly';
}

export function setDefaultSchedule(s: ScheduleFrequency): void {
  setSetting('default_schedule', s);
}

export function getAppVersion(): string {
  return app.getVersion();
}

export function getDataPath(): string {
  return app.getPath('userData');
}
