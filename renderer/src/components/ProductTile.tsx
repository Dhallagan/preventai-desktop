import { Link } from 'react-router-dom';
import type { ProductSummary } from '../../../shared/types';
import { formatRelativeTime } from '../lib/format';

interface ProductTileProps {
  summary: ProductSummary;
}

export default function ProductTile({ summary }: ProductTileProps) {
  const { product, latestAnalysis, newFindingCount } = summary;
  const red = latestAnalysis?.redCount ?? 0;
  const yellow = latestAnalysis?.yellowCount ?? 0;
  const green = latestAnalysis?.greenCount ?? 0;

  let statusLine = 'Not yet analyzed';
  if (latestAnalysis) {
    const parts: string[] = [];
    if (red > 0) parts.push(`${red} critical`);
    if (yellow > 0) parts.push(`${yellow} warning`);
    if (parts.length === 0) parts.push('All clear');
    statusLine = parts.join(' · ');
  }

  return (
    <Link
      to={`/product/${product.id}`}
      className="block border border-surface-border rounded-md p-4 bg-white hover:border-stone-400 transition-colors"
    >
      {newFindingCount > 0 && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-risk-high"></span>
          <span className="text-[10px] font-semibold text-risk-high uppercase tracking-wider">
            {newFindingCount} new
          </span>
        </div>
      )}
      <h3 className="text-sm font-semibold text-stone-900 mb-0.5">{product.name}</h3>
      <p className="text-[11px] text-stone-400 mb-3">{product.manufacturer || '—'}</p>
      <p className="text-xs text-stone-600 mb-1">
        {red > 0 && <span className="text-risk-high font-medium">{red} critical</span>}
        {red > 0 && (yellow > 0 || green > 0) && <span className="text-stone-300 mx-1">·</span>}
        {yellow > 0 && <span className="text-risk-med">{yellow} warning</span>}
        {yellow > 0 && green > 0 && <span className="text-stone-300 mx-1">·</span>}
        {green > 0 && <span className="text-stone-500">{green} clear</span>}
        {!latestAnalysis && <span className="text-stone-400">{statusLine}</span>}
      </p>
      <p className="text-[10px] text-stone-400 mono">
        Last: {formatRelativeTime(product.lastAnalyzedAt)}
      </p>
    </Link>
  );
}
