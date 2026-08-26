import { create } from 'zustand';
import { categoriesApi } from '../api/endpoints/categories';

export const useCategoryStore = create((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await categoriesApi.list();
      set({ categories: response.data || [], isLoading: false });
    } catch (err) {
      set({ error: err.message || 'Failed to load categories', isLoading: false });
    }
  },

  addCategory: async (categoryData) => {
    try {
      const response = await categoriesApi.create(categoryData);
      const newCategory = response.data;
      set((state) => ({
        categories: [...state.categories, newCategory].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }));
      return newCategory;
    } catch (err) {
      throw err;
    }
  },

  updateCategory: async (id, categoryData) => {
    try {
      const response = await categoriesApi.update(id, categoryData);
      const updated = response.data;
      set((state) => ({
        categories: state.categories.map((c) => (c.id === id ? { ...c, ...updated } : c)),
      }));
      return updated;
    } catch (err) {
      throw err;
    }
  },

  deleteCategory: async (id, params = {}) => {
    try {
      await categoriesApi.delete(id, params);
      set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
      }));
    } catch (err) {
      throw err;
    }
  },
}));
