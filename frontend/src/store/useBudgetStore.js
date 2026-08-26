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
    get().fetchAll();
  },

  fetchAll: async () => {
    const { periodMonth } = get();
    set({ isLoading: true, error: null });
    try {
      const [statusRes, listRes] = await Promise.all([
        budgetsApi.getStatus(periodMonth),
        budgetsApi.list(periodMonth),
      ]);
      set({
        status: statusRes.data,
        budgets: listRes.data,
        isLoading: false,
      });
    } catch (err) {
      set({ error: err.message || 'Failed to load budget data', isLoading: false });
    }
  },

  fetchBudgets: async () => {
    const { periodMonth } = get();
    try {
      const response = await budgetsApi.list(periodMonth);
      set({ budgets: response.data });
      return response.data;
    } catch (err) {
      console.error('Failed to fetch budgets list:', err);
    }
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
      await get().fetchAll();
      return response.data;
    } catch (err) {
      throw err;
    }
  },

  deleteBudget: async (budgetId) => {
    try {
      const response = await budgetsApi.delete(budgetId);
      await get().fetchAll();
      return response.data;
    } catch (err) {
      throw err;
    }
  },
}));
