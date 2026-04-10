// Shared types between Electron main process and React renderer.

export type ScheduleFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'manual';

export interface Product {
  id: string;
  name: string;
  manufacturer?: string;
  schedule: ScheduleFrequency;
  createdAt: number;
  lastAnalyzedAt?: number;
  // File metadata is kept so we know what was uploaded.
  files: ProductFile[];
}

export interface ProductFile {
  label: 'Device Master Record' | 'Risk Management File' | 'Design History File';
  filename: string;
  sizeBytes: number;
  // We do NOT store file contents. Re-upload is required if user wants to re-extract.
}

export interface ProductSummary {
  product: Product;
  latestAnalysis?: AnalysisSummary;
  newFindingCount: number;
}

export interface AnalysisSummary {
  id: string;
  productId: string;
  startedAt: number;
  completedAt?: number;
  status: 'running' | 'complete' | 'failed';
  productName: string;
  totalComponents: number;
  redCount: number;
  yellowCount: number;
  greenCount: number;
  totalSeverity: Record<string, number>;
  riskBrief?: string;
  elapsedSeconds: number;
}

export interface AnalysisDetail extends AnalysisSummary {
  findings: Finding[];
  files: FileMeta[];
  log: string[];
}

export interface Finding {
  id: string;
  componentName: string;
  manufacturer: string;
  partNumber?: string;
  material?: string;
  riskLevel?: string;
  score: number;
  color: 'red' | 'yellow' | 'green';
  maxConfidence: number;
  confidenceLabel: 'HIGH' | 'MEDIUM' | 'LOW';
  severity: SeverityRating;
  likelihood: LikelihoodRating;
  sources: Source[];
  severityCounts: Record<string, number>;
  matchCount: number;
  matches: MaudeMatch[];
  fmeaSuggestions?: FmeaSuggestion[];
  isNew?: boolean;
}

export interface SeverityRating {
  level: 'critical' | 'serious' | 'moderate' | 'minor' | 'none';
  label: string;
  score: number;
}

export interface LikelihoodRating {
  level: 'high' | 'medium' | 'low' | 'none';
  label: string;
  score: number;
}

export interface Source {
  name: string;
  detail: string;
  weight: number;
}

export interface MaudeMatch {
  confidence: number;
  explanation: string;
  patientOutcome: string;
  deviceName: string;
  eventType: string;
  eventDescription: string;
  reportDate: string;
  reportManufacturer: string;
}

export interface FmeaSuggestion {
  failureMode: string;
  effect: string;
  severity: number;
  recommendedMitigation: string;
}

export interface FileMeta {
  label: string;
  filename: string;
  sizeBytes: number;
  textLength: number;
  componentsExtracted: number;
  components: ExtractedComponent[];
}

export interface ExtractedComponent {
  name: string;
  manufacturer: string;
  material?: string;
  partNumber?: string;
  riskLevel?: string;
  notes?: string;
}

export interface UploadFile {
  label: 'dmr' | 'risk_mgmt' | 'dhf';
  filename: string;
  // Buffer encoded as base64 for IPC transport
  data: string;
}

// IPC message contracts
export interface AnalyzeRequest {
  productId: string;
  productName?: string;
  schedule: ScheduleFrequency;
  files: UploadFile[];
}

export interface ProgressEvent {
  type: 'progress' | 'stage' | 'results' | 'error';
  message?: string;
  stage?: 'extract' | 'fda' | 'match' | 'summary' | 'fmea' | 'done';
  data?: AnalysisDetail;
}

export interface Settings {
  hasApiKey: boolean;
  defaultSchedule: ScheduleFrequency;
  dataPath: string;
  appVersion: string;
}
