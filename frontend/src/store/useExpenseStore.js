import { create } from 'zustand';
import { expensesApi } from '../api/endpoints/expenses';

export const useExpenseStore = create((set, get) => ({
  expenses: [],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  },
  filters: {
    search: '',
    dateFrom: null,
    dateTo: null,
    categoryId: null,
    amountMin: null,
    amountMax: null,
    paymentMode: null,
    sortBy: 'expense_date',
    sortDir: 'desc',
  },
  isLoading: false,
  error: null,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 },
    }));
    get().fetchExpenses();
  },

  setPage: (page) => {
    set((state) => ({
      pagination: { ...state.pagination, page },
    }));
    get().fetchExpenses();
  },

  fetchExpenses: async () => {
    const { filters, pagination } = get();
    set({ isLoading: true, error: null });
    try {
      const params = {
        page: pagination.page,
        page_size: pagination.pageSize,
        sort_by: filters.sortBy,
        sort_dir: filters.sortDir,
      };
      if (filters.search) params.search = filters.search;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      if (filters.categoryId) params.category_id = filters.categoryId;
      if (filters.amountMin !== null && filters.amountMin !== '') params.amount_min = filters.amountMin;
      if (filters.amountMax !== null && filters.amountMax !== '') params.amount_max = filters.amountMax;
      if (filters.paymentMode) params.payment_mode = filters.paymentMode;

      const response = await expensesApi.list(params);
      set({
        expenses: response.data || [],
        pagination: {
          page: response.meta?.page || 1,
          pageSize: response.meta?.page_size || 20,
          total: response.meta?.total || 0,
          totalPages: response.meta?.total_pages || 0,
        },
        isLoading: false,
      });
    } catch (err) {
      set({ error: err.message || 'Failed to load expenses', isLoading: false });
    }
  },

  addExpense: async (expenseData) => {
    try {
      const response = await expensesApi.create(expenseData);
      get().fetchExpenses();
      return response.data;
    } catch (err) {
      throw err;
    }
  },

  updateExpense: async (id, expenseData) => {
    try {
      const response = await expensesApi.update(id, expenseData);
      get().fetchExpenses();
      return response.data;
    } catch (err) {
      throw err;
    }
  },

  deleteExpense: async (id) => {
    try {
      await expensesApi.delete(id);
      get().fetchExpenses();
    } catch (err) {
      throw err;
    }
  },
}));
