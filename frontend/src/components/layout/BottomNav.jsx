import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Plus,
  Target,
  SlidersHorizontal,
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export const BottomNav = () => {
  const location = useLocation();
  const {
    openGlobalAddExpense,
    openGlobalBudget,
    openGlobalSettings,
  } = useUIStore();

  const isDashboardActive = location.pathname === '/';
  const isExpensesActive = location.pathname === '/expenses';

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe lg:hidden"
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {/* 1. Dashboard Link */}
        <NavLink
          to="/"
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-colors ${
            isDashboardActive
              ? 'text-emerald-600 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${isDashboardActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="mt-1">Dashboard</span>
        </NavLink>

        {/* 2. Expenses Link */}
        <NavLink
          to="/expenses"
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-colors ${
            isExpensesActive
              ? 'text-emerald-600 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className={`w-5 h-5 ${isExpensesActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="mt-1">Expenses</span>
        </NavLink>

        {/* 3. Center Elevated Quick-Add (+) Button */}
        <div className="flex flex-col items-center justify-center flex-1 h-full -mt-4">
          <button
            onClick={openGlobalAddExpense}
            aria-label="Quick Add Expense"
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/35 border-2 border-white active:scale-95 transition-transform focus:outline-none"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className="text-[10px] font-semibold text-emerald-700 mt-1">Add</span>
        </div>

        {/* 4. Budget Goals Action */}
        <button
          onClick={openGlobalBudget}
          aria-label="Manage Budget Goals"
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors focus:outline-none"
        >
          <Target className="w-5 h-5 stroke-2" />
          <span className="mt-1">Budgets</span>
        </button>

        {/* 5. More / App Options */}
        <button
          onClick={openGlobalSettings}
          aria-label="Settings and options"
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors focus:outline-none"
        >
          <SlidersHorizontal className="w-5 h-5 stroke-2" />
          <span className="mt-1">More</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
