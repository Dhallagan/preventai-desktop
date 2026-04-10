import type { PreventAIApi } from '../../../electron/preload';

declare global {
  interface Window {
    preventai: PreventAIApi;
  }
}

export const ipc: PreventAIApi = window.preventai;
