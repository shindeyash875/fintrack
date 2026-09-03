import React, { useEffect, useState, useCallback } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Zap,
  RefreshCw,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { aiApi } from '../../api/endpoints/ai';

export const AIForecastCard = ({ onRefreshOverview }) => {
  const [forecast, setForecast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showAnomalies, setShowAnomalies] = useState(true);

  const fetchForecast = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await aiApi.getForecast();
      setForecast(res.data);
    } catch (err) {
      console.error('Failed to load AI Forecast:', err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Unable to generate predictive forecast at this time.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-indigo-900/5 via-purple-900/5 to-slate-900/5 dark:from-slate-900/60 dark:via-purple-950/40 dark:to-slate-900/80 rounded-2xl p-6 border border-indigo-200/60 dark:border-indigo-800/40 shadow-sm animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-200/50 dark:bg-indigo-700/50" />
            <div className="space-y-1.5">
              <div className="h-4 w-40 bg-indigo-200/50 dark:bg-indigo-700/50 rounded" />
              <div className="h-3 w-56 bg-slate-200/50 dark:bg-slate-700/50 rounded" />
            </div>
          </div>
          <div className="h-6 w-20 bg-indigo-200/50 dark:bg-indigo-700/50 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="h-20 bg-white/60 dark:bg-slate-800/60 rounded-xl" />
          <div className="h-20 bg-white/60 dark:bg-slate-800/60 rounded-xl" />
          <div className="h-20 bg-white/60 dark:bg-slate-800/60 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !forecast) {
    return null;
  }

  if (!forecast) return null;

  const currentSpend = Number(forecast.current_month_to_date || 0);
  const projectedSpend = Number(forecast.predicted_total_month_end || 0);
  const baselineSpend = Number(forecast.historical_average_monthly || 0);
  const dailyAllowance = Number(forecast.daily_recommended_spend || 0);
  const daysLeft = forecast.days_remaining || 0;
  const anomaliesCount = forecast.anomalies?.length || 0;
  const isOverBaseline = projectedSpend > baselineSpend && baselineSpend > 0;

  return (
    <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-slate-50/70 dark:from-slate-900/90 dark:via-purple-950/30 dark:to-slate-900/90 rounded-2xl p-5 sm:p-6 border border-indigo-200/70 dark:border-indigo-800/40 shadow-sm transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-indigo-100 dark:border-indigo-900/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                AI Spending Forecast & Insights
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                {Math.round((forecast.confidence_score || 0.92) * 100)}% Confidence
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Predictive trajectory calculated from current month velocity & 30-day telemetry.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchForecast(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 hover:bg-indigo-200/70 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 transition-colors self-start sm:self-auto disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Recalculating...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 mt-5">
        {/* Metric 1: Month-End Projection */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-indigo-100 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Projected Month-End
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                isOverBaseline
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              }`}
            >
              {isOverBaseline ? 'Over Baseline' : 'On Track'}
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white font-['Outfit']">
            {formatCurrency(projectedSpend)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Current spend: {formatCurrency(currentSpend)} ({daysLeft} days left)
          </p>
        </div>

        {/* Metric 2: Safe Daily Spending Allowance */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-indigo-100 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Safe Daily Allowance
            </span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-['Outfit']">
            {formatCurrency(dailyAllowance)} <span className="text-xs font-normal text-slate-500">/ day</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Recommended cap for next {daysLeft} days
          </p>
        </div>

        {/* Metric 3: Detected Spikes & Anomalies */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-indigo-100 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Spike & Anomaly Alerts
            </span>
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center ${
                anomaliesCount > 0
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'
              }`}
            >
              {anomaliesCount > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white font-['Outfit']">
            {anomaliesCount} {anomaliesCount === 1 ? 'Anomaly' : 'Anomalies'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {anomaliesCount > 0 ? 'Spikes identified in past 30 days' : 'No abnormal transactions found'}
          </p>
        </div>
      </div>

      {/* AI Summary Banner */}
      {forecast.summary && (
        <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-200/60 dark:border-indigo-800/40 text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{forecast.summary}</p>
        </div>
      )}

      {/* Anomalies List (if any) */}
      {anomaliesCount > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowAnomalies(!showAnomalies)}
            className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white py-1 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Detected Spending Spikes ({anomaliesCount})
            </span>
            {showAnomalies ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAnomalies && (
            <div className="space-y-2 mt-2">
              {forecast.anomalies.map((anom, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 p-3 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-amber-200/70 dark:border-amber-900/40 text-xs"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider shrink-0 mt-0.5 ${
                        anom.severity === 'high'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                      }`}
                    >
                      {anom.severity}
                    </span>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {anom.title}
                      </span>{' '}
                      <span className="text-slate-500 dark:text-slate-400">
                        ({anom.category_name} • {anom.expense_date})
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5">{anom.explanation}</p>
                    </div>
                  </div>
                  <span className="font-bold text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap self-end sm:self-center">
                    {formatCurrency(anom.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category Projections & Proactive Tips Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5 pt-4 border-t border-indigo-100 dark:border-indigo-900/40">
        {/* Category Projections */}
        {forecast.category_forecasts?.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              Category Trajectories
            </h3>
            <div className="space-y-2">
              {forecast.category_forecasts.slice(0, 4).map((cat, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {cat.category_name}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        cat.risk_level === 'high'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                          : cat.risk_level === 'medium'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      }`}
                    >
                      {cat.projected_status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      Proj. {formatCurrency(cat.predicted_month_end)}
                    </span>
                    {cat.budget_limit && (
                      <span className="text-slate-500 dark:text-slate-400 ml-1">
                        / {formatCurrency(cat.budget_limit)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Proactive AI Tips */}
        {forecast.proactive_tips?.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              Proactive AI Tips
            </h3>
            <div className="space-y-2">
              {forecast.proactive_tips.map((tip, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
                >
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIForecastCard;
