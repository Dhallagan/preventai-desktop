import Anthropic from '@anthropic-ai/sdk';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import type {
  ExtractedComponent,
  Finding,
  MaudeMatch,
  SeverityRating,
  LikelihoodRating,
  Source,
} from '../../shared/types';
import type { FdaResult } from './retrieval';

const MAX_CONCURRENT_MATCHES = 12;

let matchingPromptCache: string | null = null;
function getMatchingPrompt(): string {
  if (matchingPromptCache) return matchingPromptCache;
  const candidates = [
    path.join(process.resourcesPath || '', 'prompts', 'matching.txt'),
    path.join(__dirname, '..', 'prompts', 'matching.txt'),
    path.join(app.getAppPath(), 'electron', 'prompts', 'matching.txt'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      matchingPromptCache = fs.readFileSync(c, 'utf-8');
      return matchingPromptCache;
    }
  }
  throw new Error('matching.txt prompt not found');
}

const SEVERITY_LEVEL: Record<string, 'critical' | 'serious' | 'moderate' | 'minor'> = {
  Death: 'critical',
  'Life Threatening': 'critical',
  Hospitalization: 'serious',
  'Required Intervention': 'serious',
  Disability: 'serious',
  'Congenital Anomaly': 'serious',
  Injury: 'moderate',
  Malfunction: 'minor',
  Other: 'minor',
  'No Answer Provided': 'minor',
  Unknown: 'minor',
};

const SEVERITY_RANK = { critical: 4, serious: 3, moderate: 2, minor: 1 } as const;

const SOURCE_WEIGHTS = {
  fda_recall_class_I: 1.0,
  fda_recall_class_II: 0.8,
  fda_recall_class_III: 0.5,
  fda_maude_death: 0.9,
  fda_maude_injury: 0.7,
  fda_maude_malfunction: 0.4,
  risk_file: 0.9,
};

function extractPatientOutcome(report: any): string {
  const patient = report.patient;
  if (Array.isArray(patient)) {
    for (const p of patient) {
      const outcomes = p?.sequence_number_outcome;
      if (Array.isArray(outcomes)) {
        for (const o of outcomes) {
          if (o && typeof o === 'string' && o.trim()) return o.trim();
        }
      }
    }
  }
  const eventType = report.event_type;
  if (typeof eventType === 'string' && eventType) {
    const map: Record<string, string> = {
      Death: 'Death',
      Injury: 'Injury',
      Malfunction: 'Malfunction',
      Other: 'Other',
      'No answer provided': 'Unknown',
    };
    return map[eventType] || eventType;
  }
  return 'Unknown';
}

function extractEventDescription(report: any): string {
  const texts = report.mdr_text;
  if (Array.isArray(texts)) {
    for (const t of texts) {
      if (t?.text_type_code === 'Description of Event or Problem' && t.text) {
        return String(t.text).slice(0, 500);
      }
    }
    if (texts[0]?.text) return String(texts[0].text).slice(0, 500);
  }
  return 'No description available';
}

function extractDeviceName(report: any): string {
  const devices = report.device;
  if (Array.isArray(devices) && devices[0]) {
    return devices[0].generic_name || 'Unknown device';
  }
  return 'Unknown device';
}

function extractManufacturerName(report: any): string {
  const devices = report.device;
  if (Array.isArray(devices) && devices[0]) {
    return devices[0].manufacturer_d_name || 'Unknown';
  }
  return 'Unknown';
}

function stripJsonFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) {
    const newlineIdx = s.indexOf('\n');
    s = newlineIdx >= 0 ? s.slice(newlineIdx + 1) : s.slice(3);
    if (s.endsWith('```')) s = s.slice(0, -3);
  }
  return s.trim();
}

