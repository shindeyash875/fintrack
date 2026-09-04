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
  Smartphone,
  Tag,
  Calendar,
  DollarSign,
  XCircle,
  SlidersHorizontal,
  Download,
  Upload,
  Camera,
  Sparkles
} from 'lucide-react';
import { useExpenseStore } from '../store/useExpenseStore';
import { useCategoryStore } from '../store/useCategoryStore';
import { useBudgetStore } from '../store/useBudgetStore';
import { useUIStore } from '../store/useUIStore';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import { TableRowSkeleton } from '../components/common/Skeleton';
import ExpenseModal from '../components/expenses/ExpenseModal';
import ReceiptScannerModal from '../components/expenses/ReceiptScannerModal';
import AIQuickInput from '../components/expenses/AIQuickInput';
import CategoryManageModal from '../components/categories/CategoryManageModal';
import DeleteConfirmModal from '../components/common/DeleteConfirmModal';
import ExportModal from '../components/expenses/ExportModal';
import ImportModal from '../components/expenses/ImportModal';

export const ExpensesPage = () => {
  const {
    expenses,
    pagination,
    filters,
    isLoading,
    fetchExpenses,
    setFilters,
    setPage,
    deleteExpense,
  } = useExpenseStore();

  const { categories, fetchCategories } = useCategoryStore();
  const { addToast } = useUIStore();

  // Local search input state (to allow smooth typing before submitting)
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);

  const handleReceiptExtracted = (data) => {
    if (!data) return;
    setExpenseToEdit({
      title: data.title,
      amount: data.amount,
      expense_date: data.expense_date,
      category_id: data.suggested_category_id || categories[0]?.id || '',
      payment_mode: data.payment_mode || '',
      notes: data.notes || (data.raw_summary ? `Auto-scanned: ${data.raw_summary}` : 'Auto-scanned via FinTrack AI Vision'),
    });
    setIsExpenseModalOpen(true);
  };

  const handleImportSuccess = async () => {
    await fetchExpenses();
    await fetchCategories();
    useBudgetStore.getState().fetchAll();
  };

  // Deletion state
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchExpenses();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters({ search: searchTerm.trim() });
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setFilters({ search: '' });
  };

  const handleCategoryFilter = (e) => {
    const val = e.target.value;
    setFilters({ categoryId: val ? val : null });
  };

  const handleSortChange = (e) => {
    const [sortBy, sortDir] = e.target.value.split(':');
    setFilters({ sortBy, sortDir });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilters({
      search: '',
      dateFrom: null,
      dateTo: null,
      categoryId: null,
      amountMin: null,
      amountMax: null,
      paymentMode: null,
      sortBy: 'expense_date',
      sortDir: 'desc',
    });
  };

  // Count active non-default filters
  const activeFiltersCount = [
    Boolean(filters.search),
    Boolean(filters.categoryId),
    Boolean(filters.paymentMode),
    Boolean(filters.dateFrom),
    Boolean(filters.dateTo),
    Boolean(filters.amountMin),
    Boolean(filters.amountMax),
  ].filter(Boolean).length;

  const handleOpenAddExpense = () => {
    setExpenseToEdit(null);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (expense) => {
    setExpenseToEdit(expense);
    setIsExpenseModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    try {
      await deleteExpense(expenseToDelete.id);
      addToast({ type: 'success', message: 'Expense deleted successfully.' });
      setExpenseToDelete(null);
      await fetchCategories(); // Update category expense count
      useBudgetStore.getState().fetchAll();
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to delete expense.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderPaymentModeBadge = (mode) => {
    if (!mode) return <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>;
    const icons = {
      cash: Banknote,
      card: CreditCard,
      upi: Smartphone,
    };
    const Icon = icons[mode.toLowerCase()] || CreditCard;
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-['Outfit']">
            Expense Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Search, filter, and track all your logged transactions with instant PostgreSQL sync.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap w-full sm:w-auto">
          <Button
            variant="secondary"
            icon={Download}
            size="md"
            onClick={() => setIsExportModalOpen(true)}
            className="flex-1 sm:flex-none"
          >
            Export
          </Button>
          <Button
            variant="secondary"
            icon={Upload}
            size="md"
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 sm:flex-none"
          >
            Import
          </Button>
          <Button
            variant="secondary"
            icon={Tag}
            size="md"
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex-1 sm:flex-none"
          >
            Categories
          </Button>
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
            icon={Plus}
            size="md"
            onClick={handleOpenAddExpense}
            className="flex-1 sm:flex-none"
          >
            Add Expense
          </Button>
        </div>
      </div>

      {/* AI Quick Input Bar (Feature 2) */}
      <AIQuickInput
        onExpenseCreated={() => {
          fetchExpenses();
        }}
        onOpenEditModal={(prefill) => {
          setExpenseToEdit(prefill);
          setIsExpenseModalOpen(true);
        }}
      />

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title or notes..."
              className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Category Filter */}
          <div>
            <select
              value={filters.categoryId || ''}
              onChange={handleCategoryFilter}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.expense_count || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode Filter */}
          <div>
            <select
              value={filters.paymentMode || ''}
              onChange={(e) => setFilters({ paymentMode: e.target.value || null })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="expense_date:desc">Newest Date First</option>
              <option value="expense_date:asc">Oldest Date First</option>
              <option value="amount:desc">Highest Amount</option>
              <option value="amount:asc">Lowest Amount</option>
              <option value="title:asc">Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters Toggle & Reset Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white focus:outline-none"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showAdvancedFilters ? 'Hide Date & Amount Filters' : 'More Filters'}</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
            >
              Reset All Filters
            </button>
          )}
        </div>

        {/* Collapsible Advanced Filters (Date Range & Amount Range) */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters({ dateFrom: e.target.value || null })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters({ dateTo: e.target.value || null })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Min Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={filters.amountMin ?? ''}
                onChange={(e) => setFilters({ amountMin: e.target.value !== '' ? e.target.value : null })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Max Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="No limit"
                value={filters.amountMax ?? ''}
                onChange={(e) => setFilters({ amountMax: e.target.value !== '' ? e.target.value : null })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Expenses Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <TableRowSkeleton />
            <TableRowSkeleton />
            <TableRowSkeleton />
            <TableRowSkeleton />
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No expenses found"
              description={
                activeFiltersCount > 0
                  ? "No transactions match your active filters. Try adjusting your filters or clearing search."
                  : "You haven't recorded any expenses yet. Start tracking by adding your first transaction."
              }
              actionLabel={activeFiltersCount > 0 ? "Clear Filters" : "Add Expense"}
              onAction={activeFiltersCount > 0 ? handleResetFilters : handleOpenAddExpense}
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700 dark:text-slate-200">
                <thead className="bg-slate-50/70 dark:bg-slate-800/60 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Title</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Payment Mode</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        <div>{expense.title}</div>
                        {expense.notes && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-normal mt-0.5 line-clamp-1">
                            {expense.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                          {expense.category_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {expense.expense_date}
                      </td>
                      <td className="px-6 py-4">
                        {renderPaymentModeBadge(expense.payment_mode)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditExpense(expense)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit expense"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setExpenseToDelete(expense)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {expenses.map((expense) => (
                <div key={expense.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">{expense.title}</span>
                      {expense.notes && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{expense.notes}</p>
                      )}
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white shrink-0">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 font-medium">
                      {expense.category_name}
                    </span>
                    <div className="flex items-center gap-2">
                      {renderPaymentModeBadge(expense.payment_mode)}
                      <span>{expense.expense_date}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleOpenEditExpense(expense)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all min-h-[38px]"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setExpenseToDelete(expense)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/50 active:scale-95 transition-all min-h-[38px]"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <span className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
                  Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                  {pagination.total} transactions
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage(pagination.page - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Prev</span>
                  </Button>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 px-2">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage(pagination.page + 1)}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Expense Modal (Add / Edit) */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        expenseToEdit={expenseToEdit}
      />

      {/* Category Management Modal */}
      <CategoryManageModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(expenseToDelete)}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Expense"
        message={
          expenseToDelete
            ? `Are you sure you want to permanently delete "${expenseToDelete.title}" for ${formatCurrency(
                expenseToDelete.amount
              )}? This action cannot be undone.`
            : ''
        }
        isLoading={isDeleting}
      />
      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        activeFilters={filters}
        filteredCount={pagination.total}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {/* AI Receipt & Bill Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        onExtractedData={handleReceiptExtracted}
      />
    </div>
  );
};

export default ExpensesPage;
