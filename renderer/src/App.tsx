import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ipc } from './lib/ipc';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import AddProduct from './pages/AddProduct';
import ProductDetail from './pages/ProductDetail';
import Settings from './pages/Settings';
import AppShell from './components/AppShell';
import type { Settings as SettingsType } from '../../shared/types';

export default function App() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ipc.getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-main">
        <p className="text-stone-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (!settings?.hasApiKey) {
    return (
      <Routes>
        <Route
          path="*"
          element={<Welcome onComplete={() => ipc.getSettings().then(setSettings)} />}
        />
      </Routes>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/add-product" element={<AddProduct />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