async function matchSingle(
  client: Anthropic,
  component: ExtractedComponent,
  report: any,
  retryCount = 0
): Promise<MaudeMatch | null> {
  const prompt = getMatchingPrompt()
    .replace('{component_name}', component.name)
    .replace('{manufacturer}', component.manufacturer)
    .replace('{material}', component.material || 'Not specified')
    .replace('{device_name}', extractDeviceName(report))
    .replace('{report_manufacturer}', extractManufacturerName(report))
    .replace('{event_type}', report.event_type || 'Unknown')
    .replace('{patient_outcome}', extractPatientOutcome(report))
    .replace('{event_description}', extractEventDescription(report));

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const block = response.content[0];
    if (block.type !== 'text') return null;
    const raw = stripJsonFences(block.text);
    const result = JSON.parse(raw) as { match?: boolean; confidence?: number; explanation?: string };

    if (result.match && (result.confidence ?? 0) >= 3) {
      return {
        confidence: result.confidence ?? 5,
        explanation: result.explanation || '',
        patientOutcome: extractPatientOutcome(report),
        deviceName: extractDeviceName(report),
        eventType: report.event_type || 'Unknown',
        eventDescription: extractEventDescription(report),
        reportDate: report.date_received || 'Unknown',
        reportManufacturer: extractManufacturerName(report),
      };
    }
    return null;
  } catch (err: any) {
    // Rate limit retry
    if (err?.status === 429 && retryCount < 3) {
      const delay = 1000 * Math.pow(2, retryCount);
      await new Promise((r) => setTimeout(r, delay));
      return matchSingle(client, component, report, retryCount + 1);
    }
    return null;
  }
}

function computeSeverity(matches: MaudeMatch[], recalls: any[]): SeverityRating {
  if (matches.length === 0 && recalls.length === 0) {
    return { level: 'none', label: 'None', score: 0 };
  }

  let worstRank = 0;
  for (const m of matches) {
    const level = SEVERITY_LEVEL[m.patientOutcome] || 'minor';
    worstRank = Math.max(worstRank, SEVERITY_RANK[level]);
  }
  for (const r of recalls) {
    const cls = (r.classification || '') as string;
    if (cls.includes('Class I')) worstRank = Math.max(worstRank, 4);
    else if (cls.includes('Class II')) worstRank = Math.max(worstRank, 3);
  }

  const levelMap: Record<number, SeverityRating['level']> = {
    4: 'critical',
    3: 'serious',
     2: 'moderate',
    1: 'minor',
    0: 'none',
  };
  const labelMap: Record<string, string> = {
    critical: 'Critical',
    serious: 'Serious',
    moderate: 'Moderate',
    minor: 'Minor',
    none: 'None',
  };
  const scoreMap: Record<string, number> = { critical: 10, serious: 7, moderate: 4, minor: 2, none: 0 };

  const level = levelMap[worstRank] || 'minor';
  return { level, label: labelMap[level], score: scoreMap[level] };
}

function computeLikelihood(matches: MaudeMatch[], recalls: any[]): LikelihoodRating {
  if (matches.length === 0 && recalls.length === 0) {
    return { level: 'none', label: 'None', score: 0 };
  }

  let recentCount = 0;
  for (const m of matches) {
    const dateStr = m.reportDate;
    if (dateStr && dateStr.length >= 4) {
      const year = parseInt(dateStr.slice(0, 4), 10);
      if (!Number.isNaN(year) && year >= 2024) recentCount++;
    }
  }

  let score = 0;
  if (matches.length >= 20) score += 4;
  else if (matches.length >= 10) score += 3;
  else if (matches.length >= 5) score += 2;
  else if (matches.length >= 1) score += 1;

  if (recentCount >= 5) score += 3;
  else if (recentCount >= 2) score += 2;
  else if (recentCount >= 1) score += 1;

  if (recalls.length > 0) score += 3;
  score = Math.min(score, 10);

  let level: LikelihoodRating['level'];
  if (score >= 7) level = 'high';
  else if (score >= 4) level = 'medium';
  else level = 'low';

  const labelMap: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low', none: 'None' };
  return { level, label: labelMap[level], score };
}

function buildSources(matches: MaudeMatch[], recalls: any[], riskNotes?: string): Source[] {
  const sources: Source[] = [];

  if (matches.length > 0) {
    const counts: Record<string, number> = {};
    for (const m of matches) counts[m.patientOutcome] = (counts[m.patientOutcome] || 0) + 1;
    const death = counts.Death || 0;
    const injury = (counts.Injury || 0) + (counts.Hospitalization || 0) + (counts['Required Intervention'] || 0);
    const malf = counts.Malfunction || 0;
    const other = matches.length - death - injury - malf;
    const parts: string[] = [];
    if (death) parts.push(`${death} death`);
    if (injury) parts.push(`${injury} injury/hosp.`);
    if (malf) parts.push(`${malf} malf.`);
    if (other) parts.push(`${other} other`);

    const weight = death
      ? SOURCE_WEIGHTS.fda_maude_death
      : injury
        ? SOURCE_WEIGHTS.fda_maude_injury
        : SOURCE_WEIGHTS.fda_maude_malfunction;

    sources.push({
      name: 'FDA MAUDE',
      detail: `${matches.length} reports (${parts.join(', ')})`,
      weight,
    });
  }

  for (const r of recalls) {
    const cls = (r.classification || 'Unknown') as string;
    const reason = (r.reason_for_recall || '').slice(0, 100);
    const weightKey = cls.includes('Class I')
      ? 'fda_recall_class_I'
      : cls.includes('Class II')
        ? 'fda_recall_class_II'
        : 'fda_recall_class_III';
    sources.push({
      name: `FDA Recall (${cls})`,
      detail: reason || 'Recall on file',
      weight: SOURCE_WEIGHTS[weightKey as keyof typeof SOURCE_WEIGHTS],
    });
  }

  if (riskNotes) {
    sources.push({
      name: 'Risk Management File',
      detail: riskNotes,
      weight: SOURCE_WEIGHTS.risk_file,
    });
  }

  return sources;
}

