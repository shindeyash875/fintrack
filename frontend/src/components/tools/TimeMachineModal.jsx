import React, { useState, useMemo } from 'react';
import {
  X,
  Hourglass,
  Sparkles,
  TrendingUp,
  Coins,
  ArrowRight,
  Coffee,
  Utensils,
  Tv,
  PartyPopper,
  Target,
} from 'lucide-react';
import Button from '../common/Button';
import AnimatedCounter from '../common/AnimatedCounter';
import { useUIStore } from '../../store/useUIStore';

const PRESETS = [
  { id: 'coffee', label: 'Skip 1 Daily Café Latte', daily: 150, icon: Coffee, desc: 'Cut ₹150/day on specialty coffees' },
  { id: 'dining', label: 'Cook vs Swiggy/Zomato (3x/wk)', daily: 300, icon: Utensils, desc: 'Save ₹2,100/week by home cooking' },
  { id: 'subs', label: 'Audit Unused Subscriptions', daily: 50, icon: Tv, desc: 'Save ₹1,500/month on OTT & apps' },
  { id: 'weekend', label: 'Smart Weekend Outings', daily: 250, icon: PartyPopper, desc: 'Save ₹7,500/month on party/cabs' },
];

export const TimeMachineModal = ({ isOpen, onClose }) => {
  const { openGlobalBudget, addToast, triggerConfetti } = useUIStore();

  const [dailySavings, setDailySavings] = useState(150);
  const [returnRate, setReturnRate] = useState(12); // 12% p.a. default for Equity SIP

  if (!isOpen) return null;

  const monthlySavings = dailySavings * 30;

  // SIP Future Value Compound Formula: FV = P * [((1+r)^n - 1) / r] * (1+r)
  const calculateSIP = (monthlyAmount, annualRatePercent, years) => {
    const months = years * 12;
    const monthlyRate = annualRatePercent / 12 / 100;
    if (monthlyRate === 0) {
      const invested = monthlyAmount * months;
      return { total: invested, invested, gains: 0 };
    }
    const fv =
      monthlyAmount *
      ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) *
      (1 + monthlyRate);
    const invested = monthlyAmount * months;
    const gains = Math.max(fv - invested, 0);
    return { total: fv, invested, gains };
  };

  const results = useMemo(() => {
    return {
      year1: calculateSIP(monthlySavings, returnRate, 1),
      year3: calculateSIP(monthlySavings, returnRate, 3),
      year5: calculateSIP(monthlySavings, returnRate, 5),
      year10: calculateSIP(monthlySavings, returnRate, 10),
    };
  }, [monthlySavings, returnRate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        aria-label="Close modal"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col my-auto z-10 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20">
              <Hourglass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                  "What-If" Financial Time Machine
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30">
                  Simulator
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simulate how cutting small daily expenses builds compound wealth
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[72vh]">
          {/* Quick Scenario Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select a Common Spending Cut Scenario:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = dailySavings === preset.daily;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setDailySavings(preset.daily)}
                    className={`p-2.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-violet-500/15 border-violet-500 dark:border-violet-400 text-violet-950 dark:text-violet-100 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-1.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold truncate leading-tight">{preset.label}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      ₹{preset.daily}/day
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Sliders */}
          <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            {/* Daily Cut Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Daily Expense Cut:
                </span>
                <div className="text-right">
                  <span className="text-sm font-bold text-violet-600 dark:text-violet-400 font-['Outfit']">
                    ₹{dailySavings.toLocaleString('en-IN')} / day
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5">
                    (= ₹{monthlySavings.toLocaleString('en-IN')}/mo)
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="20"
                max="1000"
                step="10"
                value={dailySavings}
                onChange={(e) => setDailySavings(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>

            {/* Expected Returns Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Expected Compound Return (% p.a.):
                </span>
                <span className="text-sm font-bold text-violet-600 dark:text-violet-400 font-['Outfit']">
                  {returnRate}% p.a. (SIP / Index Fund)
                </span>
              </div>
              <input
                type="range"
                min="6"
                max="18"
                step="0.5"
                value={returnRate}
                onChange={(e) => setReturnRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>
          </div>

          {/* Time Horizons Wealth Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1 Year Horizon */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  After 1 Year
                </span>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">
                  <AnimatedCounter value={results.year1.total} prefix="₹" decimals={0} />
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-emerald-500/20 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                <p>Saved: ₹{results.year1.invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  + ₹{results.year1.gains.toLocaleString('en-IN', { maximumFractionDigits: 0 })} returns
                </p>
              </div>
            </div>

            {/* 3 Years Horizon */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  After 3 Years
                </span>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">
                  <AnimatedCounter value={results.year3.total} prefix="₹" decimals={0} />
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-blue-500/20 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                <p>Saved: ₹{results.year3.invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                <p className="text-blue-600 dark:text-blue-400 font-semibold">
                  + ₹{results.year3.gains.toLocaleString('en-IN', { maximumFractionDigits: 0 })} returns
                </p>
              </div>
            </div>

            {/* 5 Years Horizon (Highlighted) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-transparent border-2 border-violet-500/40 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                    After 5 Years
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-violet-500/20 text-violet-700 dark:text-violet-300">
                    5X Power
                  </span>
                </div>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">
                  <AnimatedCounter value={results.year5.total} prefix="₹" decimals={0} />
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-violet-500/20 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                <p>Saved: ₹{results.year5.invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                <p className="text-violet-600 dark:text-violet-400 font-semibold">
                  + ₹{results.year5.gains.toLocaleString('en-IN', { maximumFractionDigits: 0 })} returns
                </p>
              </div>
            </div>
          </div>

          {/* 10-Year Long Term Master Corpus */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-violet-600/20">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-violet-200">
                  10-Year Compound Fortune
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold mt-1 font-['Outfit']">
                <AnimatedCounter value={results.year10.total} prefix="₹" decimals={0} />
              </p>
              <p className="text-xs text-violet-200 mt-0.5">
                Just ₹{dailySavings}/day creates a ₹{(results.year10.total / 100000).toFixed(2)} Lakh nest egg!
              </p>
            </div>
            <div className="text-right text-xs bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/20 shrink-0">
              <p className="text-violet-200">Invested: ₹{(results.year10.invested / 100000).toFixed(2)}L</p>
              <p className="font-bold text-amber-300">Pure Gains: ₹{(results.year10.gains / 100000).toFixed(2)}L</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Button
            type="button"
            variant="secondary"
            icon={Target}
            onClick={() => {
              triggerConfetti();
              onClose();
              openGlobalBudget();
            }}
          >
            Set Goal in Budgets
          </Button>
          <Button type="button" onClick={onClose}>
            Got It!
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TimeMachineModal;
