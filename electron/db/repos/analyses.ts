import { randomUUID } from 'crypto';
import { getDb } from '../database';
import type { AnalysisDetail, AnalysisSummary, Finding, FileMeta } from '../../../shared/types';

interface AnalysisRow {
  id: string;
  product_id: string;
  started_at: number;
  completed_at: number | null;
  status: string;
  product_name: string | null;
  total_components: number;
  red_count: number;
  yellow_count: number;
  green_count: number;
  total_severity_json: string;
  risk_brief: string | null;
  elapsed_seconds: number;
  log_json: string;
  files_json: string;
}

interface FindingRow {
  id: string;
  analysis_id: string;
  component_name: string;
  manufacturer: string;
  part_number: string | null;
  material: string | null;
  risk_level: string | null;
  score: number;
  color: string;
  max_confidence: number;
  confidence_label: string;
  severity_json: string;
  likelihood_json: string;
  sources_json: string;
  severity_counts_json: string;
  match_count: number;
  matches_json: string;
  fmea_suggestions_json: string | null;
}

function rowToSummary(row: AnalysisRow): AnalysisSummary {
  return {
    id: row.id,
    productId: row.product_id,
    startedAt: row.started_at,
    completedAt: row.completed_at || undefined,
    status: row.status as AnalysisSummary['status'],
    productName: row.product_name || 'Unknown',
    totalComponents: row.total_components,
    redCount: row.red_count,
    yellowCount: row.yellow_count,
    greenCount: row.green_count,
    totalSeverity: JSON.parse(row.total_severity_json),
    riskBrief: row.risk_brief || undefined,
    elapsedSeconds: row.elapsed_seconds,
  };
}

function rowToFinding(row: FindingRow): Finding {
  return {
    id: row.id,
    componentName: row.component_name,
    manufacturer: row.manufacturer,
    partNumber: row.part_number || undefined,
    material: row.material || undefined,
    riskLevel: row.risk_level || undefined,
    score: row.score,
    color: row.color as Finding['color'],
    maxConfidence: row.max_confidence,
    confidenceLabel: row.confidence_label as Finding['confidenceLabel'],
    severity: JSON.parse(row.severity_json),
    likelihood: JSON.parse(row.likelihood_json),
    sources: JSON.parse(row.sources_json),
    severityCounts: JSON.parse(row.severity_counts_json),
    matchCount: row.match_count,
    matches: JSON.parse(row.matches_json),
    fmeaSuggestions: row.fmea_suggestions_json ? JSON.parse(row.fmea_suggestions_json) : undefined,
  };
}

export function createAnalysis(productId: string): string {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO analyses (id, product_id, started_at, status)
     VALUES (?, ?, ?, ?)`
  ).run(id, productId, Date.now(), 'running');
  return id;
}

export function completeAnalysis(
  id: string,
  detail: Omit<AnalysisDetail, 'id' | 'productId' | 'startedAt' | 'status'>
) {
  const db = getDb();
  const now = Date.now();
  db.prepare(
    `UPDATE analyses SET
      completed_at = ?,
      status = 'complete',
      product_name = ?,
      total_components = ?,
      red_count = ?,
      yellow_count = ?,
      green_count = ?,
      total_severity_json = ?,
      risk_brief = ?,
      elapsed_seconds = ?,
      log_json = ?,
      files_json = ?
    WHERE id = ?`
  ).run(
    detail.completedAt || now,
    detail.productName,
    detail.totalComponents,
    detail.redCount,
    detail.yellowCount,
    detail.greenCount,
    JSON.stringify(detail.totalSeverity),
    detail.riskBrief || null,
    detail.elapsedSeconds,
    JSON.stringify(detail.log),
    JSON.stringify(detail.files),
    id
  );

  // Insert findings
  const insertFinding = db.prepare(
    `INSERT INTO findings (
      id, analysis_id, component_name, manufacturer, part_number, material, risk_level,
      score, color, max_confidence, confidence_label,
      severity_json, likelihood_json, sources_json, severity_counts_json,
      match_count, matches_json, fmea_suggestions_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertMany = db.transaction((findings: Finding[]) => {
    for (const f of findings) {
      insertFinding.run(
        randomUUID(),
        id,
        f.componentName,
        f.manufacturer,
        f.partNumber || null,
        f.material || null,
        f.riskLevel || null,
        f.score,
        f.color,
        f.maxConfidence,
        f.confidenceLabel,
        JSON.stringify(f.severity),
        JSON.stringify(f.likelihood),
        JSON.stringify(f.sources),
        JSON.stringify(f.severityCounts),
        f.matchCount,
        JSON.stringify(f.matches),
        f.fmeaSuggestions ? JSON.stringify(f.fmeaSuggestions) : null
      );
    }
  });

  insertMany(detail.findings);
}

export function failAnalysis(id: string, errorMessage: string) {
  const db = getDb();
  db.prepare(
    `UPDATE analyses SET status = 'failed', completed_at = ?, risk_brief = ? WHERE id = ?`
  ).run(Date.now(), `Analysis failed: ${errorMessage}`, id);
}

export function getLatestAnalysis(productId: string): AnalysisSummary | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM analyses WHERE product_id = ? AND status = 'complete' ORDER BY started_at DESC LIMIT 1`
    )
    .get(productId) as AnalysisRow | undefined;
  return row ? rowToSummary(row) : null;
}

export function getPreviousAnalysis(productId: string): AnalysisSummary | null {
  // Returns the second-most-recent complete analysis (used to compute "new since last run")
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM analyses WHERE product_id = ? AND status = 'complete'
       ORDER BY started_at DESC LIMIT 1 OFFSET 1`
    )
    .get(productId) as AnalysisRow | undefined;
  return row ? rowToSummary(row) : null;
}

export function getAnalysisDetail(id: string): AnalysisDetail | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM analyses WHERE id = ?').get(id) as AnalysisRow | undefined;
  if (!row) return null;

  const findingRows = db
    .prepare('SELECT * FROM findings WHERE analysis_id = ? ORDER BY score DESC')
    .all(id) as FindingRow[];

  return {
    ...rowToSummary(row),
    findings: findingRows.map(rowToFinding),
    files: JSON.parse(row.files_json) as FileMeta[],
    log: JSON.parse(row.log_json) as string[],
  };
}

export function getFindingComponents(analysisId: string): Set<string> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT component_name, manufacturer FROM findings
       WHERE analysis_id = ? AND color != 'green'`
    )
    .all(analysisId) as { component_name: string; manufacturer: string }[];
  return new Set(rows.map((r) => `${r.component_name}|${r.manufacturer}`.toLowerCase()));
}
