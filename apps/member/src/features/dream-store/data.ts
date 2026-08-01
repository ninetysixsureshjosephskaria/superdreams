import type { StockStatus } from '@superdreams/api-client';

/**
 * Presentation helpers for the Dream Store catalog. Product data comes from the
 * backend (`/api/v1/dream-store/catalog`); these helpers only derive the
 * decorative card visuals (gradient + monogram) and stock labels.
 */

export const STOCK_LABEL: Record<StockStatus, string> = {
  IN_STOCK: 'In stock',
  LOW_STOCK: 'Low stock',
  OUT_OF_STOCK: 'Out of stock',
};

export function stockVariant(status: StockStatus): 'success' | 'warning' | 'secondary' {
  if (status === 'IN_STOCK') return 'success';
  if (status === 'LOW_STOCK') return 'warning';
  return 'secondary';
}

const GRADIENTS: readonly string[] = [
  'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #10b981 0%, #22d3ee 100%)',
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #f97316 0%, #eab308 100%)',
];

/** Deterministic decorative gradient derived from a stable key (e.g. product id). */
export function gradientFor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return GRADIENTS[hash % GRADIENTS.length] as string;
}

/** Up-to-two-letter monogram from a product name. */
export function monogramFor(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'SD';
  const first = words[0]![0] ?? 'S';
  const second = words[1]?.[0] ?? words[0]![1] ?? 'D';
  return `${first}${second}`.toUpperCase();
}
