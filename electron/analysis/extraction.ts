import Anthropic from '@anthropic-ai/sdk';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import type { ExtractedComponent } from '../../shared/types';

const MAX_CHUNK_CHARS = 500_000;

let extractionPromptCache: string | null = null;
function getExtractionPrompt(): string {
  if (extractionPromptCache) return extractionPromptCache;
  const candidates = [
    path.join(process.resourcesPath || '', 'prompts', 'extraction.txt'),
    path.join(__dirname, '..', 'prompts', 'extraction.txt'),
    path.join(app.getAppPath(), 'electron', 'prompts', 'extraction.txt'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      extractionPromptCache = fs.readFileSync(c, 'utf-8');
      return extractionPromptCache;
    }
  }
  throw new Error('extraction.txt prompt not found');
}

export async function parseFile(filename: string, buffer: Buffer): Promise<string> {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  } else if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else if (ext === '.txt' || ext === '.csv' || ext === '.md') {
    return buffer.toString('utf-8');
  }
  throw new Error(`Unsupported file type: ${ext}`);
}

export function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) return [text];

  const chunks: string[] = [];
  const sections = text.split('\n\n');
  let current = '';
  for (const section of sections) {
    if (current.length + section.length + 2 > MAX_CHUNK_CHARS) {
      if (current) chunks.push(current);
      current = section;
    } else {
      current = current ? current + '\n\n' + section : section;
    }
  }
  if (current) chunks.push(current);
  return chunks;
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

export interface ExtractionResult {
  components: ExtractedComponent[];
  productName?: string;
}

export async function extractComponents(
  client: Anthropic,
  text: string,
  docType: string,
  onProgress?: (msg: string) => void
): Promise<ExtractionResult> {
  const prompt = getExtractionPrompt();
  const chunks = chunkText(text);
  const allComponents: ExtractedComponent[] = [];
  let productName: string | undefined;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (onProgress) {
      if (chunks.length > 1) {
        onProgress(`Extracting from ${docType} (chunk ${i + 1}/${chunks.length})...`);
      } else {
        onProgress(`Extracting components from ${docType}...`);
      }
    }

    const filledPrompt = prompt.replace('{doc_type}', docType).replace('{text}', chunk);

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: filledPrompt }],
      });

      const block = response.content[0];
      if (block.type !== 'text') continue;
      const raw = stripJsonFences(block.text);

      const data = JSON.parse(raw) as {
        product_name?: string;
        components?: Array<{
          name?: string;
          manufacturer?: string;
          material?: string | null;
          part_number?: string;
          risk_level?: string;
          notes?: string;
        }>;
      };

      if (data.product_name && !productName) productName = data.product_name;
      if (data.components) {
        for (const c of data.components) {
          allComponents.push({
            name: c.name || 'Unknown',
            manufacturer: c.manufacturer || 'Unknown',
            material: c.material || undefined,
            partNumber: c.part_number,
            riskLevel: c.risk_level,
            notes: c.notes,
          });
        }
      }
    } catch (err) {
      console.warn(`Extraction error for ${docType} chunk ${i + 1}:`, err);
      if (onProgress) onProgress(`Warning: extraction failed for ${docType} chunk ${i + 1}`);
    }
  }

  // Deduplicate by name + manufacturer
  const seen = new Set<string>();
  const unique: ExtractedComponent[] = [];
  for (const c of allComponents) {
    const key = `${c.name.toLowerCase().trim()}|${c.manufacturer.toLowerCase().trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }

  if (onProgress) onProgress(`Extracted ${unique.length} unique components from ${docType}`);
  return { components: unique, productName };
}
