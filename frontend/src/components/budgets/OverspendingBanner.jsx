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
            ? 'bg-rose-50/90 border-rose-200/80 text-rose-950'
            : 'bg-amber-50/90 border-amber-200/80 text-amber-950'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                hasExceeded ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
              }`}
            >
              {hasExceeded ? <Flame className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>

            <div className="space-y-1.5">
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
                <div className="text-xs text-rose-800 space-y-1">
                  {overBudgetItems.map((item, idx) => (
                    <p key={idx} className="flex items-center gap-1.5">
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
                <div className="text-xs text-amber-800 space-y-1">
                  {nearLimitItems.map((item, idx) => (
                    <p key={idx} className="flex items-center gap-1.5">
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

          <div className="flex items-center gap-2 shrink-0">
            {onManageBudgets && (
              <button
                type="button"
                onClick={onManageBudgets}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
                  hasExceeded
                    ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700'
                    : 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700'
                }`}
              >
                Review Limits
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
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
