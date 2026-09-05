import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Check, CreditCard, Banknote, Smartphone, Sparkles, Camera } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import ReceiptScannerModal from './ReceiptScannerModal';
import { expenseSchema } from '../../schemas/expenseSchema';
import { toTitleCase } from '../../schemas/categorySchema';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useBudgetStore } from '../../store/useBudgetStore';
import { useUIStore } from '../../store/useUIStore';

export const ExpenseModal = ({ isOpen, onClose, expenseToEdit = null }) => {
  const { addExpense, updateExpense } = useExpenseStore();
  const { categories, addCategory, fetchCategories } = useCategoryStore();
  const { addToast } = useUIStore();

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const isEditing = Boolean(expenseToEdit);
  const todayStr = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: '',
      category_id: '',
      amount: '',
      expense_date: todayStr,
      notes: '',
      payment_mode: '',
    },
  });

  const selectedPaymentMode = watch('payment_mode');

  useEffect(() => {
    if (isOpen) {
      if (!categories || categories.length === 0) {
        fetchCategories();
      }
      setIsCreatingCategory(false);
      setNewCatName('');
      if (expenseToEdit) {
        reset({
          title: expenseToEdit.title,
          category_id: expenseToEdit.category_id,
          amount: Number(expenseToEdit.amount),
          expense_date: expenseToEdit.expense_date,
          notes: expenseToEdit.notes || '',
          payment_mode: expenseToEdit.payment_mode || '',
        });
      } else {
        reset({
          title: '',
          category_id: categories[0]?.id || '',
          amount: '',
          expense_date: todayStr,
          notes: '',
          payment_mode: '',
        });
      }
    }
  }, [isOpen, expenseToEdit, categories, fetchCategories, reset, todayStr]);

  const handleQuickCreateCategory = async (e) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (trimmed.length > 50) {
      addToast({ type: 'error', message: 'Category name must be 50 characters or less.' });
      return;
    }

    // Duplicate check: case-insensitive & trimmed
    const isDuplicate = categories.some(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      addToast({ type: 'error', message: 'Category already exists.' });
      return;
    }

    const normalized = toTitleCase(trimmed);

    setIsSubmittingCat(true);
    try {
      const created = await addCategory({ name: normalized });
      setNewCatName('');
      setIsCreatingCategory(false);
      setValue('category_id', created.id, { shouldValidate: true });
      addToast({ type: 'success', message: `Category "${normalized}" created & selected.` });
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Category already exists.' });
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        title: data.title.trim(),
        category_id: data.category_id,
        amount: Number(data.amount),
        expense_date: data.expense_date,
        notes: data.notes?.trim() || null,
        payment_mode: data.payment_mode || null,
      };

      if (isEditing) {
        await updateExpense(expenseToEdit.id, payload);
        addToast({ type: 'success', message: 'Expense updated successfully.' });
      } else {
        await addExpense(payload);
        addToast({ type: 'success', message: 'Expense logged successfully.' });
      }

      await fetchCategories();
      useBudgetStore.getState().fetchAll();
      onClose();
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to save expense.' });
    }
  };

  const handleExtractedData = (data) => {
    if (!data) return;
    if (data.title) setValue('title', data.title, { shouldValidate: true });
    if (data.amount) setValue('amount', Number(data.amount), { shouldValidate: true });
    if (data.expense_date) setValue('expense_date', data.expense_date, { shouldValidate: true });
    if (data.suggested_category_id) setValue('category_id', data.suggested_category_id, { shouldValidate: true });
    if (data.payment_mode) setValue('payment_mode', data.payment_mode, { shouldValidate: true });
    if (data.notes) setValue('notes', data.notes, { shouldValidate: true });
    addToast({ type: 'success', message: 'Form autofilled from AI scan!' });
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? 'Edit Expense' : 'Log New Expense'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* AI Scan Prompt Banner (when creating new expense) */}
          {!isEditing && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-indigo-950/40 border border-emerald-200/70 dark:border-emerald-800/60 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-2xs text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-white">Have a receipt or UPI screenshot?</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Auto-fill all fields instantly using AI Vision</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan Receipt</span>
              </button>
            </div>
          )}

          {/* Title Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            {...register('title')}
            placeholder="e.g. Groceries at Market"
            maxLength={50}
            className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
              errors.title ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700 focus:ring-emerald-500'
            } focus:outline-none focus:ring-2`}
          />
          {errors.title && (
            <p className="text-xs text-rose-500 mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Category Field with Inline Quick-Create */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Category <span className="text-rose-500">*</span>
            </label>
            {!isCreatingCategory && (
              <button
                type="button"
                onClick={() => setIsCreatingCategory(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 focus:outline-none"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Category</span>
              </button>
            )}
          </div>

          {isCreatingCategory ? (
            <div className="flex gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name..."
                maxLength={50}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleQuickCreateCategory}
                isLoading={isSubmittingCat}
                disabled={!newCatName.trim()}
              >
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsCreatingCategory(false);
                  setNewCatName('');
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <select
              {...register('category_id')}
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                errors.category_id ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700 focus:ring-emerald-500'
              } focus:outline-none focus:ring-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white`}
            >
              <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Select a category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  {cat.name}
                </option>
              ))}
            </select>
          )}

          {errors.category_id && (
            <p className="text-xs text-rose-500 mt-1">{errors.category_id.message}</p>
          )}
        </div>

        {/* Amount & Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 dark:text-slate-500 select-none">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                {...register('amount')}
                placeholder="0.00"
                className={`w-full pl-8 pr-3.5 py-2.5 text-sm rounded-xl border font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                  errors.amount ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700 focus:ring-emerald-500'
                } focus:outline-none focus:ring-2`}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-rose-500 mt-1">{errors.amount.message}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              max={todayStr}
              {...register('expense_date')}
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                errors.expense_date ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700 focus:ring-emerald-500'
              } focus:outline-none focus:ring-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white`}
            />
            {errors.expense_date && (
              <p className="text-xs text-rose-500 mt-1">{errors.expense_date.message}</p>
            )}
          </div>
        </div>

        {/* Payment Mode Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Payment Mode (Optional)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'upi', label: 'UPI', icon: Smartphone },
              { id: 'card', label: 'Card', icon: CreditCard },
              { id: 'cash', label: 'Cash', icon: Banknote },
              { id: '', label: 'None', icon: null },
            ].map((mode) => {
              const Icon = mode.icon;
              const isSelected = selectedPaymentMode === mode.id;
              return (
                <button
                  type="button"
                  key={mode.id}
                  onClick={() => setValue('payment_mode', mode.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-medium transition-all min-h-[42px] active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20 font-semibold'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Notes (Optional)
          </label>
          <textarea
            {...register('notes')}
            rows={2}
            maxLength={500}
            placeholder="Add any details or bill references..."
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {errors.notes && (
            <p className="text-xs text-rose-500 mt-1">{errors.notes.message}</p>
          )}
        </div>

        {/* Sticky Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm -mx-4 -mb-4 px-4 py-3 sm:-mx-6 sm:-mb-6 sm:px-6 sm:py-4">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isSubmitting} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button type="submit" size="md" isLoading={isSubmitting} className="flex-1 sm:flex-none">
            {isEditing ? 'Save Changes' : 'Log Expense'}
          </Button>
        </div>
        </form>
      </Modal>

      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onExtractedData={handleExtractedData}
      />
    </>
  );
};

export default ExpenseModal;
