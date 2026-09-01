import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Target,
  Tag,
  SlidersHorizontal,
  Wallet,
  LogOut,
  X,
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';

export const Sidebar = () => {
  const {
    isSidebarOpen,
    closeSidebar,
    openGlobalBudget,
    openGlobalCategory,
    openGlobalSettings,
  } = useUIStore();

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
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => closeSidebar()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
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

          <div className="pt-4 mt-4 border-t border-slate-800/80">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Management
            </p>

            <button
              onClick={() => {
                closeSidebar();
                openGlobalBudget();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all min-h-[44px] text-left focus:outline-none"
            >
              <Target className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>Budget Goals</span>
            </button>

            <button
              onClick={() => {
                closeSidebar();
                openGlobalCategory();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all min-h-[44px] text-left focus:outline-none"
            >
              <Tag className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>Categories</span>
            </button>

            <button
              onClick={() => {
                closeSidebar();
                openGlobalSettings();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all min-h-[44px] text-left focus:outline-none"
            >
              <SlidersHorizontal className="w-5 h-5 shrink-0 text-slate-400" />
              <span>App Settings</span>
            </button>
          </div>
        </nav>

        {/* User Card & Logout in Footer */}
        <div className="p-4 border-t border-slate-800/80 pb-safe">
          {user && (
            <div className="bg-slate-800/60 rounded-2xl p-3 mb-2 flex items-center justify-between border border-slate-700/50">
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

          <div className="bg-slate-800/30 rounded-xl p-2.5 text-[11px] text-slate-500 text-center">
            FinTrack v1.0 • Isolated Secure Cloud
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
