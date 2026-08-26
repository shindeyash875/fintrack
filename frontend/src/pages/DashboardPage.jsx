import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Wallet, 
  CreditCard, 
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Target
} from 'lucide-react';
import { dashboardApi } from '../api/endpoints/dashboard';
import { CardSkeleton } from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import { useNavigate } from 'react-router-dom';
import BudgetTracker from '../components/budgets/BudgetTracker';
import OverspendingBanner from '../components/budgets/OverspendingBanner';
import BudgetModal from '../components/budgets/BudgetModal';
import { useBudgetStore } from '../store/useBudgetStore';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const { fetchAll, status } = useBudgetStore();

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      try {
        fetchAll();
        const res = await dashboardApi.getSummary();
        if (isMounted) {
          setSummary(res.data);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Could not connect to live backend.');
          setIsLoading(false);
        }
      }
    };
    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, [fetchAll]);

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-['Outfit']">
            Financial Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time spending overview & live budget goal tracker.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsBudgetModalOpen(true)} icon={Target} variant="secondary" size="md">
            Set Budget
          </Button>
          <Button onClick={() => navigate('/expenses')} icon={Plus} size="md">
            Add Expense
          </Button>
        </div>
      </div>

      {/* Overspending Banner Alerts */}
      <OverspendingBanner onManageBudgets={() => setIsBudgetModalOpen(true)} />

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      {/* Metric Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Spend Current Month */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
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

          {/* Card 2: Overall Spend */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
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

          {/* Card 3: Budget Status (Interactive) */}
          {(() => {
            const liveOverall = status?.overall || summary?.overall_budget_status;
            const isOver = liveOverall && Number(liveOverall.remaining_amount) < 0;
            const isNear = liveOverall && liveOverall.status === 'near_limit';

            return (
              <div
                onClick={() => setIsBudgetModalOpen(true)}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
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
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
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

      {/* Phase 4: Interactive Budget Tracker */}
      <BudgetTracker />

      {/* Main Grid: Charts & Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Visual Charts Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 font-['Outfit'] mb-4">
              Spending Breakdown
            </h2>
            {summary && summary.top_categories.length > 0 ? (
              <div className="space-y-4">
                {summary.top_categories.map((cat) => (
                  <div key={cat.category_id} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{cat.category_name}</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(cat.total_amount)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        role="progressbar"
                        aria-valuenow={cat.percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No category spending yet"
                description="Expenses logged will populate real category breakdowns and trends automatically."
                actionLabel="Log First Expense"
                onAction={() => navigate('/expenses')}
              />
            )}
          </div>
        </div>

        {/* Right Col: Recent Activity */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 font-['Outfit'] mb-4">
              Recent Transactions
            </h2>
            {summary && summary.recent_expenses.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {summary.recent_expenses.map((exp) => (
                  <div key={exp.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{exp.title}</p>
                      <p className="text-xs text-slate-500">{exp.category_name} • {exp.expense_date}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(exp.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">
                No recent transactions found.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Budget Modal */}
      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
      />
    </div>
  );
};

export default DashboardPage;
