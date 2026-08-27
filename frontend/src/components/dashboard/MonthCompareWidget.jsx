import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Calendar, Sparkles } from 'lucide-react';

export const MonthCompareWidget = ({ compareData, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm animate-pulse h-36 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-slate-100 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!compareData) return null;

  const {
    current_month_total = 0,
    previous_month_total = 0,
    percentage_change = 0,
    is_increase = false,
  } = compareData;

  const current = Number(current_month_total);
  const previous = Number(previous_month_total);
  const diff = Math.abs(current - previous);

  const formatCurrency = (val) =>
    '₹' +
    Number(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Interpret change:
  // If spending went DOWN (is_increase = false and diff > 0), user saved money (positive feedback)
  // If spending went UP (is_increase = true and diff > 0), user spent more
  const isZeroChange = diff === 0;

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Month-over-Month
            </span>
          </div>
          <h4 className="text-xl font-bold text-slate-900 font-['Outfit']">
            {formatCurrency(current)}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            vs {formatCurrency(previous)} last month
          </p>
        </div>

        {/* Change Indicator Badge */}
        <div className="flex flex-col items-end">
          {isZeroChange ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
              <Minus className="w-3.5 h-3.5" />
              0.0%
            </span>
          ) : is_increase ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +{percentage_change}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ArrowDownRight className="w-3.5 h-3.5" />
              {percentage_change}%
            </span>
          )}

          <span className="text-[11px] font-semibold text-slate-400 mt-1.5">
            {isZeroChange
              ? 'Identical to last month'
              : is_increase
              ? `${formatCurrency(diff)} more spend`
              : `${formatCurrency(diff)} lower spend`}
          </span>
        </div>
      </div>

      {/* Encouraging Context Note */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500">
        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span>
          {isZeroChange
            ? 'Monthly spending is currently tracking evenly.'
            : is_increase
            ? 'Spending is trending higher this month. Consider checking your category limits.'
            : 'Great job! Spending is lower compared to this time last month.'}
        </span>
      </div>
    </div>
  );
};

export default MonthCompareWidget;
