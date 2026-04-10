import type { ExtractedComponent } from '../../shared/types';

const OPENFDA_BASE = 'https://api.fda.gov/device/event.json';
const OPENFDA_RECALL_BASE = 'https://api.fda.gov/device/recall.json';
const TIMEOUT_MS = 15_000;
const MAX_CONCURRENT = 8;

export interface FdaResult {
  manufacturer: string;
  maudeReports: any[];
  recalls: any[];
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOnce(url: string): Promise<any[]> {
  try {
    const resp = await fetchWithTimeout(url, TIMEOUT_MS);
    if (resp.status === 404) return []; // openFDA returns 404 for empty results
    if (resp.status === 429) {
      // backoff and retry once
      await new Promise((r) => setTimeout(r, 2000));
      const retry = await fetchWithTimeout(url, TIMEOUT_MS);
      if (retry.status !== 200) return [];
      const data = (await retry.json()) as { results?: any[] };
      return data.results || [];
    }
    if (!resp.ok) return [];
    const data = (await resp.json()) as { results?: any[] };
    return data.results || [];
  } catch (err) {
    console.warn('openFDA fetch error:', (err as Error).message);
    return [];
  }
}

export async function queryMaude(componentName: string, manufacturer: string): Promise<any[]> {
  if (!manufacturer || manufacturer.toLowerCase() === 'unknown') return [];

  // Try precise: manufacturer + generic_name
  const precise = `${OPENFDA_BASE}?search=device.manufacturer_d_name:"${encodeURIComponent(
    manufacturer
  )}"+AND+device.generic_name:"${encodeURIComponent(componentName)}"&limit=50`;

  let results = await fetchOnce(precise);

  // Fall back to manufacturer-only
  if (results.length === 0) {
    const broad = `${OPENFDA_BASE}?search=device.manufacturer_d_name:"${encodeURIComponent(
      manufacturer
    )}"&limit=50`;
    results = await fetchOnce(broad);
  }

  return results;
}

export async function queryRecalls(manufacturer: string): Promise<any[]> {
  if (!manufacturer || manufacturer.toLowerCase() === 'unknown') return [];
  const url = `${OPENFDA_RECALL_BASE}?search=recalling_firm:"${encodeURIComponent(
    manufacturer
  )}"&limit=10`;
  return fetchOnce(url);
}

export async function retrieveFdaData(
  components: ExtractedComponent[],
  onProgress?: (msg: string) => void
): Promise<Map<string, FdaResult>> {
  const results = new Map<string, FdaResult>();
  let done = 0;

  // Simple semaphore via batched processing
  for (let i = 0; i < components.length; i += MAX_CONCURRENT) {
    const batch = components.slice(i, i + MAX_CONCURRENT);
    await Promise.all(
      batch.map(async (comp) => {
        const [maude, recalls] = await Promise.all([
          queryMaude(comp.name, comp.manufacturer),
          queryRecalls(comp.manufacturer),
        ]);
        results.set(comp.name, {
          manufacturer: comp.manufacturer,
          maudeReports: maude,
          recalls,
        });
        done++;
        if (onProgress) {
          if (maude.length > 0) {
            onProgress(`FDA: ${comp.manufacturer} / ${comp.name} — ${maude.length} reports`);
          } else {
            onProgress(`FDA: ${comp.manufacturer} / ${comp.name} — no reports`);
          }
        }
      })
    );
    if (onProgress) onProgress(`Queried FDA for ${done}/${components.length} components`);
  }

  return results;
}