function combinedScore(severity: SeverityRating, likelihood: LikelihoodRating): number {
  return Math.round(severity.score * likelihood.score * 10) / 10;
}

function assignColor(score: number): 'red' | 'yellow' | 'green' {
  if (score >= 40) return 'red';
  if (score >= 10) return 'yellow';
  return 'green';
}

function assignConfidenceLabel(confidence: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (confidence >= 8) return 'HIGH';
  if (confidence >= 5) return 'MEDIUM';
  return 'LOW';
}

export interface MatchResult {
  component: ExtractedComponent;
  matches: MaudeMatch[];
  score: number;
  color: 'red' | 'yellow' | 'green';
  maxConfidence: number;
  confidenceLabel: 'HIGH' | 'MEDIUM' | 'LOW';
  severity: SeverityRating;
  likelihood: LikelihoodRating;
  sources: Source[];
  severityCounts: Record<string, number>;
}

export async function matchComponents(
  client: Anthropic,
  components: ExtractedComponent[],
  fdaData: Map<string, FdaResult>,
  onProgress?: (msg: string) => void
): Promise<MatchResult[]> {
  const results: MatchResult[] = [];

  for (const comp of components) {
    const fda = fdaData.get(comp.name);
    const reports = fda?.maudeReports || [];
    const recalls = fda?.recalls || [];

    if (reports.length === 0 && recalls.length === 0) {
      results.push({
        component: comp,
        matches: [],
        score: 0,
        color: 'green',
        maxConfidence: 0,
        confidenceLabel: 'LOW',
        severity: { level: 'none', label: 'None', score: 0 },
        likelihood: { level: 'none', label: 'None', score: 0 },
        sources: [],
        severityCounts: {},
      });
      continue;
    }

    if (onProgress) onProgress(`Matching ${comp.name} against ${reports.length} MAUDE reports...`);

    // Run matches with concurrency limit
    const matches: MaudeMatch[] = [];
    for (let i = 0; i < reports.length; i += MAX_CONCURRENT_MATCHES) {
      const batch = reports.slice(i, i + MAX_CONCURRENT_MATCHES);
      const batchResults = await Promise.all(batch.map((r) => matchSingle(client, comp, r)));
      for (const m of batchResults) if (m) matches.push(m);
    }

    matches.sort((a, b) => b.confidence - a.confidence);

    const severityCounts: Record<string, number> = {};
    for (const m of matches) {
      severityCounts[m.patientOutcome] = (severityCounts[m.patientOutcome] || 0) + 1;
    }

    let riskNotes: string | undefined;
    if (comp.riskLevel && comp.riskLevel !== 'unknown') {
      riskNotes = `Risk level: ${comp.riskLevel}`;
      if (comp.notes) riskNotes += `. ${comp.notes}`;
    } else if (comp.notes) {
      riskNotes = comp.notes;
    }

    const severity = computeSeverity(matches, recalls);
    const likelihood = computeLikelihood(matches, recalls);
    const score = combinedScore(severity, likelihood);
    const sources = buildSources(matches, recalls, riskNotes);
    const maxConf = matches.reduce((max, m) => Math.max(max, m.confidence), 0);

    results.push({
      component: comp,
      matches,
      score,
      color: assignColor(score),
      maxConfidence: maxConf,
      confidenceLabel: assignConfidenceLabel(maxConf),
      severity,
      likelihood,
      sources,
      severityCounts,
    });

    if (onProgress) {
      onProgress(
        `  → ${matches.length} matches, score ${score} (${assignColor(score).toUpperCase()}) | sev: ${severity.label} | likely: ${likelihood.label}`
      );
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
