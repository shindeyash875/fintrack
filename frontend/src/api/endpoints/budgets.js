import apiClient from '../client';

export const budgetsApi = {
  list: (periodMonth) => apiClient.get('/budgets', { params: { period_month: periodMonth } }),
  upsert: (data) => apiClient.post('/budgets', data),
  delete: (id) => apiClient.delete(`/budgets/${id}`),
  getStatus: (periodMonth) => apiClient.get('/budgets/status', { params: { period_month: periodMonth } }),
};
