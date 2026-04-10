import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ipc } from '../lib/ipc';
import type { Settings as SettingsType, ScheduleFrequency } from '../../../shared/types';
export default function Settings() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [newKey, setNewKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ipc.getSettings().then(setSettings);
  }, []);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    setTesting(true);
    setError(null);
    setSaved(false);
    try {
      const test = await ipc.testApiKey(newKey.trim());
      if (!test.ok) {
        setError(test.error || 'Could not validate API key.');
        setTesting(false);
        return;
      }
      await ipc.setApiKey(newKey.trim());
      setNewKey('');
      setSaved(true);
      setTesting(false);
      const s = await ipc.getSettings();
      setSettings(s);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
      setTesting(false);
    }
  };

  const handleScheduleChange = async (s: ScheduleFrequency) => {
    await ipc.setDefaultSchedule(s);
    const next = await ipc.getSettings();
    setSettings(next);
  };

  if (!settings) return <div className="h-screen bg-surface-main" />;

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8 bg-surface-main">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg font-semibold text-stone-900 mb-1">Settings</h1>
          <p className="text-sm text-stone-500 mb-8">Configure your API key and defaults.</p>

          <section className="mb-8">
            <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">
              Anthropic API Key
            </h2>
            <div className="bg-white border border-surface-border rounded p-4">
              <p className="text-xs text-stone-500 mb-3">
                Status:{' '}
                {settings.hasApiKey ? (
                  <span className="text-risk-low font-medium">Configured</span>
                ) : (
                  <span className="text-risk-high font-medium">Not set</span>
                )}
              </p>
              <form onSubmit={handleSaveKey}>
                <input
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm font-mono focus:outline-none focus:border-stone-500"
                />
                {error && (
                  <p className="text-[11px] text-risk-high mt-2">{error}</p>
                )}
                {saved && (
                  <p className="text-[11px] text-risk-low mt-2">API key saved</p>
                )}
                <button
                  type="submit"
                  disabled={testing || !newKey.trim()}
                  className="mt-3 bg-stone-900 text-stone-100 px-4 py-1.5 rounded text-xs font-medium hover:bg-stone-800 disabled:bg-stone-300 disabled:text-stone-500"
                >
                  {testing ? 'Testing...' : settings.hasApiKey ? 'Replace key' : 'Save key'}
                </button>
              </form>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">
              Default Schedule
            </h2>
            <div className="bg-white border border-surface-border rounded p-4">
              <p className="text-xs text-stone-500 mb-3">
                How often new products should re-analyze by default.
              </p>
              <div className="flex gap-2 flex-wrap">
                {(['daily', 'weekly', 'biweekly', 'monthly', 'manual'] as ScheduleFrequency[]).map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => handleScheduleChange(s)}
                      className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                        settings.defaultSchedule === s
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
          </section>

          <section className="mb-8">
            <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">
              Data
            </h2>
            <div className="bg-white border border-surface-border rounded p-4">
              <p className="text-[11px] text-stone-400 mono mb-2">{settings.dataPath}</p>
              <button
                onClick={() => ipc.openDataFolder()}
                className="text-xs text-stone-600 hover:text-stone-900 underline"
              >
                Open data folder
              </button>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">
              About
            </h2>
            <div className="bg-white border border-surface-border rounded p-4 text-xs text-stone-500">
              <p>PreventAI v{settings.appVersion}</p>
              <p className="mt-1">Medical device risk intelligence. Local-only.</p>
            </div>
          </section>

          <Link to="/" className="text-xs text-stone-500 hover:text-stone-900 underline">
            ← Back to dashboard
          </Link>
        </div>
    </main>
  );
}
