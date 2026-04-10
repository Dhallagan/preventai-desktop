import type { AnalysisDetail, Finding } from '../../../shared/types';
import RiskBrief from './RiskBrief';

interface Props {
  analysis: AnalysisDetail;
  onSelectComponent: (finding: Finding) => void;
}

export default function SummaryView({ analysis, onSelectComponent }: Props) {
  const flagged = analysis.findings.filter((f) => f.color !== 'green');
  const greens = analysis.findings.filter((f) => f.color === 'green');
  const newFlagged = flagged.filter((f) => f.isNew);
  const priorFlagged = flagged.filter((f) => !f.isNew);

  return (
    <div className="px-8 py-6 max-w-4xl">
      <RiskBrief brief={analysis.riskBrief} />

      {flagged.length === 0 ? (
        <div className="mt-8 py-8 text-center">
          <p className="text-sm text-risk-low font-medium">No adverse signals</p>
          <p className="text-xs text-stone-400 mt-1">All components clear.</p>
        </div>
      ) : (
        <div className="mt-8">
          {newFlagged.length > 0 && (
            <>
              <p className="text-[10px] font-medium text-risk-high uppercase tracking-wider mb-3">
                New since last run ({newFlagged.length})
              </p>
              {newFlagged.map((f) => (
                <FindingCard key={f.id} f={f} onClick={() => onSelectComponent(f)} highlighted />
              ))}
              <div className="border-t border-surface-border my-5" />
            </>
          )}
          <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-3">
            {newFlagged.length > 0 ? 'Prior findings' : 'Flagged components'}
          </p>
          {priorFlagged.map((f) => (
            <FindingCard key={f.id} f={f} onClick={() => onSelectComponent(f)} />
          ))}
        </div>
      )}

      {greens.length > 0 && (
        <div className="mt-6 pt-3 border-t border-surface-border">
          <details>
            <summary className="text-[11px] text-stone-400 hover:text-stone-600 cursor-pointer">
              {greens.length} components clear
            </summary>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {greens.map((f) => (
                <span key={f.id} className="text-[11px] text-stone-400">
                  {f.componentName}
                </span>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function FindingCard({
  f,
  onClick,
  highlighted = false,
}: {
  f: Finding;
  onClick: () => void;
  highlighted?: boolean;
}) {
  const border = f.color === 'red' ? 'border-l-risk-high' : 'border-l-risk-med';
  return (
    <div
      onClick={onClick}
      className={`border-l-2 ${border} pl-4 mb-3 cursor-pointer hover:bg-stone-50 py-2 rounded-r transition-colors ${
        highlighted ? 'bg-amber-50/40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[13px] font-medium text-stone-900">{f.componentName}</h3>
        <span className="text-[10px] text-stone-400 mono flex-shrink-0">{f.score}</span>
      </div>
      <p className="text-[11px] text-stone-400">
        {f.manufacturer}
        {f.partNumber ? ` · ${f.partNumber}` : ''} · {f.matchCount} reports
      </p>
      <p className="text-[10px] text-stone-500 mt-0.5">
        Severity: {f.severity.label} · Likelihood: {f.likelihood.label}
      </p>
    </div>
  );
}
