import Anthropic from '@anthropic-ai/sdk';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import type { MatchResult } from './matching';

let summaryPromptCache: string | null = null;
function getSummaryPrompt(): string {
  if (summaryPromptCache) return summaryPromptCache;
  const candidates = [
    path.join(process.resourcesPath || '', 'prompts', 'summary.txt'),
    path.join(__dirname, '..', 'prompts', 'summary.txt'),
    path.join(app.getAppPath(), 'electron', 'prompts', 'summary.txt'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      summaryPromptCache = fs.readFileSync(c, 'utf-8');
      return summaryPromptCache;
    }
  }
  throw new Error('summary.txt prompt not found');
}

export async function generateSummary(
  client: Anthropic,
  productName: string,
  totalComponents: number,
  results: MatchResult[],
  riskContext: string,
  onProgress?: (msg: string) => void
): Promise<string> {
  if (onProgress) onProgress('Generating risk brief...');

  const flagged = results.filter((r) => r.color !== 'green');
  if (flagged.length === 0) {
    return 'No adverse event signals detected. All components have a clean record in the FDA MAUDE database.';
  }

  const findingsTextParts = flagged.slice(0, 8).map((r) => {
    const sc = r.severityCounts;
    const sevParts: string[] = [];
    if (sc.Death) sevParts.push(`${sc.Death} death-related`);
    if (sc.Injury) sevParts.push(`${sc.Injury} injury`);
    if (sc.Malfunction) sevParts.push(`${sc.Malfunction} malfunction`);

    const explanations = r.matches
      .slice(0, 3)
      .map((m) => m.explanation)
      .filter(Boolean);

    return `- ${r.component.name} (${r.component.manufacturer})
  Score: ${r.score} | ${r.matches.length} MAUDE matches | Confidence: ${r.confidenceLabel} (${r.maxConfidence}/10)
  Severity: ${sevParts.join(', ') || 'no severity data'}
  Match reasons: ${explanations.join('; ') || 'N/A'}
  Component risk level: ${r.component.riskLevel || 'unknown'}`;
  });

  const findingsText = findingsTextParts.join('\n\n');

  const prompt = getSummaryPrompt()
    .replace('{product_name}', productName || 'Unknown Device')
    .replace('{total_components}', String(totalComponents))
    .replace('{findings_text}', findingsText)
    .replace('{risk_context}', riskContext || 'No risk management file context available.');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const block = response.content[0];
    if (block.type !== 'text') return 'Risk brief generation returned no text.';
    if (onProgress) onProgress('Risk brief generated');
    return block.text.trim();
  } catch (err) {
    console.warn('Summary generation failed:', err);
    if (onProgress) onProgress('Warning: could not generate risk brief');
    return 'Risk brief generation failed. Review individual findings below.';
  }
}
