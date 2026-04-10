import { useEffect, useState } from 'react';

interface ProgressViewProps {
  logs: string[];
  stage: string | null;
  elapsedSeconds: number;
}

const STAGES = [
  { id: 'extract', label: 'Extract components' },
  { id: 'fda', label: 'Query FDA MAUDE' },
  { id: 'match', label: 'Match adverse events' },
  { id: 'fmea', label: 'Generate FMEA suggestions' },
  { id: 'summary', label: 'Write risk brief' },
];

export default function ProgressView({ logs, stage, elapsedSeconds }: ProgressViewProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const idx = STAGES.findIndex((s) => s.id === stage);
    if (idx >= 0) setProgress(((idx + 1) / STAGES.length) * 100);
    if (stage === 'done') setProgress(100);
  }, [stage]);

  const stageStatus = (stageId: string): 'done' | 'active' | 'pending' => {
    if (stage === 'done') return 'done';
    const idx = STAGES.findIndex((s) => s.id === stageId);
    const currentIdx = STAGES.findIndex((s) => s.id === stage);
    if (currentIdx < 0) return 'pending';
    if (idx < currentIdx) return 'done';
    if (idx === currentIdx) return 'active';
    return 'pending';
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-sm w-full px-8">
          <h2 className="text-sm font-semibold text-stone-900 mb-3">Analyzing...</h2>
          <div className="w-full bg-stone-200 rounded-full h-1 mb-5">
            <div
              className="bg-stone-700 h-1 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="space-y-1.5 text-xs text-stone-500">
            {STAGES.map((s) => {
              const status = stageStatus(s.id);
              if (status === 'done') {
                return (
                  <div key={s.id} className="flex items-center gap-2 text-stone-600">
                    <span className="text-risk-low">✓</span> {s.label}
                  </div>
                );
              }
              if (status === 'active') {
                return (
                  <div key={s.id} className="flex items-center gap-2 text-stone-900 font-medium">
                    <span className="inline-block w-1.5 h-1.5 bg-stone-900 rounded-full animate-pulse"></span>{' '}
                    {s.label}
                  </div>
                );
              }
              return (
                <div key={s.id} className="flex items-center gap-2 text-stone-300">
                  <span className="inline-block w-1.5 h-1.5 border border-stone-300 rounded-full"></span>{' '}
                  {s.label}
                </div>
              );
            })}
          </div>
          <p className="mono text-stone-400 mt-4">{Math.round(elapsedSeconds)}s elapsed</p>
        </div>
      </div>
      <div className="w-96 border-l border-surface-border bg-stone-50 flex flex-col">
        <div className="px-4 py-2 border-b border-surface-border">
          <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">
            Analysis Log
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2 mono text-stone-500 leading-relaxed text-[11px]">
          {logs.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
