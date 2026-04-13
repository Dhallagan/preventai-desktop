import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ipc } from '../lib/ipc';
import type { ActivityItem } from '../../../shared/types';
import { formatRelativeTime, formatDate } from '../lib/format';

export default function DigestPage() {
  const navigate = useNavigate();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'moderate' | 'info'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ipc.getRecentActivity(200).then((a) => {
      setActivity(a);
      setLoading(false);
    });
    // Mark all read when visiting digest
    ipc.markAllRead();
  }, []);

  const filtered =
    filter === 'all' ? activity : activity.filter((a) => a.severity === filter);

  // Group by date
  const grouped = new Map<string, ActivityItem[]>();
  for (const a of filtered) {
    const date = new Date(a.createdAt).toDateString();
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(a);
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-6">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-stone-900 mb-1">Digest</h1>
          <p className="text-[11px] text-stone-400">
            All findings and activity across your products, newest first.
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 mb-6">
          {(['all', 'critical', 'moderate', 'info'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                filter === f
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-500 hover:text-stone-700 bg-stone-100'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <span className="text-[11px] text-stone-300 flex items-center ml-2 mono">
            {filtered.length} items
          </span>
        </div>

        {loading ? (
          <p className="text-stone-400 text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-stone-400">No activity yet.</p>
            <p className="text-xs text-stone-300 mt-1">
              Run an analysis on a product to see findings here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([dateStr, items]) => (
              <div key={dateStr}>
                <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2 sticky top-0 bg-surface-main py-1">
                  {dateStr === new Date().toDateString() ? 'Today' : dateStr}
                </p>
                <div className="space-y-0.5">
                  {items.map((a) => {
                    const sevColor =
                      a.severity === 'critical'
                        ? 'border-l-risk-high'
                        : a.severity === 'moderate'
                          ? 'border-l-risk-med'
                          : 'border-l-stone-200';
                    const dotColor =
                      a.severity === 'critical'
                        ? 'bg-risk-high'
                        : a.severity === 'moderate'
                          ? 'bg-risk-med'
                          : 'bg-stone-300';
                    return (
                      <button
                        key={a.id}
                        onClick={() => {
                          if (a.componentId) navigate(`/component/${a.componentId}`);
                          else if (a.productId) navigate(`/product/${a.productId}`);
                        }}
                        className={`w-full text-left border-l-2 ${sevColor} pl-3 py-2 hover:bg-stone-50 transition-colors rounded-r`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-1.5 flex-shrink-0`}></span>
                            <div className="min-w-0">
                              <p className="text-[13px] text-stone-800">{a.title}</p>
                              {a.detail && (
                                <p className="text-[11px] text-stone-400 mt-0.5 truncate">
                                  {a.detail}
                                </p>
                              )}
                              {a.productName && (
                                <p className="text-[10px] text-stone-300 mt-0.5">
                                  {a.productName}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] text-stone-300 mono flex-shrink-0 mt-0.5">
                            {formatRelativeTime(a.createdAt)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
