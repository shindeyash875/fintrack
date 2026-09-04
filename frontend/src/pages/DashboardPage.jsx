import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Wallet, 
  CreditCard, 
  AlertTriangle,
  Plus,
  Target,
  Camera,
  Sparkles,
  Users,
  Calendar,
  Hourglass,
  Command,
  ArrowUpRight,
  PartyPopper,
} from 'lucide-react';
import { dashboardApi } from '../api/endpoints/dashboard';
import { CardSkeleton } from '../components/common/Skeleton';
import Button from '../components/common/Button';
import { useNavigate } from 'react-router-dom';
import BudgetTracker from '../components/budgets/BudgetTracker';
import OverspendingBanner from '../components/budgets/OverspendingBanner';
import BudgetModal from '../components/budgets/BudgetModal';
import ReceiptScannerModal from '../components/expenses/ReceiptScannerModal';
import ExpenseModal from '../components/expenses/ExpenseModal';
import AIQuickInput from '../components/expenses/AIQuickInput';
import FinancialMoodAvatar from '../components/dashboard/FinancialMoodAvatar';
import AIForecastCard from '../components/dashboard/AIForecastCard';
import CategoryPieChart from '../components/dashboard/CategoryPieChart';
import SpendingTrendChart from '../components/dashboard/SpendingTrendChart';
import MonthCompareWidget from '../components/dashboard/MonthCompareWidget';
import TopCategoriesList from '../components/dashboard/TopCategoriesList';
import AnimatedCounter from '../components/common/AnimatedCounter';
import Sparkline from '../components/dashboard/Sparkline';
import SpotlightCard from '../components/common/SpotlightCard';
import FinTrackCard3D from '../components/dashboard/FinTrackCard3D';
import Coin3D from '../components/common/Coin3D';
import { useBudgetStore } from '../store/useBudgetStore';
import { useUIStore } from '../store/useUIStore';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [categoryChartData, setCategoryChartData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [compareData, setCompareData] = useState(null);
  const [granularity, setGranularity] = useState('daily');

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingCategoryChart, setIsLoadingCategoryChart] = useState(true);
  const [isLoadingTrend, setIsLoadingTrend] = useState(true);
  const [isLoadingCompare, setIsLoadingCompare] = useState(true);
  const [error, setError] = useState(null);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [prefillExpense, setPrefillExpense] = useState(null);
  
  const { fetchAll, status } = useBudgetStore();
  const { 
    openBillSplitter, 
    openSubscriptions, 
    openTimeMachine, 
    openCommandPalette,
    triggerConfetti,
  } = useUIStore();

  // Fetch Summary & MoM comparison
  const fetchOverview = useCallback(async () => {
    try {
      fetchAll();
      const [sumRes, compRes, catRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getCompare(),
        dashboardApi.getByCategory(),
      ]);

      setSummary(sumRes.data);
      setCompareData(compRes.data);
      setCategoryChartData(catRes.data || []);
      setIsLoadingSummary(false);
      setIsLoadingCompare(false);
      setIsLoadingCategoryChart(false);
    } catch (err) {
      setError(err.message || 'Could not connect to live backend.');
      setIsLoadingSummary(false);
      setIsLoadingCompare(false);
      setIsLoadingCategoryChart(false);
    }
  }, [fetchAll]);

  // Fetch Time-series Trend Data with Granularity (daily/weekly/monthly)
  const fetchTrends = useCallback(async (gran) => {
    setIsLoadingTrend(true);
    try {
      const res = await dashboardApi.getOverTime({ granularity: gran });
      setTrendData(res.data || []);
    } catch (err) {
      console.error('Failed to load spending trend:', err);
    } finally {
      setIsLoadingTrend(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchTrends(granularity);
  }, [fetchTrends, granularity]);

  const handleGranularityChange = (newGran) => {
    setGranularity(newGran);
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 7-day sparkline points derived from trend data
  const sparklinePoints = useMemo(() => {
    if (trendData && trendData.length > 0) {
      const pts = trendData.slice(-7).map((d) => Number(d.amount) || 0);
      return pts.length >= 2 ? pts : [10, 25, 18, 40, 28, 55, 42];
    }
    return [15, 30, 22, 45, 35, 60, 48];
  }, [trendData]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 sm:space-y-8"
    >
      {/* Top Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Coin3D size="sm" variant="gold" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-['Outfit']">
              Financial Dashboard
            </h1>
            <button
              type="button"
              onClick={triggerConfetti}
              title="Celebrate financial wins!"
              className="p-1 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all cursor-pointer active:scale-90"
            >
              <PartyPopper className="w-5 h-5 text-amber-500" />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
            Real-time spending overview, interactive charts & budget goal tracking.
          </p>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <Button onClick={() => setIsBudgetModalOpen(true)} icon={Target} variant="secondary" size="md" className="flex-1 sm:flex-none">
            Set Budget
          </Button>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('ai-forecast');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xs hover:shadow transition-all duration-150 flex-1 sm:flex-none cursor-pointer shimmer-container"
          >
            <TrendingUp className="w-4 h-4" />
            <span>AI Forecast</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] uppercase font-bold bg-indigo-400/30 text-indigo-100 border border-indigo-300/40">
              Insights
            </span>
          </button>
          <Button
            onClick={() => {
              setPrefillExpense(null);
              setIsExpenseModalOpen(true);
            }}
            icon={Plus}
            size="md"
            className="flex-1 sm:flex-none shimmer-container"
          >
            Add Expense
          </Button>
        </div>
      </motion.div>

      {/* AI Quick Input Bar */}
      <motion.div variants={itemVariants}>
        <AIQuickInput
          onExpenseCreated={fetchOverview}
          onOpenEditModal={(prefill) => {
            setPrefillExpense(prefill);
            setIsExpenseModalOpen(true);
          }}
        />
      </motion.div>

      {/* Smart Financial Tools Quick Ribbon ("Hatke" Suite) */}
      <motion.div variants={itemVariants} className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 hidden md:inline">
          Smart Tools:
        </span>

        <button
          type="button"
          onClick={openBillSplitter}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs group active:scale-95"
        >
          <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
          <span>Bill & Group Splitter</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
            WhatsApp
          </span>
        </button>

        <button
          type="button"
          onClick={openSubscriptions}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-blue-500/10 hover:bg-blue-500/20 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs group active:scale-95"
        >
          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          <span>Subscriptions Radar</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-800 dark:text-blue-200">
            Auto-Bills
          </span>
        </button>

        <button
          type="button"
          onClick={openTimeMachine}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-violet-500/10 hover:bg-violet-500/20 dark:bg-violet-500/15 dark:hover:bg-violet-500/25 border border-violet-500/30 text-violet-700 dark:text-violet-300 text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs group active:scale-95"
        >
          <Hourglass className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform" />
          <span>Wealth Time Machine</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-violet-500/20 text-violet-800 dark:text-violet-200">
            SIP
          </span>
        </button>

        <button
          type="button"
          onClick={openCommandPalette}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs active:scale-95"
        >
          <Command className="w-3.5 h-3.5 text-slate-500" />
          <span>Spotlight (Ctrl+K)</span>
        </button>
      </motion.div>

      {/* Overspending Alert Banner */}
      <motion.div variants={itemVariants}>
        <OverspendingBanner onManageBudgets={() => setIsBudgetModalOpen(true)} />
      </motion.div>

      {/* Financial Mood & Sentiment Mascot Avatar */}
      <motion.div variants={itemVariants}>
        <FinancialMoodAvatar
          summary={summary}
          onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
        />
      </motion.div>

      {/* Error state alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <p>{error}</p>
        </div>
      )}

      {/* 3D Bento Grid: Interactive FinTrack Metal Card + 3D Parallax Metric Cards */}
      {isLoadingSummary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* 3D Holographic Metal Card (lg:col-span-5 xl:col-span-4) */}
          <div className="lg:col-span-5 xl:col-span-4 flex justify-center lg:justify-start">
            <FinTrackCard3D
              currentMonthSpent={summary?.total_spent_current_month || 0}
              budgetStatus={status?.overall || summary?.overall_budget_status}
              className="w-full"
            />
          </div>

          {/* 2x2 Bento Metric Cards (lg:col-span-7 xl:col-span-8) */}
          <div className="lg:col-span-7 xl:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Card 1: Total Spend Current Month */}
            <SpotlightCard
              spotlightColor="rgba(16, 185, 129, 0.16)"
              darkSpotlightColor="rgba(16, 185, 129, 0.25)"
              className="p-4 sm:p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between translate-z-20">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    This Month
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center translate-z-40 shadow-xs">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white font-['Outfit'] translate-z-40 drop-shadow-xs">
                  <AnimatedCounter
                    value={summary?.total_spent_current_month || 0}
                    prefix="₹"
                  />
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between translate-z-20">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Avg {formatCurrency(summary?.average_daily_spend)}/day
                </p>
                <Sparkline
                  data={sparklinePoints}
                  color="#10b981"
                  gradientId="sparkline-month"
                  width={70}
                  height={24}
                />
              </div>
            </SpotlightCard>

            {/* Card 2: Overall Lifetime Spend */}
            <SpotlightCard
              spotlightColor="rgba(59, 130, 246, 0.16)"
              darkSpotlightColor="rgba(59, 130, 246, 0.25)"
              className="p-4 sm:p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between translate-z-20">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Lifetime
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center translate-z-40 shadow-xs">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white font-['Outfit'] translate-z-40 drop-shadow-xs">
                  <AnimatedCounter
                    value={summary?.total_spent_overall || 0}
                    prefix="₹"
                  />
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between translate-z-20">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">All transactions</p>
                <Sparkline
                  data={sparklinePoints.map((x) => x * 1.5)}
                  color="#3b82f6"
                  gradientId="sparkline-life"
                  width={70}
                  height={24}
                />
              </div>
            </SpotlightCard>

            {/* Card 3: Budget Goal Status */}
            {(() => {
              const liveOverall = status ? status.overall : summary?.overall_budget_status;
              const isOver = liveOverall && Number(liveOverall.remaining_amount) < 0;
              const isNear = liveOverall && liveOverall.status === 'near_limit';

              return (
                <SpotlightCard
                  spotlightColor={isOver ? 'rgba(244, 63, 94, 0.18)' : 'rgba(16, 185, 129, 0.18)'}
                  darkSpotlightColor={isOver ? 'rgba(244, 63, 94, 0.25)' : 'rgba(16, 185, 129, 0.25)'}
                  onClick={() => setIsBudgetModalOpen(true)}
                  className="p-4 sm:p-5 flex flex-col justify-between cursor-pointer group"
                  title="Click to manage budget goals"
                >
                  <div>
                    <div className="flex items-center justify-between translate-z-20">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        Remaining Budget
                      </span>
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center translate-z-40 shadow-xs ${
                          isOver
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                            : isNear
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        <Target className="w-4 h-4" />
                      </div>
                    </div>
                    <p
                      className={`mt-2 text-2xl font-bold font-['Outfit'] translate-z-40 drop-shadow-xs ${
                        isOver ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {liveOverall ? (
                        <AnimatedCounter
                          value={Number(liveOverall.remaining_amount)}
                          prefix="₹"
                        />
                      ) : (
                        'No Goal Set'
                      )}
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between translate-z-20">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {liveOverall
                        ? `${liveOverall.percentage_used}% used`
                        : 'Click to set goal →'}
                    </p>
                    <Sparkline
                      data={isOver ? [50, 40, 30, 20, 10, 5, 0] : [10, 20, 35, 45, 60, 75, 90]}
                      color={isOver ? '#f43f5e' : '#10b981'}
                      gradientId="sparkline-budget"
                      width={70}
                      height={24}
                    />
                  </div>
                </SpotlightCard>
              );
            })()}

            {/* Card 4: Weekly Pace */}
            <SpotlightCard
              spotlightColor="rgba(168, 85, 247, 0.16)"
              darkSpotlightColor="rgba(168, 85, 247, 0.25)"
              className="p-4 sm:p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between translate-z-20">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Weekly Pace
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center translate-z-40 shadow-xs">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white font-['Outfit'] translate-z-40 drop-shadow-xs">
                  <AnimatedCounter
                    value={summary?.average_weekly_spend || 0}
                    prefix="₹"
                  />
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between translate-z-20">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">7-day run rate</p>
                <Sparkline
                  data={sparklinePoints.map((x, i) => x * (1 + i * 0.1))}
                  color="#a855f7"
                  gradientId="sparkline-weekly"
                  width={70}
                  height={24}
                />
              </div>
            </SpotlightCard>
          </div>
        </motion.div>
      )}

      {/* Month-over-Month Comparison Widget (FR-23) */}
      <motion.div variants={itemVariants}>
        <MonthCompareWidget compareData={compareData} isLoading={isLoadingCompare} />
      </motion.div>

      {/* AI Spending Forecast & Anomaly Detection */}
      <motion.div variants={itemVariants} id="ai-forecast" className="scroll-mt-20">
        <AIForecastCard onRefreshOverview={fetchOverview} />
      </motion.div>

      {/* Visual Charts Grid (FR-19, FR-20, FR-22) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Spending Trends: Bar/Area Chart with Granularity (7 cols) */}
        <div className="lg:col-span-7">
          <SpendingTrendChart
            data={trendData}
            granularity={granularity}
            onGranularityChange={handleGranularityChange}
            isLoading={isLoadingTrend}
          />
        </div>

        {/* Category Breakdown: Interactive Donut Chart (5 cols) */}
        <div className="lg:col-span-5">
          <CategoryPieChart
            data={categoryChartData}
            isLoading={isLoadingCategoryChart}
          />
        </div>
      </motion.div>

      {/* Interactive Budget Tracker */}
      <motion.div variants={itemVariants}>
        <BudgetTracker />
      </motion.div>

      {/* Deep-Dive Grid: Ranked Top Categories & Recent Transactions (FR-18, FR-24) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories Ranked List */}
        <TopCategoriesList
          categories={summary?.top_categories || []}
          isLoading={isLoadingSummary}
        />

        {/* Recent Transactions List */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Outfit']">
                  Recent Transactions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Latest activity logged
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/expenses')}
              >
                View All
              </Button>
            </div>

            {summary && summary.recent_expenses.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {summary.recent_expenses.map((exp) => (
                  <div key={exp.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{exp.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {exp.category_name} • {exp.expense_date}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white font-['Outfit']">
                      {formatCurrency(exp.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                No recent transactions found.
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Budget Modal */}
      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onBudgetChange={fetchOverview}
      />

      {/* AI Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        onExpenseCreated={fetchOverview}
      />

      {/* Expense Modal (for full edit or manual add) */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setPrefillExpense(null);
        }}
        expenseToEdit={prefillExpense}
        onSuccess={fetchOverview}
      />
    </motion.div>
  );
};

export default DashboardPage;
