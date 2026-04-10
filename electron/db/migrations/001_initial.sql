CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  manufacturer TEXT,
  schedule TEXT NOT NULL DEFAULT 'biweekly',
  created_at INTEGER NOT NULL,
  last_analyzed_at INTEGER,
  files_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  status TEXT NOT NULL,
  product_name TEXT,
  total_components INTEGER NOT NULL DEFAULT 0,
  red_count INTEGER NOT NULL DEFAULT 0,
  yellow_count INTEGER NOT NULL DEFAULT 0,
  green_count INTEGER NOT NULL DEFAULT 0,
  total_severity_json TEXT NOT NULL DEFAULT '{}',
  risk_brief TEXT,
  elapsed_seconds REAL NOT NULL DEFAULT 0,
  log_json TEXT NOT NULL DEFAULT '[]',
  files_json TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_analyses_product ON analyses(product_id);
CREATE INDEX IF NOT EXISTS idx_analyses_started ON analyses(started_at DESC);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  component_name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  part_number TEXT,
  material TEXT,
  risk_level TEXT,
  score REAL NOT NULL,
  color TEXT NOT NULL,
  max_confidence INTEGER NOT NULL,
  confidence_label TEXT NOT NULL,
  severity_json TEXT NOT NULL,
  likelihood_json TEXT NOT NULL,
  sources_json TEXT NOT NULL,
  severity_counts_json TEXT NOT NULL,
  match_count INTEGER NOT NULL,
  matches_json TEXT NOT NULL,
  fmea_suggestions_json TEXT,
  FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_findings_analysis ON findings(analysis_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_version (version) VALUES (1);
