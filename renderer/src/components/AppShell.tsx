import { useLocation, useNavigate } from 'react-router-dom';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen flex flex-col bg-surface-main">
      {/* Title bar drag region */}
      <div className="titlebar-drag h-9 bg-stone-900 flex-shrink-0 flex items-center pl-20">
        <span className="titlebar-no-drag text-[11px] text-stone-500 font-medium tracking-tight">PreventAI</span>
      </div>
      <div className="flex flex-1 overflow-hidden">
      {/* Icon rail */}
      <nav className="w-11 flex-shrink-0 bg-stone-900 flex flex-col items-center pb-3 gap-1">
        {/* Logo / Home */}
        <button
          onClick={() => navigate('/')}
          title="Dashboard"
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors mb-3 ${
            isActive('/') && !isActive('/product') && !isActive('/settings') && !isActive('/add')
              ? 'bg-stone-700 text-white'
              : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6l6-4 6 4v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6z" />
            <path d="M6 14V8h4v6" />
          </svg>
        </button>

        {/* Search */}
        <button
          onClick={() => {/* TODO: open search modal */}}
          title="Search"
          className="w-8 h-8 rounded-md flex items-center justify-center text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
        </button>

        {/* Add Product */}
        <button
          onClick={() => navigate('/add-product')}
          title="Add Product"
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
            isActive('/add')
              ? 'bg-stone-700 text-white'
              : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Settings */}
        <button
          onClick={() => navigate('/settings')}
          title="Settings"
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
            isActive('/settings')
              ? 'bg-stone-700 text-white'
              : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="2" />
            <path d="M13.5 8a5.5 5.5 0 01-.3 1.8l1.3.8-.8 1.4-1.3-.8a5.5 5.5 0 01-1.5 1l.2 1.5h-1.6l.2-1.5a5.5 5.5 0 01-1.5-1l-1.3.8-.8-1.4 1.3-.8A5.5 5.5 0 012.5 8" />
            <path d="M2.5 8a5.5 5.5 0 01.3-1.8L1.5 5.4l.8-1.4 1.3.8a5.5 5.5 0 011.5-1L4.9 2.3h1.6l-.2 1.5a5.5 5.5 0 011.5 1l1.3-.8.8 1.4-1.3.8A5.5 5.5 0 0113.5 8" />
          </svg>
        </button>
      </nav>

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
      </div>
    </div>
  );
}
