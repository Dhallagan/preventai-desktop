import { ipcMain, BrowserWindow, app, shell } from 'electron';
import Anthropic from '@anthropic-ai/sdk';
import {
  listProducts,
  createProduct,
  getProduct,
  updateProductAnalyzedAt,
  updateProductName,
  updateProductSchedule,
  updateProductFiles,
  deleteProduct,
} from './db/repos/products';
import {
  createAnalysis,
  completeAnalysis,
  failAnalysis,
  getLatestAnalysis,
  getPreviousAnalysis,
  getAnalysisDetail,
  getFindingComponents,
} from './db/repos/analyses';
import {
  getApiKey,
  setApiKey,
  hasApiKey,
  getDefaultSchedule,
  setDefaultSchedule,
  getAppVersion,
  getDataPath,
} from './settings';
import { parseFile, extractComponents } from './analysis/extraction';
import { retrieveFdaData } from './analysis/retrieval';
import { matchComponents } from './analysis/matching';
import { generateSummary } from './analysis/summary';
import { generateFmeaSuggestions } from './analysis/fmea';
import type {
  AnalyzeRequest,
  ProductSummary,
  ScheduleFrequency,
  Settings,
  Finding,
  FileMeta,
  ExtractedComponent,
  AnalysisDetail,
} from '../shared/types';

