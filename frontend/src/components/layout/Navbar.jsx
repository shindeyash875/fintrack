import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Wallet,
  Download,
  User,
  LogOut,
  KeyRound,
  Globe,
  ChevronDown,
  Camera,
  Sparkles,
  Sun,
  Moon,
  Search,
  Command,
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ThemeToggle } from '../common/ThemeToggle';
import ChangePasswordModal from '../auth/ChangePasswordModal';
import ActiveSessionsModal from '../auth/ActiveSessionsModal';

export const Navbar = () => {
  const {
    toggleSidebar,
    isInstallable,
    triggerPWAInstall,
    openGlobalReceiptScanner,
    openGlobalAIChat,
    openCommandPalette,
    theme,
    toggleTheme,
  } = useUIStore();
  const { user, logout } = useAuthStore();
  const isDark = theme === 'dark';

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = () => {
    if (user?.full_name) {
      const parts = user.full_name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'FT';
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-3.5 sm:px-8 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 pt-safe transition-colors duration-200">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Hamburger Toggle (Mobile) */}
          <button
            onClick={toggleSidebar}
            className="p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl lg:hidden focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition-all"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Mobile Brand Identity */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-xs">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white font-['Outfit']">
              FinTrack
            </span>
          </div>

          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 hidden lg:inline-block">
            Personal Expense & Live Budget Tracker
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3.5">
          {/* Spotlight Search Launcher (Ctrl+K) */}
          <button
            type="button"
            onClick={openCommandPalette}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full sm:rounded-xl bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/70 dark:border-slate-700/70 text-slate-500 dark:text-slate-400 text-xs font-medium transition-all cursor-pointer group shadow-2xs"
            title="Open Command Palette (Ctrl+K / Cmd+K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors" />
            <span className="hidden md:inline">Quick actions & search</span>
            <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-slate-500 dark:text-slate-400 font-semibold shadow-2xs">
              Ctrl K
            </span>
          </button>

          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* PWA Install Button */}
          {isInstallable && (
            <button
              onClick={triggerPWAInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs active:scale-95 transition-all min-h-[36px]"
              title="Install FinTrack to Home Screen"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {/* Live Currency Pill */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-medium shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">₹ INR</span>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-full sm:rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 transition-all focus:outline-none min-h-[40px]"
              aria-label="User profile menu"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {getInitials()}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[120px]">
                  {user?.full_name || 'Account'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                  {user?.email}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-fade-in">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {user?.full_name || 'FinTrack User'}
                    </p>
                    {user?.is_verified ? (
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        Verified
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                        Unverified
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                </div>

                <div className="py-1">
                  {/* Theme Switcher Row */}
                  <button
                    onClick={() => toggleTheme()}
                    className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      {isDark ? (
                        <Sun className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Moon className="w-4 h-4 text-slate-400" />
                      )}
                      <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {isDark ? 'Dark' : 'Light'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsPasswordModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <KeyRound className="w-4 h-4 text-slate-400" />
                    <span>Change Password</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsSessionsModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <Globe className="w-4 h-4 text-slate-400" />
                    <span>Active Sessions</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
      <ActiveSessionsModal
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
      />
    </>
  );
};

export default Navbar;
