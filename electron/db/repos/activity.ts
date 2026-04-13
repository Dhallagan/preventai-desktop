import { randomUUID } from 'crypto';
import { getDb } from '../database';

export interface ActivityRow {
  id: string;
  product_id: string | null;
  component_id: string | null;
  type: string;
  title: string;
  detail: string | null;
  severity: string | null;
  created_at: number;
  read_at: number | null;
}

export function addActivity(input: {
  productId?: string;
  componentId?: string;
  type: string;
  title: string;
  detail?: string;
  severity?: string;
}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO activity (id, product_id, component_id, type, title, detail, severity, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    input.productId || null,
    input.componentId || null,
    input.type,
    input.title,
    input.detail || null,
    input.severity || null,
    Date.now()
  );
}

export function getRecentActivity(limit = 50): ActivityRow[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM activity ORDER BY created_at DESC LIMIT ?')
    .all(limit) as ActivityRow[];
}

export function getUnreadActivity(): ActivityRow[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM activity WHERE read_at IS NULL ORDER BY created_at DESC')
    .all() as ActivityRow[];
}

export function getActivityForProduct(productId: string, limit = 50): ActivityRow[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM activity WHERE product_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(productId, limit) as ActivityRow[];
}

export function markAllRead() {
  const db = getDb();
  db.prepare('UPDATE activity SET read_at = ? WHERE read_at IS NULL').run(Date.now());
}

export function markProductRead(productId: string) {
  const db = getDb();
  db.prepare(
    'UPDATE activity SET read_at = ? WHERE product_id = ? AND read_at IS NULL'
  ).run(Date.now(), productId);
}
