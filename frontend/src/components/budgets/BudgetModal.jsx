import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, Target, IndianRupee, Trash2, Edit2, Plus, AlertCircle, Sparkles } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { budgetSchema } from '../../schemas/budgetSchema';
import { useBudgetStore } from '../../store/useBudgetStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useUIStore } from '../../store/useUIStore';

export const BudgetModal = ({ isOpen, onClose, initialCategoryId = null, onBudgetChange = null }) => {
  const { budgets, upsertBudget, deleteBudget, periodMonth, setPeriodMonth, fetchAll } = useBudgetStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { addToast, openGlobalAutoBudget } = useUIStore();

  const [selectedMonth, setSelectedMonth] = useState(
    periodMonth ? periodMonth.slice(0, 7) : new Date().toISOString().slice(0, 7)
  );
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category_id: initialCategoryId || '',
      period_month: selectedMonth + '-01',
      limit_amount: '',
    },
  });

  const watchCategoryId = watch('category_id');

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchAll();
      const curMonth = periodMonth ? periodMonth.slice(0, 7) : new Date().toISOString().slice(0, 7);
      setSelectedMonth(curMonth);
      reset({
        category_id: initialCategoryId || '',
        period_month: curMonth + '-01',
        limit_amount: '',
      });
      setEditingBudgetId(null);
    }
  }, [isOpen, initialCategoryId, periodMonth, fetchCategories, fetchAll, reset]);

  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
    const normalized = newMonth + '-01';
    setValue('period_month', normalized);
    setPeriodMonth(normalized);
  };

  const handleEditBudget = (budget) => {
    setEditingBudgetId(budget.id);
    setValue('category_id', budget.category_id || '');
    setValue('period_month', budget.period_month);
    setValue('limit_amount', Number(budget.limit_amount));
  };

  const handleCancelEdit = () => {
    setEditingBudgetId(null);
    setValue('category_id', '');
    setValue('limit_amount', '');
  };

  const handleDelete = async (budgetId, name) => {
    setDeletingId(budgetId);
    try {
      await deleteBudget(budgetId);
      addToast({ type: 'success', message: `Budget goal for ${name} removed.` });
      if (editingBudgetId === budgetId) {
        handleCancelEdit();
      }
      if (onBudgetChange) {
        onBudgetChange();
      }
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to remove budget goal. Please try again.' });
    } finally {
      setDeletingId(null);
    }
  };

  const onSubmit = async (data) => {
    const targetCategoryId = data.category_id ? data.category_id : null;
    const payload = {
      category_id: targetCategoryId,
      period_month: selectedMonth + '-01',
      limit_amount: Number(data.limit_amount),
    };

    // Determine whether this operation updates an existing budget
    const isUpdate = Boolean(
      editingBudgetId ||
      budgets.some((b) =>
        targetCategoryId
          ? b.category_id === targetCategoryId
          : !b.category_id
      )
    );

    try {
      await upsertBudget(payload);

      // Show success feedback only after backend confirmation
      if (isUpdate) {
        addToast({ type: 'success', message: 'Budget updated successfully.' });
      } else {
        addToast({ type: 'success', message: 'Budget added successfully.' });
      }

      // Reset form fields while preserving current month
      setEditingBudgetId(null);
      reset({
        category_id: '',
        period_month: selectedMonth + '-01',
        limit_amount: '',
      });

      // Refresh parent/dashboard state immediately if provided
      if (onBudgetChange) {
        onBudgetChange();
      }
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to add budget. Please try again.' });
    }
  };

  const formatCurrency = (val) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Budget Goals"
      description="Set monthly spending limits for overall expenses or specific categories."
      size="lg"
    >
      <div className="space-y-6">
        {/* Month Selector Header */}
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">Target Budget Period</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Budgets apply on a calendar month basis</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                onClose();
                openGlobalAutoBudget();
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-xs transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Auto-Budget</span>
            </button>
            <input
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="flex-1 sm:flex-initial px-3 py-2 text-sm font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 dark:text-white min-h-[44px]"
            />
          </div>
        </div>

        {/* Set/Edit Budget Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {editingBudgetId ? 'Update Spending Limit' : 'Set New Spending Limit'}
            </h4>
            {editingBudgetId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium underline min-h-[36px] flex items-center"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Scope / Category Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Budget Scope
              </label>
              <select
                {...register('category_id')}
                disabled={Boolean(editingBudgetId)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 ${
                  errors.category_id
                    ? 'border-rose-300 focus:ring-rose-200'
                    : 'border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-200'
                } bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400 min-h-[44px]`}
              >
                <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">🎯 Overall Monthly Budget</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    📁 {cat.name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  {errors.category_id.message}
                </p>
              )}
            </div>

            {/* Limit Amount */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Limit Amount (₹)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 15000"
                  {...register('limit_amount')}
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 ${
                    errors.limit_amount
                      ? 'border-rose-300 focus:ring-rose-200'
                      : 'border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-200'
                  } bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 min-h-[44px]`}
                />
              </div>
              {errors.limit_amount && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  {errors.limit_amount.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              size="md"
              isLoading={isSubmitting}
              icon={editingBudgetId ? Edit2 : Plus}
              className="w-full sm:w-auto"
            >
              {editingBudgetId ? 'Save Limit' : 'Set Budget'}
            </Button>
          </div>
        </form>

        {/* Existing Active Budgets List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Active Budgets for {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h4>
          {budgets && budgets.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
              {budgets.map((b) => {
                const label = b.category_name ? b.category_name : 'Overall Monthly Budget';
                const isOverall = !b.category_id;
                return (
                  <div
                    key={b.id}
                    className="p-3 sm:p-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 pr-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isOverall
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {isOverall ? 'ALL' : label.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Limit: <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(b.limit_amount)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditBudget(b)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title="Edit limit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === b.id}
                        onClick={() => handleDelete(b.id, label)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title="Remove budget goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No budget goals set for this month</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Fill the form above to establish your overall monthly goal or category limits.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BudgetModal;
