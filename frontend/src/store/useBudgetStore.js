import { create } from 'zustand';
import { budgetsApi } from '../api/endpoints/budgets';

export const useBudgetStore = create((set, get) => ({
  budgets: [],
  status: null,
  periodMonth: new Date().toISOString().slice(0, 7) + '-01',
  isLoading: false,
  error: null,

  setPeriodMonth: (periodMonth) => {
    set({ periodMonth });
    get().fetchBudgetStatus();
  },

  fetchBudgetStatus: async () => {
    const { periodMonth } = get();
    set({ isLoading: true, error: null });
    try {
      const response = await budgetsApi.getStatus(periodMonth);
      set({ status: response.data, isLoading: false });
    } catch (err) {
      set({ error: err.message || 'Failed to load budget status', isLoading: false });
    }
  },

  upsertBudget: async (budgetData) => {
    try {
      const response = await budgetsApi.upsert(budgetData);
      get().fetchBudgetStatus();
      return response.data;
    } catch (err) {
      throw err;
    }
  },
}));
