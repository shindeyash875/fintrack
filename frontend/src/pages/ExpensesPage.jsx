import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  CreditCard,
  Banknote,
  Smartphone
} from 'lucide-react';
import { useExpenseStore } from '../store/useExpenseStore';
import { useCategoryStore } from '../store/useCategoryStore';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import { TableRowSkeleton } from '../components/common/Skeleton';

export const ExpensesPage = () => {
  const {
    expenses,
    pagination,
    filters,
    isLoading,
    error,
    fetchExpenses,
    setFilters,
    setPage,
    deleteExpense,
  } = useExpenseStore();

  const { categories, fetchCategories } = useCategoryStore();
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  useEffect(() => {
    fetchCategories();
    fetchExpenses();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters({ search: searchTerm });
  };

  const handleCategoryFilter = (e) => {
    const val = e.target.value;
    setFilters({ categoryId: val ? val : null });
  };

  const handleSortChange = (e) => {
    const [sortBy, sortDir] = e.target.value.split(':');
    setFilters({ sortBy, sortDir });
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderPaymentModeBadge = (mode) => {
    if (!mode) return null;
    const icons = {
      cash: Banknote,
      card: CreditCard,
      upi: Smartphone,
    };
    const Icon = icons[mode.toLowerCase()] || CreditCard;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
        <Icon className="w-3 h-3" />
        <span className="capitalize">{mode}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-['Outfit']">
            Expense Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, filter, and track all your logged transactions.
          </p>
        </div>
        <div>
          <Button icon={Plus} size="md">
            Add Expense
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title or notes..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </form>

          {/* Category Filter */}
          <div>
            <select
              value={filters.categoryId || ''}
              onChange={handleCategoryFilter}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode Filter */}
          <div>
            <select
              value={filters.paymentMode || ''}
              onChange={(e) => setFilters({ paymentMode: e.target.value || null })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            >
              <option value="">All Payment Modes</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={`${filters.sortBy}:${filters.sortDir}`}
              onChange={handleSortChange}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            >
              <option value="expense_date:desc">Newest Date First</option>
              <option value="expense_date:asc">Oldest Date First</option>
              <option value="amount:desc">Highest Amount</option>
              <option value="amount:asc">Lowest Amount</option>
              <option value="title:asc">Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-slate-100">
            <TableRowSkeleton />
            <TableRowSkeleton />
            <TableRowSkeleton />
            <TableRowSkeleton />
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No expenses found"
              description="No transactions match your current filters. Add an expense or adjust your search."
              actionLabel="Add Expense"
              onAction={() => {}}
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/70 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="px-6 py-3.5">Title</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Mode</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {expense.title}
                        {expense.notes && (
                          <p className="text-xs text-slate-400 font-normal">{expense.notes}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          {expense.category_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{expense.expense_date}</td>
                      <td className="px-6 py-4">{renderPaymentModeBadge(expense.payment_mode)}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100">
              {expenses.map((expense) => (
                <div key={expense.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{expense.title}</span>
                    <span className="font-bold text-slate-900">{formatCurrency(expense.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      {expense.category_name}
                    </span>
                    <span>{expense.expense_date}</span>
                  </div>
                  {expense.notes && <p className="text-xs text-slate-400">{expense.notes}</p>}
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <span className="text-xs text-slate-500">
                  Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                  {pagination.total} results
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage(pagination.page - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-semibold px-2">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage(pagination.page + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExpensesPage;
