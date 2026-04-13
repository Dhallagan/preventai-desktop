-- Components as first-class objects
CREATE TABLE IF NOT EXISTS components (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  material TEXT,
  part_number TEXT,
  risk_level TEXT,
  notes TEXT,
  first_seen_at INTEGER NOT NULL,
  -- Aggregate risk data (updated after each analysis)
  latest_score REAL NOT NULL DEFAULT 0,
  latest_color TEXT NOT NULL DEFAULT 'green',
  latest_severity_label TEXT,
  latest_likelihood_label TEXT,
  total_maude_matches INTEGER NOT NULL DEFAULT 0,
  UNIQUE(name, manufacturer)
);

CREATE INDEX IF NOT EXISTS idx_components_manufacturer ON components(manufacturer);
CREATE INDEX IF NOT EXISTS idx_components_color ON components(latest_color);

-- Which products contain which components
CREATE TABLE IF NOT EXISTS product_components (
  product_id TEXT NOT NULL,
  component_id TEXT NOT NULL,
  PRIMARY KEY (product_id, component_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
);

-- Folders for organizing products
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Add folder_id to products
ALTER TABLE products ADD COLUMN folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL;

-- Activity feed: track what changed and when
CREATE TABLE IF NOT EXISTS activity (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  component_id TEXT,
  type TEXT NOT NULL,  -- 'new_finding', 'finding_resolved', 'analysis_complete', 'product_added'
  title TEXT NOT NULL,
  detail TEXT,
  severity TEXT,       -- 'critical', 'serious', 'moderate', 'minor', 'info'
  created_at INTEGER NOT NULL,
  read_at INTEGER,     -- null = unread
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_unread ON activity(read_at) WHERE read_at IS NULL;

INSERT OR REPLACE INTO schema_version (version) VALUES (2);
