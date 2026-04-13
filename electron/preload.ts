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
  ComponentNode,
  Folder,
  ActivityItem,
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

  // Components
  listComponents: (): Promise<ComponentNode[]> => ipcRenderer.invoke('components:list'),
  getComponent: (id: string): Promise<ComponentNode | null> => ipcRenderer.invoke('components:get', id),
  searchComponents: (query: string): Promise<ComponentNode[]> => ipcRenderer.invoke('components:search', query),
  getComponentsForProduct: (productId: string): Promise<ComponentNode[]> =>
    ipcRenderer.invoke('components:forProduct', productId),

  // Folders
  listFolders: (): Promise<Folder[]> => ipcRenderer.invoke('folders:list'),
  createFolder: (name: string): Promise<{ id: string }> => ipcRenderer.invoke('folders:create', name),
  renameFolder: (id: string, name: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('folders:rename', id, name),
  deleteFolder: (id: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('folders:delete', id),
  moveProductToFolder: (productId: string, folderId: string | null): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('folders:moveProduct', productId, folderId),

  // Activity
  getRecentActivity: (limit?: number): Promise<ActivityItem[]> => ipcRenderer.invoke('activity:recent', limit),
  getUnreadCount: (): Promise<number> => ipcRenderer.invoke('activity:unread'),
  markAllRead: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('activity:markAllRead'),
  markProductRead: (productId: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('activity:markProductRead', productId),

  // Search
  globalSearch: (query: string): Promise<{
    products: { id: string; name: string; type: 'product' }[];
    components: { id: string; name: string; manufacturer: string; type: 'component'; color: string }[];
  }> => ipcRenderer.invoke('search:global', query),

  // Analysis
  getAnalysis: (id: string): Promise<AnalysisDetail | null> => ipcRenderer.invoke('analysis:get', id),
  getLatestAnalysisForProduct: (productId: string): Promise<AnalysisDetail | null> =>
    ipcRenderer.invoke('analysis:getLatestForProduct', productId),
  runAnalysis: (req: AnalyzeRequest): Promise<{ ok: boolean; analysisId?: string; error?: string }> =>
    ipcRenderer.invoke('analysis:run', req),

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
