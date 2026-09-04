import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Target,
  Tag,
  SlidersHorizontal,
  Wallet,
  LogOut,
  X,
  Camera,
  Sparkles,
  TrendingUp,
  Award,
  PieChart,
  Sun,
  Moon,
  Users,
  Calendar,
  Hourglass,
  Command,
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ThemeToggle } from '../common/ThemeToggle';

export const Sidebar = () => {
  const navigate = useNavigate();
  const {
    isSidebarOpen,
    closeSidebar,
    openGlobalReceiptScanner,
    openGlobalAIChat,
    openGlobalMonthlyDigest,
    openGlobalAffordability,
    openGlobalAutoBudget,
    openGlobalBudget,
    openGlobalCategory,
    openGlobalSettings,
    openCommandPalette,
    openBillSplitter,
    openSubscriptions,
    openTimeMachine,
    theme,
  } = useUIStore();
  const isDark = theme === 'dark';

  const { user, logout } = useAuthStore();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Expenses', path: '/expenses', icon: Receipt },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={closeSidebar}
          aria-label="Close sidebar backdrop"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800 pt-safe">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-['Outfit']">
              FinTrack
            </span>
          </div>
          <button
            onClick={closeSidebar}
            aria-label="Close sidebar"
            className="p-2 text-slate-400 hover:text-white rounded-xl lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => closeSidebar()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[40px] ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.name}
              </NavLink>
            );
          })}

          {/* Spotlight Palette Launcher in Sidebar */}
          <button
            onClick={() => {
              closeSidebar();
              openCommandPalette();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-all min-h-[38px] text-left focus:outline-none group border border-slate-700/60"
          >
            <div className="flex items-center gap-2.5">
              <Command className="w-4 h-4 text-emerald-400 group-hover:rotate-45 transition-transform" />
              <span>Spotlight Palette</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[10px] text-slate-400">
              Ctrl K
            </span>
          </button>

          {/* AI Advisor Trigger */}
          <button
            onClick={() => {
              closeSidebar();
              openGlobalAIChat();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition-all min-h-[40px] text-left focus:outline-none group mt-2 shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 shrink-0 text-emerald-400 group-hover:scale-110 transition-transform animate-pulse" />
              <span>AI Advisor</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-emerald-500/40 text-emerald-200 border border-emerald-400/40">
              Copilot
            </span>
          </button>

          {/* AI Receipt Scanner Trigger */}
          <button
            onClick={() => {
              closeSidebar();
              openGlobalReceiptScanner();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all min-h-[40px] text-left focus:outline-none group border border-slate-700/50"
          >
            <div className="flex items-center gap-2.5">
              <Camera className="w-4 h-4 shrink-0 text-teal-400 group-hover:scale-110 transition-transform" />
              <span>Scan Receipt</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-teal-500/30 text-teal-300 border border-teal-400/30">
              AI OCR
            </span>
          </button>

          {/* AI Spending Forecast Trigger */}
          <button
            onClick={() => {
              closeSidebar();
              navigate('/');
              setTimeout(() => {
                const el = document.getElementById('ai-forecast');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 hover:text-white transition-all min-h-[40px] text-left focus:outline-none group border border-indigo-800/40"
          >
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4 shrink-0 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span>AI Forecast</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              Insights
            </span>
          </button>

          {/* AI Monthly Digest Scorecard Trigger */}
          <button
            onClick={() => {
              closeSidebar();
              openGlobalMonthlyDigest();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 hover:text-white transition-all min-h-[40px] text-left focus:outline-none group border border-amber-800/40"
          >
            <div className="flex items-center gap-2.5">
              <Award className="w-4 h-4 shrink-0 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Monthly Digest</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-amber-500/30 text-amber-200 border border-amber-400/30">
              Scorecard
            </span>
          </button>

          {/* AI Purchase Affordability Simulator Trigger */}
          <button
            onClick={() => {
              closeSidebar();
              openGlobalAffordability();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium bg-teal-950/40 hover:bg-teal-900/50 text-teal-300 hover:text-white transition-all min-h-[40px] text-left focus:outline-none group border border-teal-800/40"
          >
            <div className="flex items-center gap-2.5">
              <Target className="w-4 h-4 shrink-0 text-teal-400 group-hover:scale-110 transition-transform" />
              <span>Can I Afford This?</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-teal-500/30 text-teal-200 border border-teal-400/30">
              Simulator
            </span>
          </button>

          {/* AI 50/30/20 Smart Auto-Budget Trigger */}
          <button
            onClick={() => {
              closeSidebar();
              openGlobalAutoBudget();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium bg-violet-950/40 hover:bg-violet-900/50 text-violet-300 hover:text-white transition-all min-h-[40px] text-left focus:outline-none group border border-violet-800/40"
          >
            <div className="flex items-center gap-2.5">
              <PieChart className="w-4 h-4 shrink-0 text-violet-400 group-hover:scale-110 transition-transform" />
              <span>Smart Auto-Budget</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-violet-500/30 text-violet-200 border border-violet-400/30">
              50/30/20
            </span>
          </button>

          {/* Smart Financial Tools Section ("Hatke" Suite) */}
          <div className="pt-3 mt-3 border-t border-slate-800/80">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Smart Financial Tools
            </p>

            {/* Bill Splitter */}
            <button
              onClick={() => {
                closeSidebar();
                openBillSplitter();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all min-h-[40px] text-left focus:outline-none group"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Bill & Group Split</span>
              </div>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">
                WhatsApp
              </span>
            </button>

            {/* Subscriptions Radar */}
            <button
              onClick={() => {
                closeSidebar();
                openSubscriptions();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all min-h-[40px] text-left focus:outline-none group"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span>Subscriptions Radar</span>
              </div>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/20 text-blue-400 font-bold">
                Radar
              </span>
            </button>

            {/* Time Machine Wealth Simulator */}
            <button
              onClick={() => {
                closeSidebar();
                openTimeMachine();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all min-h-[40px] text-left focus:outline-none group"
            >
              <div className="flex items-center gap-2.5">
                <Hourglass className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
                <span>Wealth Time Machine</span>
              </div>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-violet-500/20 text-violet-400 font-bold">
                SIP
              </span>
            </button>
          </div>

          {/* Management Section */}
          <div className="pt-3 mt-3 border-t border-slate-800/80">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Management
            </p>

            <button
              onClick={() => {
                closeSidebar();
                openGlobalBudget();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all min-h-[38px] text-left focus:outline-none"
            >
              <Target className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Budget Goals</span>
            </button>

            <button
              onClick={() => {
                closeSidebar();
                openGlobalCategory();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all min-h-[38px] text-left focus:outline-none"
            >
              <Tag className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Categories</span>
            </button>

            <button
              onClick={() => {
                closeSidebar();
                openGlobalSettings();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all min-h-[38px] text-left focus:outline-none"
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0 text-slate-400" />
              <span>App Settings</span>
            </button>
          </div>
        </nav>

        {/* User Card, Theme Toggle & Logout in Footer */}
        <div className="p-4 border-t border-slate-800/80 pb-safe space-y-2">
          {/* Quick Theme Switcher */}
          <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-800/40 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              {isDark ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
              <span>Appearance</span>
            </div>
            <ThemeToggle className="!min-h-[32px] !min-w-[32px] !p-1.5" />
          </div>

          {user && (
            <div className="bg-slate-800/60 rounded-2xl p-3 flex items-center justify-between border border-slate-700/50">
              <div className="truncate mr-2">
                <p className="text-xs font-semibold text-white truncate">
                  {user.full_name || 'Account'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={() => {
                  closeSidebar();
                  logout();
                }}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="bg-slate-800/30 rounded-xl p-2 text-[11px] text-slate-500 text-center">
            FinTrack v1.0 • Isolated Secure Cloud
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
