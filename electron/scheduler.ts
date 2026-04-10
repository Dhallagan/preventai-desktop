import type { ScheduleFrequency, Product } from '../shared/types';
import { listProducts } from './db/repos/products';

const DAY_MS = 24 * 60 * 60 * 1000;

const FREQUENCY_DAYS: Record<ScheduleFrequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  manual: Infinity,
};

export function isAnalysisDue(product: Product, now: number = Date.now()): boolean {
  if (product.schedule === 'manual') return false;
  if (!product.lastAnalyzedAt) return true;
  const days = FREQUENCY_DAYS[product.schedule];
  return now - product.lastAnalyzedAt >= days * DAY_MS;
}

export function getProductsDueForAnalysis(): Product[] {
  const now = Date.now();
  return listProducts().filter((p) => isAnalysisDue(p, now));
}

export function nextDueAt(product: Product): number | null {
  if (product.schedule === 'manual') return null;
  if (!product.lastAnalyzedAt) return Date.now();
  const days = FREQUENCY_DAYS[product.schedule];
  return product.lastAnalyzedAt + days * DAY_MS;
}
