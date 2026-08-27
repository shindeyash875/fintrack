import React from 'react';
import { Award, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUIStore } from '../../store/useUIStore';

const RANK_BADGE_CLASSES = [
  'bg-amber-100 text-amber-800 border-amber-200', // #1 Gold
  'bg-slate-200 text-slate-700 border-slate-300', // #2 Silver
  'bg-orange-100 text-orange-800 border-orange-200', // #3 Bronze
  'bg-slate-100 text-slate-600 border-slate-200',
  'bg-slate-100 text-slate-600 border-slate-200',
];

const BAR_COLOR_CLASSES = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-pink-500',
];

export const TopCategoriesList = ({ categories = [], isLoading = false }) => {
  const { openGlobalCategory } = useUIStore();

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-sm animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/3" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (val) =>
    '₹' +
    Number(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900 font-['Outfit']">
                Top Categories
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Highest expense categories this month
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openGlobalCategory}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 transition-colors min-h-[36px]"
          >
            Manage
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {!categories || categories.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No category spending recorded for this period yet.
          </div>
        ) : (
          <div className="space-y-3.5">
            {categories.map((cat, idx) => {
              const rankClass =
                RANK_BADGE_CLASSES[idx] || 'bg-slate-100 text-slate-600 border-slate-200';
              const barClass =
                BAR_COLOR_CLASSES[idx] || 'bg-slate-400';

              return (
                <div key={cat.category_id || idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] border ${rankClass}`}
                      >
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {cat.category_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {formatCurrency(cat.total_amount)}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        ({cat.percentage}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar Container */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(cat.percentage, 100)}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-full rounded-full ${barClass}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopCategoriesList;