export function registerIpcHandlers() {
  // Settings
  ipcMain.handle('settings:get', async (): Promise<Settings> => {
    return {
      hasApiKey: await hasApiKey(),
      defaultSchedule: getDefaultSchedule(),
      dataPath: getDataPath(),
      appVersion: getAppVersion(),
    };
  });

  ipcMain.handle('settings:setApiKey', async (_e, key: string) => {
    await setApiKey(key);
    return { ok: true };
  });

  ipcMain.handle('settings:testApiKey', async (_e, key: string) => {
    try {
      const client = new Anthropic({ apiKey: key });
      const resp = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 20,
        messages: [{ role: 'user', content: 'reply with the word "ok"' }],
      });
      return { ok: true, response: resp.content[0].type === 'text' ? resp.content[0].text : 'ok' };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Unknown error' };
    }
  });

  ipcMain.handle('settings:setDefaultSchedule', async (_e, s: ScheduleFrequency) => {
    setDefaultSchedule(s);
    return { ok: true };
  });

  ipcMain.handle('settings:openDataFolder', async () => {
    await shell.openPath(getDataPath());
    return { ok: true };
  });

  // Products
  ipcMain.handle('products:list', async (): Promise<ProductSummary[]> => {
    const products = listProducts();
    return products.map((p) => {
      const latest = getLatestAnalysis(p.id);
      const prev = getPreviousAnalysis(p.id);

      let newFindingCount = 0;
      if (latest && prev) {
        const latestComps = getFindingComponents(latest.id);
        const prevComps = getFindingComponents(prev.id);
        for (const c of latestComps) {
          if (!prevComps.has(c)) newFindingCount++;
        }
      }

      return { product: p, latestAnalysis: latest || undefined, newFindingCount };
    });
  });

  ipcMain.handle('products:get', async (_e, id: string) => {
    const product = getProduct(id);
    if (!product) return null;
    const latest = getLatestAnalysis(id);
    return { product, latest };
  });

  ipcMain.handle('products:create', async (_e, input: {
    name: string;
    manufacturer?: string;
    schedule: ScheduleFrequency;
    files: { label: string; filename: string; sizeBytes: number }[];
  }) => {
    const product = createProduct({
      name: input.name,
      manufacturer: input.manufacturer,
      schedule: input.schedule,
      files: input.files as any,
    });
    return product;
  });

  ipcMain.handle('products:rename', async (_e, id: string, name: string) => {
    updateProductName(id, name);
    return { ok: true };
  });

  ipcMain.handle('products:setSchedule', async (_e, id: string, schedule: ScheduleFrequency) => {
    updateProductSchedule(id, schedule);
    return { ok: true };
  });

  ipcMain.handle('products:delete', async (_e, id: string) => {
    deleteProduct(id);
    return { ok: true };
  });

  // Analysis
  ipcMain.handle('analysis:get', async (_e, analysisId: string) => {
    return getAnalysisDetail(analysisId);
  });

  ipcMain.handle('analysis:getLatestForProduct', async (_e, productId: string) => {
    const latest = getLatestAnalysis(productId);
    if (!latest) return null;
    const detail = getAnalysisDetail(latest.id);
    if (!detail) return null;

    // Compute "isNew" flag for findings by diffing against previous analysis
    const prev = getPreviousAnalysis(productId);
    if (prev) {
      const prevComps = getFindingComponents(prev.id);
      detail.findings = detail.findings.map((f) => ({
        ...f,
        isNew:
          f.color !== 'green' &&
          !prevComps.has(`${f.componentName}|${f.manufacturer}`.toLowerCase()),
      }));
    }
    return detail;
  });

  // Run analysis (the big one). Streams progress events back to the renderer.
  ipcMain.handle('analysis:run', async (e, req: AnalyzeRequest) => {
    const senderWindow = BrowserWindow.fromWebContents(e.sender);
    const send = (channel: string, payload: any) => {
      if (senderWindow && !senderWindow.isDestroyed()) {
        senderWindow.webContents.send(channel, payload);
      }
    };

    const apiKey = await getApiKey();
    if (!apiKey) {
      send('analysis:event', { type: 'error', message: 'No API key configured' });
      return { ok: false, error: 'No API key configured' };
    }

    let analysisId: string | null = null;
    try {
      analysisId = createAnalysis(req.productId);
      const startTime = Date.now();
      const log: string[] = [];
      const onProgress = (msg: string) => {
        log.push(msg);
        send('analysis:event', { type: 'progress', message: msg });
      };

      // Update product files metadata
      updateProductFiles(
        req.productId,
        req.files.map((f) => ({
          label:
            f.label === 'dmr'
              ? 'Device Master Record'
              : f.label === 'risk_mgmt'
                ? 'Risk Management File'
                : 'Design History File',
          filename: f.filename,
          sizeBytes: Buffer.from(f.data, 'base64').length,
        }))
      );

      const client = new Anthropic({ apiKey });

      // Parse files
      const parsedFiles: { label: string; filename: string; text: string; sizeBytes: number }[] = [];
      for (const f of req.files) {
        const buf = Buffer.from(f.data, 'base64');
        const label =
          f.label === 'dmr'
            ? 'Device Master Record'
            : f.label === 'risk_mgmt'
              ? 'Risk Management File'
              : 'Design History File';
        try {
          const text = await parseFile(f.filename, buf);
          if (!text.trim()) {
            send('analysis:event', { type: 'progress', message: `Warning: ${label} appears empty` });
            continue;
          }
          parsedFiles.push({ label, filename: f.filename, text, sizeBytes: buf.length });
        } catch (err: any) {
          send('analysis:event', {
            type: 'progress',
            message: `Could not parse ${label}: ${err.message}`,
          });
        }
      }

      if (parsedFiles.length === 0) {
        const errMsg = 'No files could be parsed.';
        failAnalysis(analysisId, errMsg);
        send('analysis:event', { type: 'error', message: errMsg });
        return { ok: false, error: errMsg };
      }

      // Stage 1: Extraction (parallel per file)
      send('analysis:event', { type: 'stage', stage: 'extract' });
      const extractions = await Promise.all(
        parsedFiles.map((f) => extractComponents(client, f.text, f.label, onProgress))
      );

      const allComponents: ExtractedComponent[] = [];
      let productName: string | undefined;
      const perFileComponents: Record<string, ExtractedComponent[]> = {};

      for (let i = 0; i < extractions.length; i++) {
        const r = extractions[i];
        const f = parsedFiles[i];
        perFileComponents[f.label] = r.components;
        allComponents.push(...r.components);
        if (r.productName && !productName) productName = r.productName;
      }

      // Deduplicate across files
      const seen = new Set<string>();
      const uniqueComponents: ExtractedComponent[] = [];
      for (const c of allComponents) {
        const key = `${c.name.toLowerCase().trim()}|${c.manufacturer.toLowerCase().trim()}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueComponents.push(c);
        }
      }

      onProgress(
        `Total: ${uniqueComponents.length} unique components across ${parsedFiles.length} documents`
      );

      if (uniqueComponents.length === 0) {
        const errMsg = 'No components found in uploaded documents.';
        failAnalysis(analysisId, errMsg);
        send('analysis:event', { type: 'error', message: errMsg });
        return { ok: false, error: errMsg };
      }

      // Stage 2: openFDA queries
      send('analysis:event', { type: 'stage', stage: 'fda' });
      onProgress('Querying FDA MAUDE database...');
      const fdaData = await retrieveFdaData(uniqueComponents, onProgress);

      // Stage 3: Semantic matching
      send('analysis:event', { type: 'stage', stage: 'match' });
      onProgress('Matching adverse events against your components...');
      const matchResults = await matchComponents(client, uniqueComponents, fdaData, onProgress);

      // Stage 4: FMEA suggestions for top flagged items (parallel)
      send('analysis:event', { type: 'stage', stage: 'fmea' });
      onProgress('Generating FMEA suggestions for flagged components...');
      const flagged = matchResults.filter((r) => r.color !== 'green').slice(0, 5);
      const fmeaResults = await Promise.all(flagged.map((r) => generateFmeaSuggestions(client, r)));
      const fmeaMap = new Map<string, ReturnType<typeof generateFmeaSuggestions>>();
      flagged.forEach((r, i) => {
        (matchResults.find((mr) => mr === r) as any)._fmea = fmeaResults[i];
      });

      // Stage 5: Risk brief
      send('analysis:event', { type: 'stage', stage: 'summary' });
      const riskContext = parsedFiles.find((f) => f.label === 'Risk Management File')?.text.slice(0, 3000) || '';
      const riskBrief = await generateSummary(
        client,
        productName || 'Unknown Device',
        uniqueComponents.length,
        matchResults,
        riskContext,
        onProgress
      );

      const elapsed = (Date.now() - startTime) / 1000;
      onProgress(`Analysis complete in ${elapsed.toFixed(1)}s`);
      send('analysis:event', { type: 'stage', stage: 'done' });

      // Build counts
      const redCount = matchResults.filter((r) => r.color === 'red').length;
      const yellowCount = matchResults.filter((r) => r.color === 'yellow').length;
      const greenCount = matchResults.filter((r) => r.color === 'green').length;

      const totalSeverity: Record<string, number> = {};
      for (const r of matchResults) {
        for (const [k, v] of Object.entries(r.severityCounts)) {
          totalSeverity[k] = (totalSeverity[k] || 0) + v;
        }
      }

      // Build findings (with FMEA suggestions attached)
      const findings: Finding[] = matchResults.map((r) => ({
        id: '', // assigned by DB layer
        componentName: r.component.name,
        manufacturer: r.component.manufacturer,
        partNumber: r.component.partNumber,
        material: r.component.material,
        riskLevel: r.component.riskLevel,
        score: r.score,
        color: r.color,
        maxConfidence: r.maxConfidence,
        confidenceLabel: r.confidenceLabel,
        severity: r.severity,
        likelihood: r.likelihood,
        sources: r.sources,
        severityCounts: r.severityCounts,
        matchCount: r.matches.length,
        matches: r.matches.slice(0, 20),
        fmeaSuggestions: (r as any)._fmea || [],
      }));

      // Build file metadata
      const files: FileMeta[] = parsedFiles.map((f) => ({
        label: f.label,
        filename: f.filename,
        sizeBytes: f.sizeBytes,
        textLength: f.text.length,
        componentsExtracted: (perFileComponents[f.label] || []).length,
        components: perFileComponents[f.label] || [],
      }));

      const detail: Omit<AnalysisDetail, 'id' | 'productId' | 'startedAt' | 'status'> = {
        completedAt: Date.now(),
        productName: productName || 'Uploaded Device',
        totalComponents: uniqueComponents.length,
        redCount,
        yellowCount,
        greenCount,
        totalSeverity,
        riskBrief,
        elapsedSeconds: elapsed,
        findings,
        files,
        log,
      };

      completeAnalysis(analysisId, detail);
      updateProductAnalyzedAt(req.productId, Date.now());

      // Update product name if Claude detected one and user left it as default
      const currentProduct = getProduct(req.productId);
      if (productName && currentProduct && (currentProduct.name === 'Untitled Product' || !currentProduct.name.trim())) {
        updateProductName(req.productId, productName);
      }

      // Build the full detail to send back
      const finalDetail: AnalysisDetail = {
        id: analysisId,
        productId: req.productId,
        startedAt: startTime,
        status: 'complete',
        ...detail,
      };

      send('analysis:event', { type: 'results', data: finalDetail });
      return { ok: true, analysisId };
    } catch (err: any) {
      console.error('Analysis failed:', err);
      const errMsg = err?.message || 'Analysis failed';
      if (analysisId) failAnalysis(analysisId, errMsg);
      send('analysis:event', { type: 'error', message: errMsg });
      return { ok: false, error: errMsg };
    }
  });

  // Window helpers
  ipcMain.handle('app:openExternal', async (_e, url: string) => {
    await shell.openExternal(url);
    return { ok: true };
  });
}
