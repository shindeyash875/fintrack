import apiClient from '../client';

export const authApi = {
  register: (payload) => apiClient.post('/auth/register', payload),
  login: (payload) => apiClient.post('/auth/login', payload),
  googleAuth: (payload) => apiClient.post('/auth/google', payload),
  refresh: () => apiClient.post('/auth/refresh'),
  logout: () => apiClient.post('/auth/logout'),
  logoutAll: () => apiClient.post('/auth/logout-all'),
  getMe: () => apiClient.get('/auth/me'),
  forgotPassword: (payload) => apiClient.post('/auth/forgot-password', payload),
  resetPassword: (payload) => apiClient.post('/auth/reset-password', payload),
  verifyEmail: (payload) => apiClient.post('/auth/verify-email', payload),
  resendVerification: (payload) => apiClient.post('/auth/resend-verification', payload),
  changePassword: (payload) => apiClient.post('/auth/change-password', payload),
  getSessions: () => apiClient.get('/auth/sessions'),
};

export default authApi;
