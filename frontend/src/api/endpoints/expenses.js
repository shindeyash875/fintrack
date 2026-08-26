import apiClient from '../client';

export const expensesApi = {
  list: (params = {}) => apiClient.get('/expenses', { params }),
  get: (id) => apiClient.get(`/expenses/${id}`),
  create: (data) => apiClient.post('/expenses', data),
  update: (id, data) => apiClient.put(`/expenses/${id}`, data),
  delete: (id) => apiClient.delete(`/expenses/${id}`),
  exportCsv: (params = {}) => apiClient.get('/expenses/export/csv', { params, responseType: 'blob' }),
  exportJson: (params = {}) => apiClient.get('/expenses/export/json', { params, responseType: 'blob' }),
  importCsv: (data) => apiClient.post('/expenses/import/csv', data),
  importJson: (data) => apiClient.post('/expenses/import/json', data),
};
