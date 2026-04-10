import { useState } from 'react';
import { ipc } from '../lib/ipc';

interface WelcomeProps {
  onComplete: () => void;
}

export default function Welcome({ onComplete }: WelcomeProps) {
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setTesting(true);
    setError(null);
    try {
      const test = await ipc.testApiKey(apiKey.trim());
      if (!test.ok) {
        setError(test.error || 'Could not validate API key.');
        setTesting(false);
        return;
      }
      await ipc.setApiKey(apiKey.trim());
      onComplete();
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
      setTesting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-surface-main">
      <div className="titlebar-drag bg-stone-900 px-5 py-2.5 text-sm">
        <span className="text-stone-100 font-semibold">PreventAI</span>
      </div>
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          <h1 className="text-2xl font-semibold text-stone-900 mb-2">Welcome to PreventAI</h1>
          <p className="text-sm text-stone-500 mb-8">
            Continuous risk monitoring for your medical device components. To get started, paste
            your Anthropic API key. Your data stays on this machine.
          </p>

          <form onSubmit={handleSubmit}>
            <label className="block text-xs font-medium text-stone-500 mb-1 uppercase tracking-wide">
              Anthropic API key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 border border-stone-300 rounded text-sm font-mono focus:outline-none focus:border-stone-500"
              autoFocus
            />
            <p className="text-[11px] text-stone-400 mt-1">
              Don't have one?{' '}
              <button
                type="button"
                onClick={() => ipc.openExternal('https://console.anthropic.com/settings/keys')}
                className="text-stone-600 hover:text-stone-900 underline"
              >
                Get a key →
              </button>
            </p>

            {error && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 text-risk-high text-xs rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={testing || !apiKey.trim()}
              className="mt-4 w-full bg-stone-900 text-stone-100 py-2.5 rounded text-sm font-medium hover:bg-stone-800 disabled:bg-stone-300 disabled:text-stone-500 transition-colors"
            >
              {testing ? 'Validating...' : 'Continue →'}
            </button>

            <p className="text-[10px] text-stone-400 mt-3 text-center">
              Stored in your OS keychain. Never transmitted except to Anthropic.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
