import apiClient from '../client';

export const categoriesApi = {
  list: () => apiClient.get('/categories'),
  create: (data) => apiClient.post('/categories', data),
  update: (id, data) => apiClient.put(`/categories/${id}`, data),
  delete: (id, params = {}) => apiClient.delete(`/categories/${id}`, { params }),
};
