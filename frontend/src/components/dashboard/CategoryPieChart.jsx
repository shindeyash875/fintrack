import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import EmptyState from '../common/EmptyState';
import { useNavigate } from 'react-router-dom';

const PALETTE = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#f43f5e', // Rose
  '#64748b', // Slate
];

const BG_CLASSES = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-rose-500',
  'bg-slate-500',
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const formatted = '₹' + Number(data.amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return (
      <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-lg border border-slate-800 text-xs space-y-0.5">
        <p className="font-bold text-slate-200">{data.category_name}</p>
        <p className="text-emerald-400 font-semibold">{formatted}</p>
        <p className="text-slate-400">{data.percentage}% of total</p>
      </div>
    );
  }
  return null;
};

export const CategoryPieChart = ({ data = [], isLoading = false }) => {
  const [chartType, setChartType] = useState('pie'); // 'pie' or 'donut'
  const navigate = useNavigate();

  // Normalize data ensuring amount and percentage are valid numbers (prevents Recharts NaN angles)
  const chartData = (data || []).map((item) => ({
    ...item,
    amount: Number(item.amount || 0),
    percentage: Number(item.percentage || 0),
  }));

  const totalAmount = chartData.reduce((acc, curr) => acc + curr.amount, 0);
  const formattedTotal = '₹' + totalAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm animate-pulse h-80 flex items-center justify-center">
        <div className="w-40 h-40 rounded-full border-4 border-slate-100 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!chartData || chartData.length === 0 || totalAmount === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <PieIcon className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900 font-['Outfit']">
            Spending by Category
          </h3>
        </div>
        <EmptyState
          title="No category spending yet"
          description="Log your expenses to see a dynamic visual breakdown across categories."
          actionLabel="Log an Expense"
          onAction={() => navigate('/expenses')}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between overflow-hidden">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-slate-900 font-['Outfit']">
                Spending by Category
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle: Pie vs Donut */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartType('pie')}
                className={`px-2.5 py-1 rounded-md transition-colors min-h-[32px] ${
                  chartType === 'pie'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Pie
              </button>
              <button
                type="button"
                onClick={() => setChartType('donut')}
                className={`px-2.5 py-1 rounded-md transition-colors min-h-[32px] ${
                  chartType === 'donut'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Donut
              </button>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100/60 px-2.5 py-1 rounded-lg">
              {formattedTotal}
            </span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {chartData.length} Categories
            </span>
          </div>
        </div>

        {/* Interactive Pie / Donut Chart */}
        <div className="relative h-60 sm:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={chartData}
                dataKey="amount"
                nameKey="category_name"
                cx="50%"
                cy="50%"
                innerRadius={chartType === 'donut' ? 56 : 0}
                outerRadius={84}
                paddingAngle={chartType === 'donut' ? 3 : 1}
                stroke="#ffffff"
                strokeWidth={2}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PALETTE[index % PALETTE.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center stats (when in donut mode) */}
          {chartType === 'donut' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Total Spent
              </span>
              <span className="text-sm sm:text-lg font-bold text-slate-900 font-['Outfit']">
                {formattedTotal}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Categorized Legend with Swatches */}
      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {chartData.slice(0, 6).map((item, idx) => (
          <div key={item.category_id || idx} className="flex items-center gap-2 truncate">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${BG_CLASSES[idx % BG_CLASSES.length]}`}
            />
            <span className="text-slate-600 truncate font-medium">{item.category_name}</span>
            <span className="text-slate-400 font-semibold ml-auto shrink-0">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryPieChart;
