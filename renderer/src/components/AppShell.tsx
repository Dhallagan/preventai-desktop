import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ipc } from '../lib/ipc';
import SearchModal from './SearchModal';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    ipc.getUnreadCount().then(setUnreadCount);
    // Refresh unread count when navigating
    const interval = setInterval(() => ipc.getUnreadCount().then(setUnreadCount), 30000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  // Cmd+K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '';
    return location.pathname.startsWith(path);
  };

  const navBtn = (path: string, title: string, icon: React.ReactNode, badge?: number) => (
    <button
      onClick={() => navigate(path)}
      title={title}
      className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors relative ${
        isActive(path)
          ? 'bg-stone-700 text-white'
          : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'
      }`}
    >
      {icon}
      {badge && badge > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-risk-high rounded-full text-[8px] text-white flex items-center justify-center font-bold">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="h-screen flex flex-col bg-surface-main">
      {/* Title bar */}
      <div className="titlebar-drag h-9 bg-stone-900 flex-shrink-0 flex items-center pl-20">
        <span className="titlebar-no-drag text-[11px] text-stone-500 font-medium tracking-tight">PreventAI</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Icon rail */}
        <nav className="w-11 flex-shrink-0 bg-stone-900 flex flex-col items-center pb-3 gap-1">
          {/* Home */}
          {navBtn('/', 'Dashboard', (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 6l6-4 6 4v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6z" />
              <path d="M6 14V8h4v6" />
            </svg>
          ))}

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            title="Search (⌘K)"
            className="w-8 h-8 rounded-md flex items-center justify-center text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
          </button>

          {/* Digest */}
          {navBtn('/digest', 'Digest', (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h10v10H3z" />
              <path d="M5 6h6M5 8h6M5 10h3" />
            </svg>
          ), unreadCount)}

          {/* Add Product */}
          {navBtn('/add-product', 'Add Product', (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v10M3 8h10" />
            </svg>
          ))}

          <div className="flex-1" />

          {/* Settings */}
          {navBtn('/settings', 'Settings', (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="2" />
              <path d="M8 2v2M8 12v2M2 8h2M12 8h2M3.8 3.8l1.4 1.4M10.8 10.8l1.4 1.4M3.8 12.2l1.4-1.4M10.8 5.2l1.4-1.4" />
            </svg>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </div>
      </div>

      {searchOpen && (
        <SearchModal
          onClose={() => setSearchOpen(false)}
          onNavigate={(path) => {
            navigate(path);
            setSearchOpen(false);
          }}
        />
      )}
    </div>
  );
}
