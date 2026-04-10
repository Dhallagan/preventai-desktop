import { randomUUID } from 'crypto';
import { getDb } from '../database';
import type { Product, ProductFile, ScheduleFrequency } from '../../../shared/types';

interface ProductRow {
  id: string;
  name: string;
  manufacturer: string | null;
  schedule: string;
  created_at: number;
  last_analyzed_at: number | null;
  files_json: string;
}

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    manufacturer: row.manufacturer || undefined,
    schedule: row.schedule as ScheduleFrequency,
    createdAt: row.created_at,
    lastAnalyzedAt: row.last_analyzed_at || undefined,
    files: JSON.parse(row.files_json) as ProductFile[],
  };
}

export function listProducts(): Product[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM products ORDER BY last_analyzed_at DESC NULLS LAST, created_at DESC')
    .all() as ProductRow[];
  return rows.map(rowToProduct);
}

export function getProduct(id: string): Product | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined;
  return row ? rowToProduct(row) : null;
}

export function createProduct(input: {
  name: string;
  manufacturer?: string;
  schedule: ScheduleFrequency;
  files: ProductFile[];
}): Product {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  db.prepare(
    `INSERT INTO products (id, name, manufacturer, schedule, created_at, files_json)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, input.name, input.manufacturer || null, input.schedule, now, JSON.stringify(input.files));

  return {
    id,
    name: input.name,
    manufacturer: input.manufacturer,
    schedule: input.schedule,
    createdAt: now,
    files: input.files,
  };
}

export function updateProductAnalyzedAt(id: string, when: number) {
  const db = getDb();
  db.prepare('UPDATE products SET last_analyzed_at = ? WHERE id = ?').run(when, id);
}

export function updateProductName(id: string, name: string) {
  const db = getDb();
  db.prepare('UPDATE products SET name = ? WHERE id = ?').run(name, id);
}

export function updateProductSchedule(id: string, schedule: ScheduleFrequency) {
  const db = getDb();
  db.prepare('UPDATE products SET schedule = ? WHERE id = ?').run(schedule, id);
}

export function updateProductFiles(id: string, files: ProductFile[]) {
  const db = getDb();
  db.prepare('UPDATE products SET files_json = ? WHERE id = ?').run(JSON.stringify(files), id);
}

export function deleteProduct(id: string) {
  const db = getDb();
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
}
