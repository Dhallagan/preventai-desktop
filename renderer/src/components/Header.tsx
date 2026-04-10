import { Link } from 'react-router-dom';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export default function Header({ title, subtitle, right }: HeaderProps) {
  return (
    <header className="titlebar-drag bg-stone-900 text-stone-300 px-5 py-2.5 flex items-center justify-between text-sm border-b border-stone-800">
      <Link to="/" className="titlebar-no-drag flex items-center gap-2 hover:text-stone-100 transition-colors">
        <span className="text-stone-100 font-semibold tracking-tight">PreventAI</span>
        {title && (
          <>
            <span className="text-stone-600">/</span>
            <span className="text-stone-300">{title}</span>
          </>
        )}
        {subtitle && <span className="text-stone-500 mono ml-2">{subtitle}</span>}
      </Link>
      <div className="titlebar-no-drag flex items-center gap-3">
        {right}
        <Link to="/settings" className="text-stone-500 hover:text-stone-300 text-xs">
          Settings
        </Link>
      </div>
    </header>
  );
}
