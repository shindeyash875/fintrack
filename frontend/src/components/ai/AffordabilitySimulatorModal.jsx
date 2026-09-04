import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Target,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Calendar,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  Zap,
  Lightbulb,
  Plus,
  IndianRupee,
} from 'lucide-react';
import { aiApi } from '../../api/endpoints/ai';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useUIStore } from '../../store/useUIStore';

export const AffordabilitySimulatorModal = ({ isOpen, onClose }) => {
  const { categories, fetchCategories } = useCategoryStore();
  const { addToast, openGlobalAddExpense } = useUIStore();

  const [itemName, setItemName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('one_time'); // 'one_time' | 'emi'
  const [emiMonths, setEmiMonths] = useState(3);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (!categories || categories.length === 0) {
        fetchCategories();
      }
    }
  }, [isOpen, categories, fetchCategories]);

  const handleReset = () => {
    setItemName('');
    setAmount('');
    setCategoryId('');
    setPaymentMethod('one_time');
    setEmiMonths(3);
    setResult(null);
    setError(null);
  };

  const handleQuickAmount = (val) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(current + val));
  };

  const handleSimulate = async (e) => {
    if (e) e.preventDefault();

    const numAmount = parseFloat(amount);
    if (!itemName.trim()) {
      addToast('Please enter what you plan to buy.', 'error');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      addToast('Please enter a valid purchase price.', 'error');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedCat = categories.find((c) => c.id === categoryId);
      const payload = {
        item_name: itemName.trim(),
        amount: numAmount,
        category_id: categoryId || null,
        category_name: selectedCat ? selectedCat.name : null,
        payment_method: paymentMethod,
        emi_months: paymentMethod === 'emi' ? parseInt(emiMonths, 10) : 1,
      };

      const res = await aiApi.simulateAffordability(payload);
      const data = res?.data?.data || res?.data || res;
      setResult(data);
    } catch (err) {
      console.error('Affordability simulation failed:', err);
      setError(err?.response?.data?.detail || 'Failed to simulate purchase affordability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getVerdictTheme = (verdict) => {
    switch (verdict) {
      case 'SAFE_TO_BUY':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40',
          border: 'border-emerald-300 dark:border-emerald-800/60',
          badge: 'bg-emerald-500 text-white shadow-emerald-500/25',
          icon: ShieldCheck,
          iconColor: 'text-emerald-500',
          textColor: 'text-emerald-900 dark:text-emerald-200',
          subtext: 'text-emerald-700 dark:text-emerald-400',
        };
      case 'CAUTION':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40',
          border: 'border-amber-300 dark:border-amber-800/60',
          badge: 'bg-amber-500 text-white shadow-amber-500/25',
          icon: AlertTriangle,
          iconColor: 'text-amber-500',
          textColor: 'text-amber-900 dark:text-amber-200',
          subtext: 'text-amber-700 dark:text-amber-400',
        };
      default:
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/40',
          border: 'border-rose-300 dark:border-rose-800/60',
          badge: 'bg-rose-500 text-white shadow-rose-500/25',
          icon: ShieldAlert,
          iconColor: 'text-rose-500',
          textColor: 'text-rose-900 dark:text-rose-200',
          subtext: 'text-rose-700 dark:text-rose-400',
        };
    }
  };

  const theme = result ? getVerdictTheme(result.verdict) : null;
  const VerdictIcon = theme?.icon || ShieldCheck;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="affordability-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-teal-50/50 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="affordability-modal-title" className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">
                  Can I Afford This?
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700/50">
                  AI Simulator
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simulate purchase impact on your budget and daily safe spending
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {!result ? (
            /* Simulation Input Form */
            <form onSubmit={handleSimulate} className="space-y-5">
              {/* Item Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  What do you want to buy? <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Sony Wireless Headphones, Goa Trip, Air Fryer"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-medium transition-all"
                  required
                />
              </div>

              {/* Price & Quick Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Purchase Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1000, 5000, 10000, 25000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleQuickAmount(val)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-600 dark:hover:text-teal-300 transition-colors border border-slate-200/60 dark:border-slate-700"
                      >
                        +{val >= 1000 ? `${val / 1000}k` : val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-bold font-['Outfit'] transition-all"
                    required
                  />
                </div>
              </div>

              {/* Category & Payment Method Split */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Category (Optional)
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  >
                    <option value="">General / Discretionary</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Option */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payment Plan
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('one_time')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        paymentMethod === 'one_time'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                      }`}
                    >
                      One-Time
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('emi')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        paymentMethod === 'emi'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                      }`}
                    >
                      EMI
                    </button>
                  </div>
                </div>
              </div>

              {/* EMI Months Slider/Buttons if EMI is selected */}
              {paymentMethod === 'emi' && (
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      EMI Duration
                    </span>
                    <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 font-['Outfit']">
                      ₹{amount ? Math.round(parseFloat(amount) / emiMonths).toLocaleString('en-IN') : 0} / month
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[3, 6, 9, 12, 18, 24].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setEmiMonths(m)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          emiMonths === m
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-indigo-50'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Simulate Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-h-[48px]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Budget & Simulating Impact...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Simulate Affordability</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Simulation Results View */
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Verdict Banner Card */}
              <div
                className={`p-5 sm:p-6 rounded-3xl ${theme.bg} border ${theme.border} space-y-4 shadow-sm`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-md shrink-0">
                      <VerdictIcon className={`w-6 h-6 ${theme.iconColor}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${theme.badge}`}
                        >
                          {result.verdict.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-['Outfit']">
                          {result.affordability_score}/100 Score
                        </span>
                      </div>
                      <h3 className={`text-base sm:text-lg font-bold font-['Outfit'] mt-1 ${theme.textColor}`}>
                        {result.verdict_title}
                      </h3>
                    </div>
                  </div>
                </div>

                <p className={`text-xs sm:text-sm leading-relaxed ${theme.subtext}`}>
                  {result.verdict_description}
                </p>
              </div>

              {/* Safe Daily Allowance Impact */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-750 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Safe Daily Spending Allowance
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {result.impact.days_remaining_in_month} days remaining
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Before Purchase
                    </span>
                    <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-['Outfit'] mt-0.5">
                      ₹{Math.round(result.impact.daily_budget_before).toLocaleString('en-IN')}{' '}
                      <span className="text-[10px] font-normal text-slate-400">/day</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      After Purchase
                    </span>
                    <p
                      className={`text-base sm:text-lg font-bold font-['Outfit'] mt-0.5 ${
                        result.impact.daily_budget_after < result.impact.daily_budget_before * 0.5
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      ₹{Math.round(result.impact.daily_budget_after).toLocaleString('en-IN')}{' '}
                      <span className="text-[10px] font-normal text-slate-400">/day</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Tactical Recommendations</span>
                  </div>
                  <div className="space-y-2">
                    {result.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300"
                      >
                        <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative Strategies */}
              {result.alternative_strategies && result.alternative_strategies.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <Lightbulb className="w-4 h-4 text-indigo-500" />
                    <span>Smart Alternatives & Roadmap</span>
                  </div>
                  <div className="space-y-2">
                    {result.alternative_strategies.map((alt, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs text-slate-700 dark:text-slate-300"
                      >
                        <ArrowRight className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <span>{alt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors min-h-[44px]"
                >
                  Simulate Another Item
                </button>
                <button
                  onClick={() => {
                    onClose();
                    openGlobalAddExpense();
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-bold shadow-md transition-colors min-h-[44px]"
                >
                  Log as Expense
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AffordabilitySimulatorModal;
