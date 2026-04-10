import { useState } from 'react';
import type { Finding } from '../../../shared/types';

interface Props {
  findings: Finding[];
  selectedView: 'summary' | 'files' | 'log' | 'component';
  selectedComponentId: string | null;
  onSelectSummary: () => void;
  onSelectFiles: () => void;
  onSelectLog: () => void;
  onSelectComponent: (f: Finding) => void;
}

export default function BomSidebar({
  findings,
  selectedView,
  selectedComponentId,
  onSelectSummary,
  onSelectFiles,
  onSelectLog,
  onSelectComponent,
}: Props) {
  const [showGreens, setShowGreens] = useState(false);

  const reds = findings.filter((f) => f.color === 'red');
  const yellows = findings.filter((f) => f.color === 'yellow');
  const greens = findings.filter((f) => f.color === 'green');

  const navClass = (active: boolean, base = '') =>
    `nav-item w-full text-left px-3 flex items-center gap-2 transition-colors text-[11px] ${base} ${
      active ? 'bg-stone-200 font-medium text-stone-800' : 'text-stone-400 hover:text-stone-600'
    }`;

  return (
    <div className="w-52 flex-shrink-0 border-r border-surface-border bg-surface-panel overflow-y-auto">
      <div className="py-1">
        <button
          onClick={onSelectSummary}
          className={navClass(selectedView === 'summary', 'py-2 text-stone-800')}
        >
          <span className="w-2 h-2 rounded-sm bg-stone-600 flex-shrink-0"></span>Summary
        </button>
        <button onClick={onSelectFiles} className={navClass(selectedView === 'files', 'py-1.5')}>
          <span className="text-[10px]">⚏</span> Files
        </button>
        <button onClick={onSelectLog} className={navClass(selectedView === 'log', 'py-1.5')}>
          <span className="text-[10px]">☰</span> Log
        </button>

        <div className="border-t border-surface-border mt-2 pt-1">
          {reds.length > 0 && (
            <>
              <div className="px-3 pt-3 pb-1">
                <span className="text-[9px] font-semibold text-risk-high uppercase tracking-wider">
                  Critical ({reds.length})
                </span>
              </div>
              {reds.map((f) => (
                <BomItem
                  key={f.id}
                  f={f}
                  active={selectedView === 'component' && selectedComponentId === f.id}
                  onClick={() => onSelectComponent(f)}
                />
              ))}
            </>
          )}

          {yellows.length > 0 && (
            <>
              <div className="px-3 pt-3 pb-1">
                <span className="text-[9px] font-semibold text-risk-med uppercase tracking-wider">
                  Warning ({yellows.length})
                </span>
              </div>
              {yellows.map((f) => (
                <BomItem
                  key={f.id}
                  f={f}
                  active={selectedView === 'component' && selectedComponentId === f.id}
                  onClick={() => onSelectComponent(f)}
                />
              ))}
            </>
          )}

          {greens.length > 0 && (
            <>
              <div className="px-3 pt-3 pb-1 border-t border-surface-border mt-2">
                <button
                  onClick={() => setShowGreens(!showGreens)}
                  className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider hover:text-stone-600"
                >
                  Clear ({greens.length}) {showGreens ? '▴' : '▾'}
                </button>
              </div>
              {showGreens &&
                greens.map((f) => (
                  <BomItem
                    key={f.id}
                    f={f}
                    active={selectedView === 'component' && selectedComponentId === f.id}
                    onClick={() => onSelectComponent(f)}
                  />
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BomItem({ f, active, onClick }: { f: Finding; active: boolean; onClick: () => void }) {
  const dot = f.color === 'red' ? 'bg-risk-high' : f.color === 'yellow' ? 'bg-risk-med' : 'bg-stone-300';
  const wt = f.color !== 'green' ? 'text-stone-800' : 'text-stone-400';
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-stone-200 transition-colors text-[11px] ${wt} ${
        active ? 'bg-stone-200 font-medium' : ''
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${dot} flex-shrink-0`}></span>
      <span className="truncate flex-1">{f.componentName}</span>
      {f.isNew && (
        <span className="text-[9px] font-bold text-risk-high mono">NEW</span>
      )}
      {f.score > 0 && !f.isNew && (
        <span className="mono text-stone-300 text-[10px]">{f.score}</span>
      )}
    </button>
  );
}
