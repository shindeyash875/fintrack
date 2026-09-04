import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Settings, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Flame 
} from 'lucide-react';
import Button from '../common/Button';
import BudgetModal from './BudgetModal';
import { useBudgetStore } from '../../store/useBudgetStore';

export const BudgetTracker = () => {
  const { status, periodMonth, setPeriodMonth, isLoading } = useBudgetStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Month navigation helpers
  const currentPeriodDate = new Date(periodMonth || new Date().toISOString().slice(0, 7) + '-01');

  const formatMonthYear = (d) => {
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const handlePrevMonth = () => {
    const prev = new Date(currentPeriodDate);
    prev.setMonth(prev.getMonth() - 1);
    setPeriodMonth(prev.toISOString().slice(0, 7) + '-01');
  };

  const handleNextMonth = () => {
    const next = new Date(currentPeriodDate);
    next.setMonth(next.getMonth() + 1);
    setPeriodMonth(next.toISOString().slice(0, 7) + '-01');
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setPeriodMonth(now.toISOString().slice(0, 7) + '-01');
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getStatusBadge = (budgetStatus, percentage) => {
    switch (budgetStatus) {
      case 'on_track':
        return {
          label: 'On Track',
          badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800',
          barClass: 'bg-emerald-500',
          icon: CheckCircle2,
        };
      case 'near_limit':
        return {
          label: 'Near Limit',
          badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/80 dark:border-amber-800',
          barClass: 'bg-amber-500',
          icon: AlertTriangle,
        };
      case 'over_budget':
        return {
          label: 'Over Budget',
          badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-800',
          barClass: 'bg-rose-500',
          icon: Flame,
        };
      default:
        return {
          label: 'On Track',
          badgeClass: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700',
          barClass: 'bg-emerald-500',
          icon: CheckCircle2,
        };
    }
  };

  const overall = status?.overall;
  const categories = status?.categories || [];
  const hasAnyBudgets = Boolean(overall || categories.length > 0);

  return (
    <div className="space-y-6">
      {/* Header & Month Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white font-['Outfit']">
              Budget & Spending Goals
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor real-time remaining balances against your monthly targets.
          </p>
        </div>

        {/* Controls: Month Nav + Manage Button */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleCurrentMonth}
              className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
              title="Jump to current month"
            >
              {formatMonthYear(currentPeriodDate)}
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={Settings}
            variant="secondary"
          >
            Manage Goals
          </Button>
        </div>
      </div>

      {/* Main Budget Display */}
      {hasAnyBudgets ? (
        <div className="space-y-6">
          {/* Overall Monthly Budget Card */}
          {overall ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm"
            >
              {(() => {
                const badgeInfo = getStatusBadge(overall.status, overall.percentage_used);
                const BadgeIcon = badgeInfo.icon;
                const progressWidth = Math.min(Math.max(overall.percentage_used, 0), 100);
                const isOver = Number(overall.remaining_amount) < 0;

                return (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Primary Goal
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeInfo.badgeClass}`}
                          >
                            <BadgeIcon className="w-3 h-3" />
                            {badgeInfo.label} • {overall.percentage_used}%
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white font-['Outfit'] mt-1">
                          Overall Monthly Budget
                        </h3>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-xs text-slate-400 uppercase font-semibold">
                          {isOver ? 'Exceeded by' : 'Remaining Balance'}
                        </p>
                        <p
                          className={`text-2xl font-bold font-['Outfit'] ${
                            isOver ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isOver
                            ? `- ${formatCurrency(Math.abs(Number(overall.remaining_amount)))}`
                            : formatCurrency(overall.remaining_amount)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar with 3-tier colors */}
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressWidth}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={`h-full rounded-full ${badgeInfo.barClass}`}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span>Spent: {formatCurrency(overall.spent_amount)}</span>
                        <span>Target: {formatCurrency(overall.limit_amount)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No overall monthly limit set</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Setting an overall monthly goal lets you track total spending pace at a glance.
                </p>
              </div>
              <Button size="sm" onClick={() => setIsModalOpen(true)} icon={Plus}>
                Set Overall Limit
              </Button>
            </div>
          )}

          {/* Category-Specific Budgets Grid */}
          {categories.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Category Spending Limits ({categories.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => {
                  const badgeInfo = getStatusBadge(cat.status, cat.percentage_used);
                  const BadgeIcon = badgeInfo.icon;
                  const progressWidth = Math.min(Math.max(cat.percentage_used, 0), 100);
                  const isOver = Number(cat.remaining_amount) < 0;

                  return (
                    <motion.div
                      key={cat.budget_id || cat.category_id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {cat.category_name}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badgeInfo.badgeClass}`}
                          >
                            <BadgeIcon className="w-3 h-3" />
                            {cat.percentage_used}%
                          </span>
                        </div>

                        <div className="space-y-1 mb-4">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Remaining</span>
                            <span
                              className={`font-bold ${
                                isOver ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {isOver
                                ? `- ${formatCurrency(Math.abs(Number(cat.remaining_amount)))}`
                                : formatCurrency(cat.remaining_amount)}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progressWidth}%` }}
                              transition={{ duration: 0.5 }}
                              className={`h-full rounded-full ${badgeInfo.barClass}`}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 font-medium">
                        <span>Spent: {formatCurrency(cat.spent_amount)}</span>
                        <span>Limit: {formatCurrency(cat.limit_amount)}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Outfit']">
            No budget goals set for {formatMonthYear(currentPeriodDate)}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
            Take control of your finances by setting an overall monthly spending ceiling or specific category limits.
          </p>
          <Button onClick={() => setIsModalOpen(true)} icon={Plus} size="md">
            Set Your First Budget Goal
          </Button>
        </div>
      )}

      {/* Budget Modal */}
      <BudgetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default BudgetTracker;
