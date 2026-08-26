import React from 'react';
import { Menu, Activity } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export const Navbar = () => {
  const { toggleSidebar } = useUIStore();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-8 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
      <div className="flex items-center gap-3">
        {/* Hamburger Toggle (Mobile) */}
        <button
          onClick={toggleSidebar}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden focus:outline-none"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="text-sm font-medium text-slate-500 hidden sm:inline-block">
          Personal Expense & Live Budget Tracker
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Live Backend Connection Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>INR (₹) Fixed</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
