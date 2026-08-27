import { describe, it, expect, beforeEach } from 'vitest';
import { toTitleCase } from '../schemas/categorySchema';
import { useUIStore } from '../store/useUIStore';

describe('Category Normalization & Duplicate Detection Logic', () => {
  it('normalizes various casing and spacing to Title Case', () => {
    expect(toTitleCase('food')).toBe('Food');
    expect(toTitleCase('Food')).toBe('Food');
    expect(toTitleCase('FOOD')).toBe('Food');
    expect(toTitleCase('  food  ')).toBe('Food');
    expect(toTitleCase('travel expenses')).toBe('Travel Expenses');
    expect(toTitleCase('  travel    expenses  ')).toBe('Travel Expenses');
    expect(toTitleCase('MEDICAL BILLS')).toBe('Medical Bills');
    expect(toTitleCase('')).toBe('');
  });

  it('correctly flags duplicates regardless of case or whitespace padding', () => {
    const existingCategories = [
      { id: '1', name: 'Food' },
      { id: '2', name: 'Travel Expenses' },
      { id: '3', name: 'Utilities' },
    ];

    const isDuplicate = (inputName, excludeId = null) => {
      const trimmed = inputName.trim().toLowerCase();
      return existingCategories.some(
        (c) => (!excludeId || c.id !== excludeId) && c.name.trim().toLowerCase() === trimmed
      );
    };

    // Same case
    expect(isDuplicate('Food')).toBe(true);
    // Different case (lower)
    expect(isDuplicate('food')).toBe(true);
    // Different case (upper)
    expect(isDuplicate('FOOD')).toBe(true);
    // Extra spaces
    expect(isDuplicate('   Food   ')).toBe(true);
    expect(isDuplicate('  food  ')).toBe(true);

    // Multi-word case insensitivity
    expect(isDuplicate('TRAVEL EXPENSES')).toBe(true);
    expect(isDuplicate('travel expenses')).toBe(true);
    expect(isDuplicate('  travel expenses  ')).toBe(true);

    // Non-duplicates
    expect(isDuplicate('Fast Food')).toBe(false);
    expect(isDuplicate('Travel')).toBe(false);
    expect(isDuplicate('Health')).toBe(false);
  });
});

describe('useUIStore Toast Deduplication & Calling Conventions', () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [] });
  });

  it('prevents duplicate toast messages', () => {
    const { addToast } = useUIStore.getState();

    // Call with exact same message twice
    addToast({ type: 'error', message: 'Category already exists.' });
    addToast({ type: 'error', message: 'Category already exists.' });

    const currentToasts = useUIStore.getState().toasts;
    expect(currentToasts).toHaveLength(1);
    expect(currentToasts[0].message).toBe('Category already exists.');
    expect(currentToasts[0].type).toBe('error');
  });

  it('allows distinct toast messages', () => {
    const { addToast } = useUIStore.getState();

    addToast({ type: 'success', message: 'Budget added successfully.' });
    addToast({ type: 'success', message: 'Budget updated successfully.' });

    const currentToasts = useUIStore.getState().toasts;
    expect(currentToasts).toHaveLength(2);
    expect(currentToasts[0].message).toBe('Budget added successfully.');
    expect(currentToasts[1].message).toBe('Budget updated successfully.');
  });

  it('supports both object and (message, type) invocation styles', () => {
    const { addToast } = useUIStore.getState();

    addToast('Budget added successfully.', 'success');
    const toasts = useUIStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Budget added successfully.');
    expect(toasts[0].type).toBe('success');
  });
});

describe('Budget Feedback Logic', () => {
  it('correctly decides whether budget action is add vs update', () => {
    const existingBudgets = [
      { id: 'b1', category_id: null, period_month: '2026-08-01', limit_amount: 50000 },
      { id: 'b2', category_id: 'cat-123', period_month: '2026-08-01', limit_amount: 5000 },
    ];

    const getSuccessMessage = ({ editingBudgetId, category_id }) => {
      const isUpdate = Boolean(
        editingBudgetId ||
        existingBudgets.some((b) =>
          category_id ? b.category_id === category_id : !b.category_id
        )
      );
      return isUpdate ? 'Budget updated successfully.' : 'Budget added successfully.';
    };

    // Setting overall budget when one already exists -> update
    expect(getSuccessMessage({ editingBudgetId: null, category_id: null })).toBe(
      'Budget updated successfully.'
    );

    // Setting existing category budget -> update
    expect(getSuccessMessage({ editingBudgetId: null, category_id: 'cat-123' })).toBe(
      'Budget updated successfully.'
    );

    // Explicit editing mode -> update
    expect(getSuccessMessage({ editingBudgetId: 'b1', category_id: null })).toBe(
      'Budget updated successfully.'
    );

    // New category budget -> add
    expect(getSuccessMessage({ editingBudgetId: null, category_id: 'cat-999' })).toBe(
      'Budget added successfully.'
    );
  });
});
