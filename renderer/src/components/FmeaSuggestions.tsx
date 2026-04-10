import type { FmeaSuggestion } from '../../../shared/types';

interface Props {
  suggestions: FmeaSuggestion[] | undefined;
}

export default function FmeaSuggestions({ suggestions }: Props) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="px-6 py-4 border-t border-surface-border bg-amber-50/30">
      <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2">
        Suggested FMEA Updates
      </p>
      <div className="space-y-3">
        {suggestions.map((s, i) => (
          <div key={i} className="border-l-2 border-amber-400 pl-3">
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="text-[13px] font-medium text-stone-900">{s.failureMode}</p>
              <span className="text-[10px] mono text-stone-400 flex-shrink-0">
                Sev {s.severity}/10
              </span>
            </div>
            {s.effect && (
              <p className="text-[12px] text-stone-600 mb-1">
                <span className="text-stone-400">Effect:</span> {s.effect}
              </p>
            )}
            {s.recommendedMitigation && (
              <p className="text-[12px] text-stone-600">
                <span className="text-stone-400">Mitigation:</span> {s.recommendedMitigation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
