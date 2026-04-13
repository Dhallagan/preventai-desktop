import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ipc } from '../lib/ipc';
import type { ComponentNode, AnalysisDetail, Finding } from '../../../shared/types';
import MaudeTable from '../components/MaudeTable';
import FmeaSuggestions from '../components/FmeaSuggestions';

export default function ComponentPage() {
  const { id } = useParams<{ id: string }>();
  const [component, setComponent] = useState<ComponentNode | null>(null);
  const [loading, setLoading] = useState(true);

  // For each product this component belongs to, load the finding details
  const [productFindings, setProductFindings] = useState<
    { productId: string; productName: string; finding: Finding | null }[]
  >([]);

  useEffect(() => {
    if (!id) return;
    ipc.getComponent(id).then((c) => {
      setComponent(c);
      setLoading(false);
    });
  }, [id]);

  // Load findings for this component across products
  useEffect(() => {
    if (!component || !component.productNames) return;
    // We need to get the product IDs. Load products list and match by name
    ipc.listProducts().then(async (products) => {
      const results: typeof productFindings = [];
      for (const ps of products) {
        const detail = await ipc.getLatestAnalysisForProduct(ps.product.id);
        if (!detail) continue;
        const finding = detail.findings.find(
          (f) =>
            f.componentName.toLowerCase() === component.name.toLowerCase() &&
            f.manufacturer.toLowerCase() === component.manufacturer.toLowerCase()
        );
        if (finding) {
          results.push({
            productId: ps.product.id,
            productName: ps.product.name,
            finding,
          });
        }
      }
      setProductFindings(results);
    });
  }, [component]);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-sm text-stone-400">Loading...</p>
      </main>
    );
  }

  if (!component) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-sm text-stone-400">Component not found.</p>
      </main>
    );
  }

  const c = component;
  const sevColor: Record<string, string> = {
    Critical: 'text-risk-high',
    Serious: 'text-risk-med',
    Moderate: 'text-stone-600',
    Minor: 'text-stone-400',
  };
  const colorDot = c.latestColor === 'red' ? 'bg-risk-high' : c.latestColor === 'yellow' ? 'bg-risk-med' : 'bg-stone-300';

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start gap-3 mb-2">
            <span className={`w-3 h-3 rounded-full ${colorDot} mt-1 flex-shrink-0`}></span>
            <div>
              <h1 className="text-xl font-semibold text-stone-900">{c.name}</h1>
              <p className="text-sm text-stone-500">{c.manufacturer}</p>
            </div>
          </div>
        </div>

        {/* Properties (Obsidian-style) */}
        <div className="border border-surface-border rounded-md bg-white mb-6">
          <div className="px-4 py-2.5 border-b border-surface-border">
            <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Properties</p>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-y-2 gap-x-8 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-stone-400 w-24 flex-shrink-0 text-[11px]">manufacturer</span>
              <span className="text-stone-800">{c.manufacturer}</span>
            </div>
            {c.material && (
              <div className="flex items-center gap-3">
                <span className="text-stone-400 w-24 flex-shrink-0 text-[11px]">material</span>
                <span className="text-stone-800">{c.material}</span>
              </div>
            )}
            {c.partNumber && (
              <div className="flex items-center gap-3">
                <span className="text-stone-400 w-24 flex-shrink-0 text-[11px]">part number</span>
                <span className="text-stone-800 mono">{c.partNumber}</span>
              </div>
            )}
            {c.riskLevel && (
              <div className="flex items-center gap-3">
                <span className="text-stone-400 w-24 flex-shrink-0 text-[11px]">risk level</span>
                <span className="text-stone-800">{c.riskLevel}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="text-stone-400 w-24 flex-shrink-0 text-[11px]">severity</span>
              <span className={`font-medium ${sevColor[c.latestSeverityLabel || ''] || 'text-stone-400'}`}>
                {c.latestSeverityLabel || 'None'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-stone-400 w-24 flex-shrink-0 text-[11px]">likelihood</span>
              <span className="text-stone-800">{c.latestLikelihoodLabel || 'None'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-stone-400 w-24 flex-shrink-0 text-[11px]">score</span>
              <span className="text-stone-800 mono">{c.latestScore}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-stone-400 w-24 flex-shrink-0 text-[11px]">MAUDE matches</span>
              <span className="text-stone-800 mono">{c.totalMaudeMatches}</span>
            </div>
          </div>
        </div>

        {/* Used in products */}
        {c.productNames && c.productNames.length > 0 && (
          <div className="border border-surface-border rounded-md bg-white mb-6">
            <div className="px-4 py-2.5 border-b border-surface-border">
              <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">
                Used in {c.productNames.length} {c.productNames.length === 1 ? 'product' : 'products'}
              </p>
            </div>
            <div className="divide-y divide-stone-50">
              {productFindings.map((pf) => (
                <Link
                  key={pf.productId}
                  to={`/product/${pf.productId}`}
                  className="block px-4 py-2.5 hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-800">{pf.productName}</span>
                    {pf.finding && (
                      <span className="text-[10px] mono text-stone-400">
                        score {pf.finding.score}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* MAUDE reports from most recent analysis */}
        {productFindings.length > 0 && productFindings[0].finding && (
          <div className="border border-surface-border rounded-md bg-white mb-6">
            <div className="px-4 py-2.5 border-b border-surface-border">
              <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">
                MAUDE Reports ({productFindings[0].finding.matchCount})
              </p>
            </div>
            <div className="px-4 py-3">
              {productFindings[0].finding.matches[0]?.explanation && (
                <p className="text-[13px] text-stone-600 leading-relaxed mb-3">
                  {productFindings[0].finding.matches[0].explanation}
                </p>
              )}
              <MaudeTable matches={productFindings[0].finding.matches} />
            </div>
            <FmeaSuggestions suggestions={productFindings[0].finding.fmeaSuggestions} />
          </div>
        )}
      </div>
    </main>
  );
}
