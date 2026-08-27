import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import EmptyState from '../common/EmptyState';
import { useNavigate } from 'react-router-dom';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const formatted = '₹' + Number(data.amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return (
      <div className="bg-slate-900 text-white px-3.5 py-2 rounded-xl shadow-xl border border-slate-800 text-xs space-y-0.5">
        <p className="text-slate-400 font-medium">{data.label}</p>
        <p className="text-emerald-400 text-sm font-bold">{formatted}</p>
      </div>
    );
  }
  return null;
};

export const SpendingTrendChart = ({
  data = [],
  granularity = 'daily',
  onGranularityChange,
  isLoading = false,
}) => {
  const [chartType, setChartType] = useState('bar');
  const navigate = useNavigate();

  const chartData = (data || []).map((item) => ({
    ...item,
    amount: Number(item.amount || 0),
  }));

  const totalPeriodSpend = chartData.reduce((acc, curr) => acc + curr.amount, 0);

  const formatYAxis = (val) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
    return `₹${val}`;
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between overflow-hidden">
      {/* Header with Granularity & Chart Type Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <h3 className="text-base font-bold text-slate-900 font-['Outfit']">
              Spending Trends
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Analyze spending behavior over time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Granularity Switcher (FR-22) */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['daily', 'weekly', 'monthly'].map((gran) => (
              <button
                key={gran}
                onClick={() => onGranularityChange && onGranularityChange(gran)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all min-h-[32px] ${
                  granularity === gran
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {gran}
              </button>
            ))}
          </div>

          {/* Chart Type Toggle (Bar vs Area) */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setChartType('bar')}
              title="Bar Chart"
              className={`p-1.5 rounded-lg transition-all min-h-[32px] min-w-[32px] flex items-center justify-center ${
                chartType === 'bar'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('area')}
              title="Area Chart"
              className={`p-1.5 rounded-lg transition-all min-h-[32px] min-w-[32px] flex items-center justify-center ${
                chartType === 'area'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas or Loading/Empty */}
      {isLoading ? (
        <div className="h-56 sm:h-64 flex items-center justify-center animate-pulse">
          <div className="w-8 h-8 rounded-full border-4 border-slate-100 border-t-emerald-500 animate-spin" />
        </div>
      ) : !data || data.length === 0 || totalPeriodSpend === 0 ? (
        <EmptyState
          title="No spending data in this period"
          description="Log expenses to see your daily, weekly, and monthly trend trajectory."
          actionLabel="Add Expense"
          onAction={() => navigate('/expenses')}
        />
      ) : (
        <div className="h-56 sm:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 8, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  interval="preserveStartEnd"
                  minTickGap={10}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatYAxis}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar
                  dataKey="amount"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  interval="preserveStartEnd"
                  minTickGap={10}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatYAxis}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#trendGradient)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default SpendingTrendChart;
