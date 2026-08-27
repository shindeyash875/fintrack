import React from 'react';
import { Menu, Wallet, Download } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export const Navbar = () => {
  const { toggleSidebar, isInstallable, triggerPWAInstall } = useUIStore();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-3.5 sm:px-8 bg-white/85 backdrop-blur-md border-b border-slate-200/80 pt-safe">
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Hamburger Toggle (Mobile) */}
        <button
          onClick={toggleSidebar}
          className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl lg:hidden focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition-all"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Mobile Brand Identity */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-xs">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 font-['Outfit']">
            FinTrack
          </span>
        </div>

        <span className="text-sm font-medium text-slate-500 hidden lg:inline-block">
          Personal Expense & Live Budget Tracker
        </span>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* PWA Install Button when prompt is available */}
        {isInstallable && (
          <button
            onClick={triggerPWAInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all min-h-[36px]"
            title="Install FinTrack to Home Screen"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        )}

        {/* Live Backend Connection Indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-medium shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold">₹ INR</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
