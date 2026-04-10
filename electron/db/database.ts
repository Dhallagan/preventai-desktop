import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  const dbPath = path.join(userDataPath, 'preventai.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);
  return db;
}

export function getDbPath(): string {
  return path.join(app.getPath('userData'), 'preventai.db');
}

function runMigrations(database: Database.Database) {
  const migrationsDir = getMigrationsDir();
  if (!fs.existsSync(migrationsDir)) {
    console.warn('Migrations directory not found:', migrationsDir);
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // Get current schema version. If table doesn't exist, version is 0.
  let currentVersion = 0;
  try {
    const row = database
      .prepare('SELECT MAX(version) as v FROM schema_version')
      .get() as { v: number | null } | undefined;
    currentVersion = row?.v ?? 0;
  } catch {
    currentVersion = 0;
  }

  for (const file of files) {
    const match = file.match(/^(\d+)_/);
    if (!match) continue;
    const fileVersion = parseInt(match[1], 10);
    if (fileVersion <= currentVersion) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`Running migration: ${file}`);
    database.exec(sql);
  }
}

function getMigrationsDir(): string {
  // In dev: __dirname is dist-electron/electron/db, source is electron/db/migrations
  // In packaged app: extraResources puts migrations at process.resourcesPath/migrations
  const candidates = [
    path.join(process.resourcesPath || '', 'migrations'),
    path.join(__dirname, 'migrations'),
    path.join(__dirname, '..', '..', 'electron', 'db', 'migrations'),
    path.join(app.getAppPath(), 'electron', 'db', 'migrations'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
