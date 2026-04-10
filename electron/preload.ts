import { contextBridge, ipcRenderer } from 'electron';
import type {
  ProductSummary,
  Settings,
  AnalysisDetail,
  AnalyzeRequest,
  ScheduleFrequency,
  Product,
  AnalysisSummary,
  ProgressEvent,
} from '../shared/types';

const api = {
  // Settings
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  setApiKey: (key: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('settings:setApiKey', key),
  testApiKey: (key: string): Promise<{ ok: boolean; error?: string; response?: string }> =>
    ipcRenderer.invoke('settings:testApiKey', key),
  setDefaultSchedule: (s: ScheduleFrequency): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('settings:setDefaultSchedule', s),
  openDataFolder: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('settings:openDataFolder'),

  // Products
  listProducts: (): Promise<ProductSummary[]> => ipcRenderer.invoke('products:list'),
  getProduct: (id: string): Promise<{ product: Product; latest: AnalysisSummary | null } | null> =>
    ipcRenderer.invoke('products:get', id),
  createProduct: (input: {
    name: string;
    manufacturer?: string;
    schedule: ScheduleFrequency;
    files: { label: string; filename: string; sizeBytes: number }[];
  }): Promise<Product> => ipcRenderer.invoke('products:create', input),
  renameProduct: (id: string, name: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('products:rename', id, name),
  setProductSchedule: (id: string, schedule: ScheduleFrequency): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('products:setSchedule', id, schedule),
  deleteProduct: (id: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('products:delete', id),

  // Analysis
  getAnalysis: (id: string): Promise<AnalysisDetail | null> => ipcRenderer.invoke('analysis:get', id),
  getLatestAnalysisForProduct: (productId: string): Promise<AnalysisDetail | null> =>
    ipcRenderer.invoke('analysis:getLatestForProduct', productId),
  runAnalysis: (req: AnalyzeRequest): Promise<{ ok: boolean; analysisId?: string; error?: string }> =>
    ipcRenderer.invoke('analysis:run', req),

  // Event subscription for analysis progress
  onAnalysisEvent: (callback: (event: ProgressEvent) => void): (() => void) => {
    const handler = (_e: any, payload: ProgressEvent) => callback(payload);
    ipcRenderer.on('analysis:event', handler);
    return () => ipcRenderer.removeListener('analysis:event', handler);
  },

  // Misc
  openExternal: (url: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('app:openExternal', url),
};

contextBridge.exposeInMainWorld('preventai', api);

export type PreventAIApi = typeof api;
