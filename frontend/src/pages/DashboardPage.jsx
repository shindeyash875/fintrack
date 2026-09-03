import React, { useEffect, useState, useCallback } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  CreditCard, 
  AlertTriangle,
  Plus,
  Target,
  Camera,
  Sparkles
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
import { useBudgetStore } from '../store/useBudgetStore';

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

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-['Outfit']">
            Financial Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
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
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-sm hover:shadow transition-all duration-150 flex-1 sm:flex-none cursor-pointer"
          >
            <TrendingUp className="w-4 h-4" />
            <span>AI Forecast</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] uppercase font-bold bg-indigo-400/30 text-indigo-100 border border-indigo-300/40">
              New
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsReceiptScannerOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm hover:shadow transition-all duration-150 flex-1 sm:flex-none"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Receipt</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] uppercase font-bold bg-emerald-400/30 text-emerald-100 border border-emerald-300/40">
              AI
            </span>
          </button>
          <Button
            onClick={() => {
              setPrefillExpense(null);
              setIsExpenseModalOpen(true);
            }}
            icon={Plus}
            size="md"
            className="flex-1 sm:flex-none"
          >
            Add Expense
          </Button>
        </div>
      </div>

      {/* AI Quick Input Bar (Feature 2) */}
      <AIQuickInput
        onExpenseCreated={fetchOverview}
        onOpenEditModal={(prefill) => {
          setPrefillExpense(prefill);
          setIsExpenseModalOpen(true);
        }}
      />

      {/* Overspending Alert Banner */}
      <OverspendingBanner onManageBudgets={() => setIsBudgetModalOpen(true)} />

      {/* Financial Mood & Sentiment Mascot Avatar (Option 3) */}
      <FinancialMoodAvatar
        summary={summary}
        onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
      />

      {/* Error state alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      {/* Metric Cards (FR-17, FR-25) */}
      {isLoadingSummary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Spend Current Month */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                This Month
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 font-['Outfit']">
              {formatCurrency(summary?.total_spent_current_month)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Avg {formatCurrency(summary?.average_daily_spend)} / day
            </p>
          </div>

          {/* Card 2: Overall Lifetime Spend */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Lifetime
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 font-['Outfit']">
              {formatCurrency(summary?.total_spent_overall)}
            </p>
            <p className="mt-1 text-xs text-slate-500">All recorded transactions</p>
          </div>

          {/* Card 3: Budget Goal Status */}
          {(() => {
            const liveOverall = status ? status.overall : summary?.overall_budget_status;
            const isOver = liveOverall && Number(liveOverall.remaining_amount) < 0;
            const isNear = liveOverall && liveOverall.status === 'near_limit';

            return (
              <div
                onClick={() => setIsBudgetModalOpen(true)}
                className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
                title="Click to manage budget goals"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-emerald-700 transition-colors">
                    Remaining Budget
                  </span>
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isOver
                        ? 'bg-rose-50 text-rose-600'
                        : isNear
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    <Target className="w-5 h-5" />
                  </div>
                </div>
                <p
                  className={`mt-3 text-2xl font-bold font-['Outfit'] ${
                    isOver ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {liveOverall
                    ? isOver
                      ? `- ${formatCurrency(Math.abs(Number(liveOverall.remaining_amount)))}`
                      : formatCurrency(liveOverall.remaining_amount)
                    : 'No Goal Set'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {liveOverall
                    ? `${liveOverall.percentage_used}% used (${liveOverall.status.replace('_', ' ')})`
                    : 'Click to set monthly goal →'}
                </p>
              </div>
            );
          })()}

          {/* Card 4: Weekly Pace */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Weekly Pace
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 font-['Outfit']">
              {formatCurrency(summary?.average_weekly_spend)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Estimated 7-day spend rate</p>
          </div>
        </div>
      )}

      {/* Month-over-Month Comparison Widget (FR-23) */}
      <MonthCompareWidget compareData={compareData} isLoading={isLoadingCompare} />

      {/* AI Spending Forecast & Anomaly Detection (Feature 4) */}
      <div id="ai-forecast" className="scroll-mt-20">
        <AIForecastCard onRefreshOverview={fetchOverview} />
      </div>

      {/* Phase 5: Visual Charts Grid (FR-19, FR-20, FR-22) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
      </div>

      {/* Phase 4: Interactive Budget Tracker */}
      <BudgetTracker />

      {/* Deep-Dive Grid: Ranked Top Categories & Recent Transactions (FR-18, FR-24) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories Ranked List */}
        <TopCategoriesList
          categories={summary?.top_categories || []}
          isLoading={isLoadingSummary}
        />

        {/* Recent Transactions List */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Outfit']">
                  Recent Transactions
                </h3>
                <p className="text-xs text-slate-500 font-medium">
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
              <div className="divide-y divide-slate-100">
                {summary.recent_expenses.map((exp) => (
                  <div key={exp.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{exp.title}</p>
                      <p className="text-xs text-slate-400">
                        {exp.category_name} • {exp.expense_date}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-900 font-['Outfit']">
                      {formatCurrency(exp.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No recent transactions found.
              </div>
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
};

export default DashboardPage;
