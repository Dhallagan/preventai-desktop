import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ipc } from '../lib/ipc';
import type { ProductSummary } from '../../../shared/types';
import ProductTile from '../components/ProductTile';

export default function Dashboard() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ipc.listProducts().then((p) => {
      setProducts(p);
      setLoading(false);
    });
  }, []);

  return (
    <main className="flex-1 overflow-y-auto px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Products</h1>
          <p className="text-[11px] text-stone-400 mono">
            {products.length} {products.length === 1 ? 'product' : 'products'} monitored
          </p>
        </div>
        {products.length > 0 && (
          <Link
            to="/add-product"
            className="bg-stone-900 text-stone-100 px-3 py-1.5 rounded text-xs font-medium hover:bg-stone-800 transition-colors"
          >
            + Add Product
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-stone-400 text-sm">Loading...</p>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-stone-400 text-sm mb-4">No products yet.</p>
          <Link
            to="/add-product"
            className="bg-stone-900 text-stone-100 px-4 py-2 rounded text-sm font-medium hover:bg-stone-800 transition-colors"
          >
            + Add your first product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {products.map((p) => (
            <ProductTile key={p.product.id} summary={p} />
          ))}
        </div>
      )}
    </main>
  );
}
