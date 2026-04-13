import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ipc } from '../lib/ipc';
import type { ProductSummary, ActivityItem, Folder } from '../../../shared/types';
import { formatRelativeTime } from '../lib/format';
import ProductTile from '../components/ProductTile';

export default function Dashboard() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ipc.listProducts(),
      ipc.getRecentActivity(10),
      ipc.listFolders(),
    ]).then(([p, a, f]) => {
      setProducts(p);
      setActivity(a);
      setFolders(f);
      setLoading(false);
    });
  }, []);

  const unreadActivity = activity.filter((a) => !a.isRead);
  const totalFindings = products.reduce(
    (sum, p) => sum + (p.latestAnalysis?.redCount ?? 0) + (p.latestAnalysis?.yellowCount ?? 0),
    0
  );
  const totalNew = products.reduce((sum, p) => sum + p.newFindingCount, 0);

  // Group products by folder
  const ungrouped = products.filter((p) => !p.product.folderId);
  const grouped = folders
    .map((f) => ({
      folder: f,
      products: products.filter((p) => p.product.folderId === f.id),
    }))
    .filter((g) => g.products.length > 0);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-stone-400 text-sm">Loading...</p>
      </main>
    );
  }

  if (products.length === 0) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-lg font-semibold text-stone-900 mb-2">Welcome to PreventAI</h1>
        <p className="text-sm text-stone-500 mb-6 max-w-sm text-center">
          Upload your device files to cross-reference components against FDA adverse event data.
        </p>
        <Link
          to="/add-product"
          className="bg-stone-900 text-stone-100 px-5 py-2.5 rounded text-sm font-medium hover:bg-stone-800 transition-colors"
        >
          + Add your first product
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-6">
        {/* Morning digest header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-lg font-semibold text-stone-900">Dashboard</h1>
            <Link
              to="/add-product"
              className="bg-stone-900 text-stone-100 px-3 py-1.5 rounded text-xs font-medium hover:bg-stone-800 transition-colors"
            >
              + Add Product
            </Link>
          </div>
          <p className="text-[11px] text-stone-400 mono">
            {products.length} {products.length === 1 ? 'product' : 'products'} · {totalFindings}{' '}
            findings
            {totalNew > 0 && <span className="text-risk-high ml-1">· {totalNew} new</span>}
          </p>
        </div>

        {/* Activity feed */}
        {unreadActivity.length > 0 && (
          <div className="mb-6 border border-surface-border rounded-md bg-white overflow-hidden">
            <div className="px-4 py-2.5 border-b border-surface-border flex items-center justify-between">
              <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">
                Recent Activity
              </p>
              <button
                onClick={async () => {
                  await ipc.markAllRead();
                  setActivity((prev) => prev.map((a) => ({ ...a, isRead: true })));
                }}
                className="text-[10px] text-stone-400 hover:text-stone-600"
              >
                Mark all read
              </button>
            </div>
            <div className="divide-y divide-stone-50">
              {unreadActivity.slice(0, 5).map((a) => {
                const sevColor =
                  a.severity === 'critical'
                    ? 'bg-risk-high'
                    : a.severity === 'moderate'
                      ? 'bg-risk-med'
                      : 'bg-stone-300';
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      if (a.productId) navigate(`/product/${a.productId}`);
                      else if (a.componentId) navigate(`/component/${a.componentId}`);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-start gap-3 transition-colors"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${sevColor} mt-1.5 flex-shrink-0`}></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-stone-800">{a.title}</p>
                      {a.detail && (
                        <p className="text-[11px] text-stone-400 mt-0.5 truncate">{a.detail}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-300 mono flex-shrink-0">
                      {formatRelativeTime(a.createdAt)}
                    </span>
                  </button>
                );
              })}
            </div>
            {unreadActivity.length > 5 && (
              <Link
                to="/digest"
                className="block px-4 py-2 text-center text-[11px] text-stone-400 hover:text-stone-600 border-t border-stone-50"
              >
                View all activity →
              </Link>
            )}
          </div>
        )}

        {/* Product tiles grouped by folder */}
        {grouped.map(({ folder, products: folderProducts }) => (
          <div key={folder.id} className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-stone-400">▾</span>
              <h2 className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                {folder.name}
              </h2>
              <span className="text-[10px] text-stone-300 mono">{folderProducts.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {folderProducts.map((p) => (
                <ProductTile key={p.product.id} summary={p} />
              ))}
            </div>
          </div>
        ))}

        {ungrouped.length > 0 && (
          <div className="mb-6">
            {grouped.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-stone-400">▾</span>
                <h2 className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Ungrouped
                </h2>
                <span className="text-[10px] text-stone-300 mono">{ungrouped.length}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {ungrouped.map((p) => (
                <ProductTile key={p.product.id} summary={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
