import { useState, useEffect, useRef } from 'react';
import { ipc } from '../lib/ipc';

interface SearchModalProps {
  onClose: () => void;
  onNavigate: (path: string) => void;
}

interface SearchResult {
  id: string;
  name: string;
  type: 'product' | 'component';
  subtitle?: string;
  color?: string;
}

export default function SearchModal({ onClose, onNavigate }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const data = await ipc.globalSearch(query);
      const all: SearchResult[] = [
        ...data.products.map((p) => ({
          id: p.id,
          name: p.name,
          type: 'product' as const,
          subtitle: 'Product',
        })),
        ...data.components.map((c) => ({
          id: c.id,
          name: c.name,
          type: 'component' as const,
          subtitle: c.manufacturer,
          color: c.color,
        })),
      ];
      setResults(all);
      setSelectedIdx(0);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      const r = results[selectedIdx];
      onNavigate(r.type === 'product' ? `/product/${r.id}` : `/component/${r.id}`);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-lg shadow-2xl border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-200">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#a8a29e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search products, components, manufacturers..."
            className="flex-1 text-sm focus:outline-none"
          />
          <span className="text-[10px] text-stone-400 border border-stone-200 rounded px-1.5 py-0.5">ESC</span>
        </div>

        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto py-1">
            {results.map((r, i) => {
              const dotColor = r.color === 'red' ? 'bg-risk-high' : r.color === 'yellow' ? 'bg-risk-med' : 'bg-stone-300';
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() =>
                    onNavigate(r.type === 'product' ? `/product/${r.id}` : `/component/${r.id}`)
                  }
                  className={`w-full text-left px-4 py-2 flex items-center gap-3 text-sm ${
                    i === selectedIdx ? 'bg-stone-100' : 'hover:bg-stone-50'
                  }`}
                >
                  {r.type === 'component' && (
                    <span className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`}></span>
                  )}
                  {r.type === 'product' && (
                    <span className="w-2 h-2 rounded-sm bg-stone-600 flex-shrink-0"></span>
                  )}
                  <div className="min-w-0">
                    <p className="text-stone-900 truncate">{r.name}</p>
                    <p className="text-[10px] text-stone-400">{r.subtitle}</p>
                  </div>
                  <span className="ml-auto text-[10px] text-stone-300 flex-shrink-0">
                    {r.type}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div className="py-8 text-center text-sm text-stone-400">No results</div>
        )}

        {!query.trim() && (
          <div className="py-6 text-center text-xs text-stone-400">
            Search products by name or components by manufacturer, material, or part number
          </div>
        )}
      </div>
    </div>
  );
}
