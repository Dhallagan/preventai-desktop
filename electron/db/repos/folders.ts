import { randomUUID } from 'crypto';
import { getDb } from '../database';

export interface FolderRow {
  id: string;
  name: string;
  sort_order: number;
  created_at: number;
}

export function listFolders(): FolderRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM folders ORDER BY sort_order, name').all() as FolderRow[];
}

export function createFolder(name: string): string {
  const db = getDb();
  const id = randomUUID();
  const maxOrder = (
    db.prepare('SELECT MAX(sort_order) as m FROM folders').get() as { m: number | null }
  )?.m ?? 0;
  db.prepare(
    'INSERT INTO folders (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)'
  ).run(id, name, maxOrder + 1, Date.now());
  return id;
}

export function renameFolder(id: string, name: string) {
  const db = getDb();
  db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name, id);
}

export function deleteFolder(id: string) {
  const db = getDb();
  // Products in this folder get folder_id = null
  db.prepare('UPDATE products SET folder_id = NULL WHERE folder_id = ?').run(id);
  db.prepare('DELETE FROM folders WHERE id = ?').run(id);
}

export function moveProductToFolder(productId: string, folderId: string | null) {
  const db = getDb();
  db.prepare('UPDATE products SET folder_id = ? WHERE id = ?').run(folderId, productId);
}
