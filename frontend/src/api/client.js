import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Standard response envelope unpacker
    if (response.data && response.data.success !== undefined) {
      return response.data;
    }
    return response;
  },
  (error) => {
    let errorPayload = error.response?.data?.error;
    if (!errorPayload) {
      errorPayload = {
        code: 'NETWORK_ERROR',
        message: error.message || 'Network request failed. Please verify the backend is running.',
      };
    } else if (typeof errorPayload.message === 'string') {
      const msg = errorPayload.message;
      // Shield against raw DB / ORM error exposures
      if (
        msg.includes('SQLAlchemy') ||
        msg.includes('psycopg2') ||
        msg.includes('IntegrityError') ||
        msg.includes('UniqueViolation') ||
        msg.includes('duplicate key')
      ) {
        errorPayload.message =
          error.response?.status === 409 || errorPayload.code === 'CONFLICT'
            ? 'Category already exists.'
            : 'A database conflict occurred. Please try again.';
      }
    }
    return Promise.reject(errorPayload);
  }
);

export default apiClient;
