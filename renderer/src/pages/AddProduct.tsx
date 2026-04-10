import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ipc } from '../lib/ipc';
import type { ScheduleFrequency } from '../../../shared/types';
import DropZone from '../components/DropZone';

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  // Convert to base64 in chunks to handle large files
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

export default function AddProduct() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [dmr, setDmr] = useState<File | null>(null);
  const [riskMgmt, setRiskMgmt] = useState<File | null>(null);
  const [dhf, setDhf] = useState<File | null>(null);
  const [schedule, setSchedule] = useState<ScheduleFrequency>('biweekly');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ipc.getSettings().then((s) => setSchedule(s.defaultSchedule));
  }, []);

  const canSubmit = (dmr || riskMgmt) && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const fileMeta: { label: string; filename: string; sizeBytes: number }[] = [];
      if (dmr) fileMeta.push({ label: 'Device Master Record', filename: dmr.name, sizeBytes: dmr.size });
      if (riskMgmt)
        fileMeta.push({ label: 'Risk Management File', filename: riskMgmt.name, sizeBytes: riskMgmt.size });
      if (dhf)
        fileMeta.push({ label: 'Design History File', filename: dhf.name, sizeBytes: dhf.size });

      const product = await ipc.createProduct({
        name: name.trim() || 'Untitled Product',
        schedule,
        files: fileMeta,
      });

      // Encode files for IPC
      const uploadFiles: { label: 'dmr' | 'risk_mgmt' | 'dhf'; filename: string; data: string }[] = [];
      if (dmr) uploadFiles.push({ label: 'dmr', filename: dmr.name, data: await fileToBase64(dmr) });
      if (riskMgmt)
        uploadFiles.push({ label: 'risk_mgmt', filename: riskMgmt.name, data: await fileToBase64(riskMgmt) });
      if (dhf) uploadFiles.push({ label: 'dhf', filename: dhf.name, data: await fileToBase64(dhf) });

      // Navigate to the product page; analysis runs there
      navigate(`/product/${product.id}?run=1`, {
        state: { uploadFiles, schedule, productName: product.name },
      });
    } catch (err: any) {
      setError(err?.message || 'Could not create product');
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8 bg-surface-main">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg font-semibold text-stone-900 mb-1">Add a product</h1>
          <p className="text-sm text-stone-500 mb-6">
            Upload your device files. We'll cross-reference components against FDA adverse event
            data and monitor for new findings on the schedule you set.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block text-xs font-medium text-stone-500 mb-1 uppercase tracking-wide">
                Product name <span className="text-stone-300 normal-case">optional, we'll detect it</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CPAP Machine X-200"
                className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <DropZone label="DMR" required file={dmr} onChange={setDmr} />
              <DropZone label="Risk Management" required file={riskMgmt} onChange={setRiskMgmt} />
            </div>

            <div className="mb-6">
              <DropZone label="DHF" file={dhf} onChange={setDhf} />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-medium text-stone-500 mb-2 uppercase tracking-wide">
                Re-analyze schedule
              </label>
              <div className="flex gap-2">
                {(['daily', 'weekly', 'biweekly', 'monthly', 'manual'] as ScheduleFrequency[]).map(
                  (s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSchedule(s)}
                      className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                        schedule === s
                          ? 'bg-stone-900 text-stone-100 border-stone-900'
                          : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  )
                )}
              </div>
            </div>

            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 text-risk-high text-xs rounded">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded hover:border-stone-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex-1 bg-stone-900 text-stone-100 py-2 rounded text-sm font-medium hover:bg-stone-800 disabled:bg-stone-300 disabled:text-stone-500 transition-colors"
              >
                {submitting ? 'Starting analysis...' : 'Run Analysis →'}
              </button>
            </div>

            <p className="text-[10px] text-stone-400 mt-3 text-center">
              Files are processed in memory. Nothing is stored or transmitted except to Anthropic
              and openFDA.
            </p>
          </form>
        </div>
    </main>
  );
}
