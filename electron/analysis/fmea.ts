import Anthropic from '@anthropic-ai/sdk';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import type { FmeaSuggestion } from '../../shared/types';
import type { MatchResult } from './matching';

let fmeaPromptCache: string | null = null;
function getFmeaPrompt(): string {
  if (fmeaPromptCache) return fmeaPromptCache;
  const candidates = [
    path.join(process.resourcesPath || '', 'prompts', 'fmea.txt'),
    path.join(__dirname, '..', 'prompts', 'fmea.txt'),
    path.join(app.getAppPath(), 'electron', 'prompts', 'fmea.txt'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      fmeaPromptCache = fs.readFileSync(c, 'utf-8');
      return fmeaPromptCache;
    }
  }
  throw new Error('fmea.txt prompt not found');
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

export async function generateFmeaSuggestions(
  client: Anthropic,
  result: MatchResult
): Promise<FmeaSuggestion[]> {
  // Only generate for components with meaningful findings
  if (result.matches.length === 0 || result.color === 'green') return [];

  const findingsText = result.matches
    .slice(0, 10)
    .map(
      (m) =>
        `- [${m.eventType}] outcome=${m.patientOutcome} confidence=${m.confidence}/10\n  ${m.explanation}\n  Description: ${m.eventDescription.slice(0, 200)}`
    )
    .join('\n');

  const prompt = getFmeaPrompt()
    .replace('{component_name}', result.component.name)
    .replace('{manufacturer}', result.component.manufacturer)
    .replace('{material}', result.component.material || 'Not specified')
    .replace('{findings_text}', findingsText);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const block = response.content[0];
    if (block.type !== 'text') return [];
    const raw = stripJsonFences(block.text);
    const data = JSON.parse(raw) as { suggestions?: any[] };

    if (!Array.isArray(data.suggestions)) return [];

    return data.suggestions
      .filter((s) => s && s.failure_mode)
      .map((s) => ({
        failureMode: String(s.failure_mode),
        effect: String(s.effect || ''),
        severity: Number(s.severity) || 5,
        recommendedMitigation: String(s.recommended_mitigation || ''),
      }));
  } catch (err) {
    console.warn('FMEA generation failed for', result.component.name, err);
    return [];
  }
}
