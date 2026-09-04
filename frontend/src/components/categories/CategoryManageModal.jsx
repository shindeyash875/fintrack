import React, { useState } from 'react';
import { Tag, Plus, Edit2, Trash2, Check, X, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useUIStore } from '../../store/useUIStore';
import { toTitleCase } from '../../schemas/categorySchema';

export const CategoryManageModal = ({ isOpen, onClose }) => {
  const { categories, addCategory, updateCategory, deleteCategory, fetchCategories } = useCategoryStore();
  const { fetchExpenses } = useExpenseStore();
  const { addToast } = useUIStore();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Inline editing state
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Deletion reassignment state
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [reassignCategoryId, setReassignCategoryId] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
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

    setIsSubmittingNew(true);
    try {
      await addCategory({ name: normalized });
      setNewCategoryName('');
      addToast({ type: 'success', message: `Category "${normalized}" created successfully.` });
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Category already exists.' });
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const startEditing = (cat) => {
    setEditingCategoryId(cat.id);
    setEditingName(cat.name);
    setDeletingCategory(null);
  };

  const cancelEditing = () => {
    setEditingCategoryId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (id) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    if (trimmed.length > 50) {
      addToast({ type: 'error', message: 'Category name must be 50 characters or less.' });
      return;
    }

    // Duplicate check: case-insensitive & trimmed (excluding current item)
    const isDuplicate = categories.some(
      (c) => c.id !== id && c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      addToast({ type: 'error', message: 'Category already exists.' });
      return;
    }

    const normalized = toTitleCase(trimmed);

    setIsSavingEdit(true);
    try {
      await updateCategory(id, { name: normalized });
      setEditingCategoryId(null);
      addToast({ type: 'success', message: 'Category updated.' });
      fetchExpenses();
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to update category.' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteClick = (cat) => {
    cancelEditing();
    setDeletingCategory(cat);
    setReassignCategoryId('');
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    try {
      const params = {};
      if (deletingCategory.expense_count > 0) {
        if (!reassignCategoryId) {
          addToast({
            type: 'error',
            message: 'Please select a replacement category to reassign existing expenses to.',
          });
          setIsDeleting(false);
          return;
        }
        params.reassign_to = reassignCategoryId;
      }

      await deleteCategory(deletingCategory.id, params);
      addToast({ type: 'success', message: `Category "${deletingCategory.name}" removed.` });
      setDeletingCategory(null);
      await fetchCategories();
      await fetchExpenses();
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to delete category.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Categories" maxWidth="max-w-xl">
      <div className="space-y-6">
        {/* Create Category Form */}
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Add new category (e.g. Subscriptions)"
            maxLength={50}
            className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <Button
            type="submit"
            icon={Plus}
            size="md"
            isLoading={isSubmittingNew}
            disabled={!newCategoryName.trim()}
          >
            Add
          </Button>
        </form>

        {/* Delete / Reassignment Notice Card */}
        {deletingCategory && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 space-y-3">
            <div className="flex items-start gap-2.5 text-amber-800 dark:text-amber-200">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Delete "{deletingCategory.name}"?</p>
                {deletingCategory.expense_count > 0 ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    This category is currently linked to{' '}
                    <span className="font-bold">{deletingCategory.expense_count}</span> expense(s).
                    Please select another category to reassign them to before deleting.
                  </p>
                ) : (
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    This category has no linked expenses and can be deleted safely.
                  </p>
                )}
              </div>
            </div>

            {deletingCategory.expense_count > 0 && (
              <div>
                <label className="block text-xs font-medium text-amber-900 dark:text-amber-200 mb-1">
                  Reassign expenses to:
                </label>
                <select
                  value={reassignCategoryId}
                  onChange={(e) => setReassignCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-amber-300 dark:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Select replacement category...</option>
                  {categories
                    .filter((c) => c.id !== deletingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeletingCategory(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
              >
                {deletingCategory.expense_count > 0 ? 'Reassign & Delete' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        )}

        {/* Categories List */}
        <div className="border border-slate-200/80 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto bg-white dark:bg-slate-900">
          {categories.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-400">No categories found.</div>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors"
              >
                {editingCategoryId === category.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      maxLength={50}
                      className="flex-1 px-2.5 py-1 text-sm rounded-lg border border-emerald-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(category.id)}
                      disabled={isSavingEdit || !editingName.trim()}
                      className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-md"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                      <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{category.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal shrink-0">
                        {category.expense_count || 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEditing(category)}
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title="Rename category"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(category)}
                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" size="md" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CategoryManageModal;
