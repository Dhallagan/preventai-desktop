import type { Finding } from '../../../shared/types';
import MaudeTable from './MaudeTable';
import FmeaSuggestions from './FmeaSuggestions';

interface Props {
  finding: Finding;
}

const sevColor: Record<string, string> = {
  critical: 'text-risk-high',
  serious: 'text-risk-med',
  moderate: 'text-stone-600',
  minor: 'text-stone-400',
  none: 'text-stone-300',
};

const likColor: Record<string, string> = {
  high: 'text-risk-high',
  medium: 'text-risk-med',
  low: 'text-stone-400',
  none: 'text-stone-300',
};

const confStyle: Record<string, string> = {
  HIGH: 'text-risk-high bg-red-50',
  MEDIUM: 'text-risk-med bg-amber-50',
  LOW: 'text-stone-400 bg-stone-100',
};

export default function ComponentDetail({ finding: f }: Props) {
  const meta = [f.manufacturer, f.partNumber, f.material].filter(Boolean).join(' · ');

  return (
    <div>
      <div className="px-6 py-4 border-b border-surface-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-stone-900">{f.componentName}</h3>
            <p className="text-[11px] text-stone-400 mt-0.5">{meta}</p>
          </div>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded flex-shrink-0 ${
              confStyle[f.confidenceLabel] || confStyle.LOW
            }`}
          >
            {f.confidenceLabel} ({f.maxConfidence}/10)
          </span>
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs text-stone-600 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-stone-400 uppercase">Severity</span>
            <span className={`font-medium ${sevColor[f.severity.level]}`}>{f.severity.label}</span>
          </div>
          <span className="text-stone-300">·</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-stone-400 uppercase">Likelihood</span>
            <span className={`font-medium ${likColor[f.likelihood.level]}`}>
              {f.likelihood.label}
            </span>
          </div>
          <span className="text-stone-300">·</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-stone-400 uppercase">Score</span>
            <span className="font-medium">{f.score}</span>
          </div>
          <span className="text-stone-300">·</span>
          <span className="text-stone-500">{f.matchCount} reports</span>
        </div>
      </div>

      {f.matches[0]?.explanation && (
        <div className="px-6 py-3 border-b border-surface-border text-[13px] text-stone-600 leading-relaxed bg-stone-50">
          {f.matches[0].explanation}
        </div>
      )}

      {f.sources.length > 0 && (
        <div className="px-6 py-3 border-b border-surface-border">
          <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2">
            Sources
          </p>
          {f.sources.map((s, i) => (
            <div key={i} className="flex items-center gap-3 mb-1.5">
              <span className="text-[11px] font-medium text-stone-700 w-40 flex-shrink-0">
                {s.name}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-stone-500 truncate">{s.detail}</p>
              </div>
              <div className="w-16 flex-shrink-0 flex items-center gap-1">
                <div className="w-10 h-1 bg-stone-200 rounded-full">
                  <div
                    className="h-1 bg-stone-500 rounded-full"
                    style={{ width: `${Math.round(s.weight * 100)}%` }}
                  />
                </div>
                <span className="text-[9px] mono text-stone-400">{s.weight}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-6 py-3">
        <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2">
          MAUDE Reports
        </p>
        <div className="overflow-x-auto">
          <MaudeTable matches={f.matches} />
        </div>
      </div>

      <FmeaSuggestions suggestions={f.fmeaSuggestions} />
    </div>
  );
}
