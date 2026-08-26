import apiClient from '../client';

export const dashboardApi = {
  getSummary: () => apiClient.get('/dashboard/summary'),
  getByCategory: (params = {}) => apiClient.get('/dashboard/charts/by-category', { params }),
  getOverTime: (params = {}) => apiClient.get('/dashboard/charts/over-time', { params }),
  getCompare: () => apiClient.get('/dashboard/compare'),
};
