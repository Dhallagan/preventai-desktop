import { randomUUID } from 'crypto';
import { getDb } from '../database';

export interface ComponentRow {
  id: string;
  name: string;
  manufacturer: string;
  material: string | null;
  part_number: string | null;
  risk_level: string | null;
  notes: string | null;
  first_seen_at: number;
  latest_score: number;
  latest_color: string;
  latest_severity_label: string | null;
  latest_likelihood_label: string | null;
  total_maude_matches: number;
}

export function upsertComponent(input: {
  name: string;
  manufacturer: string;
  material?: string;
  partNumber?: string;
  riskLevel?: string;
  notes?: string;
}): string {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM components WHERE name = ? AND manufacturer = ?')
    .get(input.name, input.manufacturer) as { id: string } | undefined;

  if (existing) {
    // Update optional fields if provided
    if (input.material || input.partNumber || input.riskLevel) {
      db.prepare(
        `UPDATE components SET
          material = COALESCE(?, material),
          part_number = COALESCE(?, part_number),
          risk_level = COALESCE(?, risk_level),
          notes = COALESCE(?, notes)
        WHERE id = ?`
      ).run(
        input.material || null,
        input.partNumber || null,
        input.riskLevel || null,
        input.notes || null,
        existing.id
      );
    }
    return existing.id;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO components (id, name, manufacturer, material, part_number, risk_level, notes, first_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.name,
    input.manufacturer,
    input.material || null,
    input.partNumber || null,
    input.riskLevel || null,
    input.notes || null,
    Date.now()
  );
  return id;
}

export function updateComponentRisk(
  componentId: string,
  score: number,
  color: string,
  severityLabel: string | undefined,
  likelihoodLabel: string | undefined,
  maudeMatches: number
) {
  const db = getDb();
  db.prepare(
    `UPDATE components SET
      latest_score = ?,
      latest_color = ?,
      latest_severity_label = ?,
      latest_likelihood_label = ?,
      total_maude_matches = ?
    WHERE id = ?`
  ).run(score, color, severityLabel || null, likelihoodLabel || null, maudeMatches, componentId);
}

export function linkComponentToProduct(productId: string, componentId: string) {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO product_components (product_id, component_id) VALUES (?, ?)`
  ).run(productId, componentId);
}

export function getComponent(id: string): ComponentRow | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM components WHERE id = ?').get(id) as ComponentRow) || null;
}

export function listComponents(): ComponentRow[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM components ORDER BY latest_score DESC, name ASC')
    .all() as ComponentRow[];
}

export function getComponentsForProduct(productId: string): ComponentRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT c.* FROM components c
       JOIN product_components pc ON c.id = pc.component_id
       WHERE pc.product_id = ?
       ORDER BY c.latest_score DESC`
    )
    .all(productId) as ComponentRow[];
}

export function getProductsForComponent(componentId: string): { id: string; name: string }[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT p.id, p.name FROM products p
       JOIN product_components pc ON p.id = pc.product_id
       WHERE pc.component_id = ?
       ORDER BY p.name`
    )
    .all(componentId) as { id: string; name: string }[];
}

export function searchComponents(query: string): ComponentRow[] {
  const db = getDb();
  const pattern = `%${query}%`;
  return db
    .prepare(
      `SELECT * FROM components
       WHERE name LIKE ? OR manufacturer LIKE ? OR material LIKE ? OR part_number LIKE ?
       ORDER BY latest_score DESC
       LIMIT 50`
    )
    .all(pattern, pattern, pattern, pattern) as ComponentRow[];
}
