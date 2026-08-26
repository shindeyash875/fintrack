import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Check, CreditCard, Banknote, Smartphone } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { expenseSchema } from '../../schemas/expenseSchema';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useUIStore } from '../../store/useUIStore';

export const ExpenseModal = ({ isOpen, onClose, expenseToEdit = null }) => {
  const { addExpense, updateExpense } = useExpenseStore();
  const { categories, addCategory, fetchCategories } = useCategoryStore();
  const { addToast } = useUIStore();

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

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
  }, [isOpen, expenseToEdit, categories, reset]);

  const handleQuickCreateCategory = async (e) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (trimmed.length > 50) {
      addToast({ type: 'error', message: 'Category name must be 50 characters or less.' });
      return;
    }

    setIsSubmittingCat(true);
    try {
      const created = await addCategory({ name: trimmed });
      setNewCatName('');
      setIsCreatingCategory(false);
      setValue('category_id', created.id, { shouldValidate: true });
      addToast({ type: 'success', message: `Category "${trimmed}" created & selected.` });
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to create category.' });
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
      onClose();
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to save expense.' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Expense' : 'Log New Expense'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Title Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            {...register('title')}
            placeholder="e.g. Groceries at Market"
            maxLength={50}
            className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
              errors.title ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-emerald-500'
            } focus:outline-none focus:ring-2`}
          />
          {errors.title && (
            <p className="text-xs text-rose-500 mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Category Field with Inline Quick-Create */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Category <span className="text-rose-500">*</span>
            </label>
            {!isCreatingCategory && (
              <button
                type="button"
                onClick={() => setIsCreatingCategory(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 focus:outline-none"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Category</span>
              </button>
            )}
          </div>

          {isCreatingCategory ? (
            <div className="flex gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name..."
                maxLength={50}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                errors.category_id ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-emerald-500'
              } focus:outline-none focus:ring-2 bg-white`}
            >
              <option value="">Select a category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
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
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 select-none">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                {...register('amount')}
                placeholder="0.00"
                className={`w-full pl-8 pr-3.5 py-2.5 text-sm rounded-xl border font-semibold ${
                  errors.amount ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-emerald-500'
                } focus:outline-none focus:ring-2`}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-rose-500 mt-1">{errors.amount.message}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              max={todayStr}
              {...register('expense_date')}
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                errors.expense_date ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-emerald-500'
              } focus:outline-none focus:ring-2 bg-white`}
            />
            {errors.expense_date && (
              <p className="text-xs text-rose-500 mt-1">{errors.expense_date.message}</p>
            )}
          </div>
        </div>

        {/* Payment Mode Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Payment Mode (Optional)
          </label>
          <div className="grid grid-cols-4 gap-2">
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
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Notes (Optional)
          </label>
          <textarea
            {...register('notes')}
            rows={2}
            maxLength={500}
            placeholder="Add any details or bill references..."
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {errors.notes && (
            <p className="text-xs text-rose-500 mt-1">{errors.notes.message}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="md" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Log Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ExpenseModal;
