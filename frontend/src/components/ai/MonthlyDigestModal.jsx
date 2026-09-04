import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  PieChart,
  Calendar,
  Copy,
  Check,
  RefreshCw,
  Zap,
  ShieldAlert,
  ArrowRight,
  Flame,
  Award,
  Wallet,
} from 'lucide-react';
import { aiApi } from '../../api/endpoints/ai';
import { useUIStore } from '../../store/useUIStore';

export const MonthlyDigestModal = ({ isOpen, onClose }) => {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [digest, setDigest] = useState(null);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'wins' | 'leaks' | 'action_plan' | 'categories'
  const [copied, setCopied] = useState(false);

  // Month navigation: format "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchDigest = useCallback(async (monthStr) => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiApi.getMonthlyDigest(monthStr);
      const data = res?.data?.data || res?.data || res;
      setDigest(data);
    } catch (err) {
      console.error('Failed to load monthly digest:', err);
      setError(err?.response?.data?.detail || 'Failed to generate financial health digest. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDigest(selectedMonth);
    }
  }, [isOpen, selectedMonth, fetchDigest]);

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    const current = new Date();
    // Don't allow future months beyond current month
    if (d.getFullYear() > current.getFullYear() || (d.getFullYear() === current.getFullYear() && d.getMonth() > current.getMonth())) {
      addToast('Future months have no financial transactions yet.', 'info');
      return;
    }
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleCopySummary = async () => {
    if (!digest) return;
    const summaryText = `📊 **FinTrack Monthly Financial Digest — ${digest.month_name}**
🏆 Health Score: ${digest.health_score}/100 (Grade: ${digest.grade})
💡 ${digest.headline}

${digest.executive_summary}

💰 Total Spent: ₹${digest.total_spent?.toLocaleString('en-IN')}
🎯 Budget Status: ${digest.savings_or_deficit >= 0 ? `Saved ₹${digest.savings_or_deficit?.toLocaleString('en-IN')}` : `Overspent by ₹${Math.abs(digest.savings_or_deficit)?.toLocaleString('en-IN')}`}

🌟 **Top Wins:**
${digest.biggest_wins?.map((w) => `• ${w}`).join('\n') || '• Consistent tracking maintained.'}

🎯 **Action Plan for Next Month:**
${digest.action_plan_next_month?.map((a) => `• ${a}`).join('\n') || '• Continue monitoring budgets.'}`;

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      addToast('Executive Digest copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      addToast('Could not copy to clipboard.', 'error');
    }
  };

  if (!isOpen) return null;

  // Grade styling
  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return {
          bg: 'bg-emerald-500/10 dark:bg-emerald-950/40',
          border: 'border-emerald-500/30',
          text: 'text-emerald-600 dark:text-emerald-400',
          badge: 'bg-emerald-500 text-white shadow-emerald-500/25',
          ring: 'stroke-emerald-500',
        };
      case 'B':
        return {
          bg: 'bg-teal-500/10 dark:bg-teal-950/40',
          border: 'border-teal-500/30',
          text: 'text-teal-600 dark:text-teal-400',
          badge: 'bg-teal-500 text-white shadow-teal-500/25',
          ring: 'stroke-teal-500',
        };
      case 'C':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-950/40',
          border: 'border-amber-500/30',
          text: 'text-amber-600 dark:text-amber-400',
          badge: 'bg-amber-500 text-white shadow-amber-500/25',
          ring: 'stroke-amber-500',
        };
      default:
        return {
          bg: 'bg-rose-500/10 dark:bg-rose-950/40',
          border: 'border-rose-500/30',
          text: 'text-rose-600 dark:text-rose-400',
          badge: 'bg-rose-500 text-white shadow-rose-500/25',
          ring: 'stroke-rose-500',
        };
    }
  };

  const gradeStyle = getGradeColor(digest?.grade || 'B');
  const score = digest?.health_score || 0;
  const strokeDashoffset = 282.7 - (282.7 * score) / 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="digest-title"
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4.5 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-slate-50 via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="digest-title" className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">
                  AI Monthly Health Digest
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
                  Scorecard
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Executive financial insights & proactive money habits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Month Navigator */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={handlePrevMonth}
                disabled={loading}
                aria-label="Previous month"
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors disabled:opacity-50 min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>{digest?.month_name || selectedMonth}</span>
              </div>
              <button
                onClick={handleNextMonth}
                disabled={loading}
                aria-label="Next month"
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors disabled:opacity-50 min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => fetchDigest(selectedMonth)}
              disabled={loading}
              title="Refresh digest"
              aria-label="Refresh digest"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
            </button>

            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                <Sparkles className="w-6 h-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  Synthesizing Financial Scorecard...
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  Analyzing expense trends, computing leak alerts, and generating your executive month-end review.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="py-12 px-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
              <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
                Digest Unavailable
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto">
                {error}
              </p>
              <button
                onClick={() => fetchDigest(selectedMonth)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Analysis
              </button>
            </div>
          ) : digest ? (
            <>
              {/* Executive Scorecard Hero Card */}
              <div
                className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 ${gradeStyle.bg} border ${gradeStyle.border} transition-all shadow-sm`}
              >
                {/* Background decorative glow */}
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
                  {/* Circular Score Gauge */}
                  <div className="relative flex items-center justify-center shrink-0">
                    <svg className="w-32 h-32 sm:w-36 sm:h-36 transform -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r="45"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-slate-200 dark:text-slate-800"
                        fill="transparent"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r="45"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray="282.7"
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className={`${gradeStyle.ring} transition-all duration-1000 ease-out`}
                        fill="transparent"
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] tracking-tight">
                        {score}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        / 100 Score
                      </span>
                    </div>

                    {/* Grade Pill Badge */}
                    <div
                      className={`absolute -bottom-2 px-3 py-1 rounded-full text-xs font-black shadow-lg ${gradeStyle.badge}`}
                    >
                      GRADE {digest.grade}
                    </div>
                  </div>

                  {/* Executive Headline & Summary */}
                  <div className="flex-1 text-center md:text-left space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-xs">
                      <Award className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Financial Health Index</span>
                    </div>

                    <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug font-['Outfit']">
                      {digest.headline}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {digest.executive_summary}
                    </p>

                    <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <button
                        onClick={handleCopySummary}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-xs transition-colors"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copy Report</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* High-Level Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-750">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Total Spent
                  </span>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-['Outfit'] mt-1">
                    ₹{digest.total_spent?.toLocaleString('en-IN') || '0'}
                  </p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {digest.total_transactions} transactions
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-750">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Budget Limit
                  </span>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-['Outfit'] mt-1">
                    {digest.budget_limit ? `₹${digest.budget_limit.toLocaleString('en-IN')}` : 'No Budget Set'}
                  </p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Target ceiling
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-750">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Net Surplus / Deficit
                  </span>
                  <p
                    className={`text-lg sm:text-xl font-bold font-['Outfit'] mt-1 ${
                      digest.savings_or_deficit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {digest.savings_or_deficit >= 0 ? '+' : ''}₹{digest.savings_or_deficit?.toLocaleString('en-IN') || '0'}
                  </p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {digest.savings_or_deficit >= 0 ? 'Saved under budget' : 'Over budget'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-750">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Daily Average
                  </span>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-['Outfit'] mt-1">
                    ₹{Math.round(digest.daily_average || 0).toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Per day spending pace
                  </span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeTab === 'summary'
                      ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Overview</span>
                </button>

                <button
                  onClick={() => setActiveTab('wins')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeTab === 'wins'
                      ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Wins ({digest.biggest_wins?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('leaks')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeTab === 'leaks'
                      ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Spending Leaks ({digest.top_spending_leaks?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('action_plan')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeTab === 'action_plan'
                      ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Next Month Plan ({digest.action_plan_next_month?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('categories')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeTab === 'categories'
                      ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <PieChart className="w-3.5 h-3.5 text-teal-400" />
                  <span>Categories ({digest.category_insights?.length || 0})</span>
                </button>
              </div>

              {/* Tab Contents */}
              {activeTab === 'summary' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Wins Card */}
                  <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                      <Trophy className="w-4 h-4 text-emerald-500" />
                      <span>Financial Wins & Highlights</span>
                    </div>
                    <ul className="space-y-2">
                      {digest.biggest_wins && digest.biggest_wins.length > 0 ? (
                        digest.biggest_wins.map((win, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{win}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-xs text-slate-500 dark:text-slate-400">
                          Consistent expense recording maintained.
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Leaks Card */}
                  <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 space-y-3">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-sm">
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                      <span>Spending Leaks & Watchouts</span>
                    </div>
                    {digest.top_spending_leaks && digest.top_spending_leaks.length > 0 ? (
                      <div className="space-y-2">
                        {digest.top_spending_leaks.slice(0, 2).map((leak, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-rose-100 dark:border-rose-900/40 text-xs">
                            <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                              <span>{leak.category}</span>
                              <span className="text-rose-600 dark:text-rose-400 font-['Outfit']">
                                ₹{leak.leak_amount?.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                              {leak.pattern_reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        🎉 No severe spending leaks detected this month!
                      </p>
                    )}
                  </div>

                  {/* Action Plan Card */}
                  <div className="md:col-span-2 p-5 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/70 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/30 border border-indigo-200/60 dark:border-indigo-800/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-bold text-sm">
                        <Zap className="w-4 h-4 text-indigo-500" />
                        <span>AI Action Plan for Next Month</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                        Strategic Guidance
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {digest.action_plan_next_month?.map((plan, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-3 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900/40 text-xs text-slate-700 dark:text-slate-300"
                        >
                          <ArrowRight className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                          <span>{plan}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'wins' && (
                <div className="space-y-3">
                  {digest.biggest_wins && digest.biggest_wins.length > 0 ? (
                    digest.biggest_wins.map((win, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3.5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50"
                      >
                        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-500/20">
                          <Trophy className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                            {win}
                          </p>
                          <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
                            Positive financial milestone achieved
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No specific wins recorded yet.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'leaks' && (
                <div className="space-y-3">
                  {digest.top_spending_leaks && digest.top_spending_leaks.length > 0 ? (
                    digest.top_spending_leaks.map((leak, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                              {leak.category}
                            </span>
                            <span className="text-xs text-rose-700 dark:text-rose-400 font-medium">
                              Severity: {leak.severity}
                            </span>
                          </div>
                          <span className="text-base font-bold text-rose-700 dark:text-rose-300 font-['Outfit']">
                            ₹{leak.leak_amount?.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          {leak.pattern_reason}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 pt-1 border-t border-rose-200/50 dark:border-rose-900/40">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Recommendation: {leak.recommendation}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Zero spending leaks detected!
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        You maintained strict budget adherence across all categories.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'action_plan' && (
                <div className="space-y-3">
                  {digest.action_plan_next_month && digest.action_plan_next_month.length > 0 ? (
                    digest.action_plan_next_month.map((plan, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3.5 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                            {plan}
                          </p>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            Recommended habit for next month
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No action plan items generated.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'categories' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {digest.category_insights && digest.category_insights.length > 0 ? (
                    digest.category_insights.map((cat, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-750 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {cat.category_name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                cat.status === 'within_budget'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                                  : cat.status === 'over_budget'
                                  ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {cat.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white font-['Outfit']">
                            ₹{cat.total_spent?.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {cat.budget_limit && (
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                cat.total_spent > cat.budget_limit ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{
                                width: `${Math.min(100, (cat.total_spent / cat.budget_limit) * 100)}%`,
                              }}
                            />
                          </div>
                        )}

                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                          {cat.insight}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="sm:col-span-2 text-center py-10 text-slate-400 text-xs">
                      No category insights found for this month.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Powered by FinTrack Intelligent Multi-LLM Engine</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-bold shadow-md transition-colors min-h-[36px]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonthlyDigestModal;
