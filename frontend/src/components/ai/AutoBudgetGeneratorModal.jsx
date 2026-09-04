import React, { useState } from 'react';
import {
  X,
  Sparkles,
  PieChart,
  ShieldCheck,
  TrendingUp,
  Coins,
  CheckCircle2,
  Sliders,
  ArrowRight,
  RotateCcw,
  Check,
  Wallet,
  Calendar,
  Layers,
} from 'lucide-react';
import { aiApi } from '../../api/endpoints/ai';
import { useUIStore } from '../../store/useUIStore';
import { useBudgetStore } from '../../store/useBudgetStore';

export const AutoBudgetGeneratorModal = ({ isOpen, onClose, onBudgetApplied }) => {
  const { addToast, openGlobalBudget } = useUIStore();
  const { fetchBudgets } = useBudgetStore();

  const [step, setStep] = useState('input'); // 'input' | 'review' | 'applied'
  const [monthlyIncome, setMonthlyIncome] = useState('50000');
  const [lifestyleMode, setLifestyleMode] = useState('balanced');
  const [savingsPct, setSavingsPct] = useState(20);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [editedCategories, setEditedCategories] = useState({});

  if (!isOpen) return null;

  const handleQuickIncome = (amount) => {
    setMonthlyIncome(amount === 'auto' ? '' : amount.toString());
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        monthly_income: monthlyIncome ? parseFloat(monthlyIncome) : null,
        savings_target_percentage: parseInt(savingsPct, 10),
        lifestyle_mode: lifestyleMode,
      };

      const res = await aiApi.generateSmartBudget(payload);
      const data = res?.data?.data || res?.data || res;

      setPlanResult(data);
      // Initialize editable category limits
      const initialLimits = {};
      (data.categories || []).forEach((cat) => {
        initialLimits[cat.category_id || cat.category_name] = cat.recommended_limit;
      });
      setEditedCategories(initialLimits);
      setStep('review');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to generate smart budget plan';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryLimitChange = (key, val) => {
    const num = parseFloat(val) || 0;
    setEditedCategories((prev) => ({
      ...prev,
      [key]: num,
    }));
  };

  const handleApplyBudget = async () => {
    if (!planResult) return;
    setApplying(true);

    try {
      const categoryBudgets = (planResult.categories || []).map((cat) => {
        const key = cat.category_id || cat.category_name;
        return {
          category_id: cat.category_id || null,
          limit_amount: editedCategories[key] !== undefined ? editedCategories[key] : cat.recommended_limit,
        };
      });

      const payload = {
        period_month: null, // current month default
        overall_limit: planResult.overall_recommended_limit,
        category_budgets: categoryBudgets,
      };

      await aiApi.applySmartBudget(payload);
      addToast('AI 50/30/20 Smart Budget applied successfully!', 'success');
      
      if (fetchBudgets) fetchBudgets();
      if (onBudgetApplied) onBudgetApplied();
      setStep('applied');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to apply budget limits';
      addToast(msg, 'error');
    } finally {
      setApplying(false);
    }
  };

  const resetAll = () => {
    setStep('input');
    setPlanResult(null);
    setEditedCategories({});
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auto-budget-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-violet-50/50 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="auto-budget-modal-title"
                  className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-['Outfit']"
                >
                  AI 50/30/20 Smart Budget
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700/50">
                  Auto-Planner
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate golden ratio budget allocations tailored to your lifestyle
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

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">

          {/* STEP 1: CONFIGURATION & INPUT */}
          {step === 'input' && (
            <form onSubmit={handleGenerate} className="space-y-6">
              
              {/* Monthly Income Basis */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Monthly Take-Home Income (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    placeholder="e.g. 50000 (or leave empty for AI estimate)"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 text-base"
                  />
                </div>

                {/* Quick Income Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[30000, 50000, 75000, 100000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleQuickIncome(amt)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                        monthlyIncome === amt.toString()
                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-400'
                      }`}
                    >
                      ₹{(amt / 1000).toLocaleString('en-IN')}k
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleQuickIncome('auto')}
                    className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                      monthlyIncome === ''
                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-400'
                    }`}
                  >
                    Auto-Estimate
                  </button>
                </div>
              </div>

              {/* Lifestyle Mode Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Budgeting Strategy Preset
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* Balanced Card */}
                  <div
                    onClick={() => {
                      setLifestyleMode('balanced');
                      setSavingsPct(20);
                    }}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                      lifestyleMode === 'balanced'
                        ? 'bg-violet-50/80 dark:bg-violet-950/40 border-violet-500 shadow-sm ring-1 ring-violet-500'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🌿</span>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">Balanced</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      50% Needs · 30% Wants · 20% Savings
                    </p>
                    <span className="inline-block mt-2 text-[10px] uppercase font-bold text-violet-600 dark:text-violet-400">
                      Recommended
                    </span>
                  </div>

                  {/* Frugal Card */}
                  <div
                    onClick={() => {
                      setLifestyleMode('frugal');
                      setSavingsPct(20);
                    }}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                      lifestyleMode === 'frugal'
                        ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 shadow-sm ring-1 ring-amber-500'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🛡️</span>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">Frugal Saver</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      60% Needs · 20% Wants · 20% Savings
                    </p>
                    <span className="inline-block mt-2 text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                      Essential Focus
                    </span>
                  </div>

                  {/* Wealth Growth Card */}
                  <div
                    onClick={() => {
                      setLifestyleMode('growth');
                      setSavingsPct(30);
                    }}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                      lifestyleMode === 'growth'
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🚀</span>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">Wealth Builder</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      40% Needs · 30% Wants · 30% Savings
                    </p>
                    <span className="inline-block mt-2 text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                      High Growth
                    </span>
                  </div>
                </div>
              </div>

              {/* Custom Savings Slider */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>Target Savings & Investment Rate</span>
                  <span className="text-violet-600 dark:text-violet-400 text-sm font-black">
                    {savingsPct}% of Income
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="45"
                  step="5"
                  value={savingsPct}
                  onChange={(e) => setSavingsPct(e.target.value)}
                  className="w-full accent-violet-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>10% (Casual)</span>
                  <span>20% (Golden Standard)</span>
                  <span>45% (Aggressive)</span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-h-[48px]"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Spending History & Generating Budget...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>Generate AI 50/30/20 Smart Budget</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: REVIEW & CUSTOMIZE GENERATED PLAN */}
          {step === 'review' && planResult && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Income & Golden Ratio Visual Pill */}
              <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-4 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                      Income Basis
                    </span>
                    <p className="text-xl font-bold font-['Outfit'] text-white">
                      ₹{parseFloat(planResult.monthly_income_basis).toLocaleString('en-IN')}
                      <span className="text-xs text-slate-400 font-normal"> /month</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                      Total Monthly Cap
                    </span>
                    <p className="text-xl font-bold font-['Outfit'] text-violet-300">
                      ₹{parseFloat(planResult.overall_recommended_limit).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* 3-Bucket Visual Bar */}
                <div className="space-y-1.5">
                  <div className="h-3 w-full rounded-full bg-slate-800 flex overflow-hidden">
                    <div
                      style={{
                        width: `${(parseFloat(planResult.needs_allocation) / parseFloat(planResult.monthly_income_basis)) * 100}%`,
                      }}
                      className="bg-indigo-500 h-full"
                      title="Needs (50%)"
                    />
                    <div
                      style={{
                        width: `${(parseFloat(planResult.wants_allocation) / parseFloat(planResult.monthly_income_basis)) * 100}%`,
                      }}
                      className="bg-amber-500 h-full"
                      title="Wants (30%)"
                    />
                    <div
                      style={{
                        width: `${(parseFloat(planResult.savings_allocation) / parseFloat(planResult.monthly_income_basis)) * 100}%`,
                      }}
                      className="bg-emerald-500 h-full"
                      title="Savings Target (20%)"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-300 pt-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      Needs: ₹{Math.round(planResult.needs_allocation).toLocaleString('en-IN')}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Wants: ₹{Math.round(planResult.wants_allocation).toLocaleString('en-IN')}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Savings: ₹{Math.round(planResult.savings_allocation).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Strategic Philosophy Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border border-violet-200 dark:border-violet-800/50 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {planResult.ai_financial_philosophy}
                </p>
              </div>

              {/* Actionable Milestones */}
              {planResult.actionable_milestones?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Actionable Implementation Steps
                  </h3>
                  <div className="space-y-1.5">
                    {planResult.actionable_milestones.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Category Allocations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Category Budget Ceilings (Editable)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Fine-tune limits before saving
                  </span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(planResult.categories || []).map((cat) => {
                    const key = cat.category_id || cat.category_name;
                    const val = editedCategories[key] !== undefined ? editedCategories[key] : cat.recommended_limit;
                    const isNeed = cat.bucket_type === 'needs';

                    return (
                      <div
                        key={key}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isNeed
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                            }`}
                          >
                            {cat.bucket_type}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {cat.category_name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {cat.rationale}
                            </p>
                          </div>
                        </div>

                        {/* Editable Limit Field */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <span className="text-xs text-slate-400">₹</span>
                          <input
                            type="number"
                            min="100"
                            step="500"
                            value={val}
                            onChange={(e) => handleCategoryLimitChange(key, e.target.value)}
                            className="w-24 px-2.5 py-1.5 text-xs font-bold text-right rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-violet-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="w-full sm:w-1/3 py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Adjust Setup</span>
                </button>
                <button
                  type="button"
                  onClick={handleApplyBudget}
                  disabled={applying}
                  className="w-full sm:w-2/3 py-3 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
                >
                  {applying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Budgets to Database...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Apply & Activate This Budget</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ACTIVATION SUCCESS */}
          {step === 'applied' && (
            <div className="py-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">
                  AI 50/30/20 Budget Activated!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Your monthly overall spending cap and category budgets are now actively tracking your expenses.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
                <button
                  onClick={() => {
                    onClose();
                    resetAll();
                    openGlobalBudget();
                  }}
                  className="py-2.5 px-5 rounded-2xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 shadow-md shadow-violet-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  <span>View in Budget Manager</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    resetAll();
                  }}
                  className="py-2.5 px-5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
export default AutoBudgetGeneratorModal;
