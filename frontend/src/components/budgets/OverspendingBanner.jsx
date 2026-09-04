import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Flame, ArrowRight, X } from 'lucide-react';
import { useBudgetStore } from '../../store/useBudgetStore';

export const OverspendingBanner = ({ onManageBudgets }) => {
  const { status } = useBudgetStore();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || !status) return null;

  const overBudgetItems = [];
  const nearLimitItems = [];

  if (status.overall) {
    if (status.overall.status === 'over_budget') {
      overBudgetItems.push({
        name: 'Overall Monthly Budget',
        exceededBy: Math.abs(Number(status.overall.remaining_amount)),
        percentage: status.overall.percentage_used,
      });
    } else if (status.overall.status === 'near_limit') {
      nearLimitItems.push({
        name: 'Overall Monthly Budget',
        remaining: Number(status.overall.remaining_amount),
        percentage: status.overall.percentage_used,
      });
    }
  }

  if (status.categories && status.categories.length > 0) {
    for (const cat of status.categories) {
      if (cat.status === 'over_budget') {
        overBudgetItems.push({
          name: cat.category_name,
          exceededBy: Math.abs(Number(cat.remaining_amount)),
          percentage: cat.percentage_used,
        });
      } else if (cat.status === 'near_limit') {
        nearLimitItems.push({
          name: cat.category_name,
          remaining: Number(cat.remaining_amount),
          percentage: cat.percentage_used,
        });
      }
    }
  }

  if (overBudgetItems.length === 0 && nearLimitItems.length === 0) {
    return null;
  }

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const hasExceeded = overBudgetItems.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className={`rounded-2xl p-4 sm:p-5 border shadow-sm ${
          hasExceeded
            ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-900/60 text-rose-950 dark:text-rose-100'
            : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/60 text-amber-950 dark:text-amber-100'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                hasExceeded
                  ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'
                  : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
              }`}
            >
              {hasExceeded ? <Flame className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>

            <div className="space-y-1.5 min-w-0">
              <h4 className="text-sm font-bold tracking-tight">
                {hasExceeded
                  ? `Overspending Alert: ${overBudgetItems.length} budget limit${
                      overBudgetItems.length > 1 ? 's' : ''
                    } exceeded`
                  : `Spending Notice: ${nearLimitItems.length} budget limit${
                      nearLimitItems.length > 1 ? 's' : ''
                    } near capacity`}
              </h4>

              {/* Over Budget Bullets */}
              {overBudgetItems.length > 0 && (
                <div className="text-xs text-rose-800 dark:text-rose-300 space-y-1">
                  {overBudgetItems.map((item, idx) => (
                    <p key={idx} className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold">{item.name}:</span>
                      <span>
                        Exceeded by <span className="font-bold">{formatCurrency(item.exceededBy)}</span> ({item.percentage}% used)
                      </span>
                    </p>
                  ))}
                </div>
              )}

              {/* Near Limit Bullets */}
              {nearLimitItems.length > 0 && (
                <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  {nearLimitItems.map((item, idx) => (
                    <p key={idx} className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold">{item.name}:</span>
                      <span>
                        {item.percentage}% used (<span className="font-bold">{formatCurrency(item.remaining)}</span> remaining)
                      </span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-rose-200/50 dark:border-rose-900/40">
            {onManageBudgets && (
              <button
                type="button"
                onClick={onManageBudgets}
                className={`text-xs font-bold px-3 py-2 rounded-xl border transition-colors flex items-center gap-1 min-h-[38px] ${
                  hasExceeded
                    ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700 active:scale-95'
                    : 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700 active:scale-95'
                }`}
              >
                Review Limits
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Dismiss for this session"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OverspendingBanner;
