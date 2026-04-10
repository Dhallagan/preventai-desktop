import { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { ipc } from '../lib/ipc';
import type { AnalysisDetail, Finding, ProgressEvent } from '../../../shared/types';
import BomSidebar from '../components/BomSidebar';
import SummaryView from '../components/SummaryView';
import ComponentDetail from '../components/ComponentDetail';
import ProgressView from '../components/ProgressView';
import { formatBytes } from '../lib/format';

type View = 'summary' | 'files' | 'log' | 'component';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [productName, setProductName] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [stage, setStage] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('summary');
  const [selectedComponent, setSelectedComponent] = useState<Finding | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const elapsedTimer = useRef<NodeJS.Timeout | null>(null);

  // Load existing analysis on mount
  useEffect(() => {
    if (!id) return;
    ipc.getProduct(id).then((p) => {
      if (p?.product) setProductName(p.product.name);
    });
    ipc.getLatestAnalysisForProduct(id).then((detail) => {
      if (detail) setAnalysis(detail);
    });
  }, [id]);

  // If we navigated here with run=1, kick off the analysis
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('run') !== '1' || !id) return;

    const state = (location.state || {}) as {
      uploadFiles?: { label: 'dmr' | 'risk_mgmt' | 'dhf'; filename: string; data: string }[];
      schedule?: any;
      productName?: string;
    };
    if (!state.uploadFiles) return;

    setRunning(true);
    setLogs([]);
    setStage(null);
    setElapsed(0);
    const start = Date.now();
    elapsedTimer.current = setInterval(() => {
      setElapsed((Date.now() - start) / 1000);
    }, 500);

    const unsubscribe = ipc.onAnalysisEvent((event: ProgressEvent) => {
      if (event.type === 'progress' && event.message) {
        setLogs((prev) => [...prev, event.message!]);
      } else if (event.type === 'stage' && event.stage) {
        setStage(event.stage);
      } else if (event.type === 'results' && event.data) {
        setAnalysis(event.data);
        setRunning(false);
        if (elapsedTimer.current) clearInterval(elapsedTimer.current);
      } else if (event.type === 'error') {
        setError(event.message || 'Analysis failed');
        setRunning(false);
        if (elapsedTimer.current) clearInterval(elapsedTimer.current);
      }
    });

    ipc
      .runAnalysis({
        productId: id,
        productName: state.productName,
        schedule: state.schedule || 'biweekly',
        files: state.uploadFiles,
      })
      .catch((err) => {
        setError(err?.message || 'Could not start analysis');
        setRunning(false);
      });

    // Strip query param to avoid re-triggering
    navigate(`/product/${id}`, { replace: true });

    return () => {
      unsubscribe();
      if (elapsedTimer.current) clearInterval(elapsedTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSelectComponent = (f: Finding) => {
    setSelectedComponent(f);
    setView('component');
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Delete this product? This cannot be undone.')) return;
    await ipc.deleteProduct(id);
    navigate('/');
  };

  const counts = analysis
    ? `${analysis.redCount} critical · ${analysis.yellowCount} warning · ${analysis.greenCount} clear`
    : 'No analysis yet';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {analysis && !running && (
        <div className="border-b border-surface-border bg-white px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-900">{analysis.productName}</h2>
            <p className="text-[11px] text-stone-400 mono">{counts}</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[11px] text-stone-400 mono">
              {analysis.totalComponents} components · {analysis.elapsedSeconds.toFixed(1)}s
            </p>
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-stone-400 hover:text-stone-700 px-2 py-1 text-xs"
              >
                ⋯
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded shadow-lg text-xs text-stone-700 w-40 z-50">
                  <button
                    onClick={() => navigate('/add-product')}
                    className="block w-full text-left px-3 py-2 hover:bg-stone-50"
                  >
                    Re-upload files
                  </button>
                  <button
                    onClick={handleDelete}
                    className="block w-full text-left px-3 py-2 hover:bg-stone-50 text-risk-high"
                  >
                    Delete product
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {running ? (
        <div className="flex-1 overflow-hidden">
          <ProgressView logs={logs} stage={stage} elapsedSeconds={elapsed} />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md text-center">
            <p className="text-sm text-risk-high font-medium mb-2">Analysis failed</p>
            <p className="text-xs text-stone-500 mb-4">{error}</p>
            <Link to="/" className="text-xs text-stone-600 underline">
              Back to dashboard
            </Link>
          </div>
        </div>
      ) : !analysis ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-stone-400 text-sm">No analysis yet for this product.</p>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <BomSidebar
            findings={analysis.findings}
            selectedView={view}
            selectedComponentId={selectedComponent?.id || null}
            onSelectSummary={() => setView('summary')}
            onSelectFiles={() => setView('files')}
            onSelectLog={() => setView('log')}
            onSelectComponent={handleSelectComponent}
          />
          <main className="flex-1 overflow-y-auto min-w-0">
            {view === 'summary' && (
              <SummaryView analysis={analysis} onSelectComponent={handleSelectComponent} />
            )}
            {view === 'component' && selectedComponent && (
              <ComponentDetail finding={selectedComponent} />
            )}
            {view === 'files' && (
              <div className="px-6 py-5 max-w-4xl">
                <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-3">
                  Uploaded Files
                </p>
                {analysis.files.map((f, i) => (
                  <div key={i} className="mb-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-stone-100 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-bold text-stone-400">
                          {f.filename.split('.').pop()?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-900">{f.filename}</p>
                        <p className="text-[11px] text-stone-400">
                          {f.label} · {formatBytes(f.sizeBytes)} · {f.componentsExtracted} components
                          extracted
                        </p>
                      </div>
                    </div>
                    {f.components.length > 0 && (
                      <div className="ml-11 border-l-2 border-stone-200 pl-3">
                        {f.components.map((c, ci) => {
                          const riskDot =
                            c.riskLevel === 'high'
                              ? 'bg-risk-high'
                              : c.riskLevel === 'medium'
                                ? 'bg-risk-med'
                                : 'bg-stone-300';
                          return (
                            <div
                              key={ci}
                              className="flex items-center gap-2 text-[11px] text-stone-600 py-0.5"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${riskDot} flex-shrink-0`}></span>
                              <span>{c.name}</span>
                              <span className="text-stone-300">{c.manufacturer}</span>
                              {c.material && <span className="text-stone-300">· {c.material}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {view === 'log' && (
              <div className="px-6 py-5 bg-stone-50 min-h-full">
                <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-3">
                  Analysis Log
                </p>
                <div className="space-y-0.5 mono text-stone-500 text-[11px] leading-relaxed">
                  {analysis.log.map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
