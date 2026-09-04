import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export const ThemeToggle = ({ variant = 'icon', className = '' }) => {
  const { theme, toggleTheme, setTheme } = useUIStore();
  const isDark = theme === 'dark';

  if (variant === 'segmented') {
    return (
      <div className={`flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${className}`}>
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            !isDark
              ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sun className="w-4 h-4 text-amber-500" />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            isDark
              ? 'bg-white dark:bg-slate-900 text-indigo-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Moon className="w-4 h-4 text-indigo-400" />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`relative p-2 rounded-xl transition-all min-h-[40px] min-w-[40px] flex items-center justify-center border focus:outline-none active:scale-95 ${
        isDark
          ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400 shadow-xs'
          : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 shadow-xs'
      } ${className}`}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 text-slate-700 transition-transform duration-300 -rotate-12 hover:rotate-0" />
      )}
    </button>
  );
};

export default ThemeToggle;
