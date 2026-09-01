import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Resolves the backend API base URL supporting:
 * 1. VITE_API_BASE_URL (standard FinTrack env var)
 * 2. VITE_API_URL (common alternative used on Vercel)
 * 3. VITE_BACKEND_URL (alternative)
 * 
 * Automatically ensures:
 * - Trailing slashes are stripped
 * - /api/v1 prefix is appended if missing
 * - HTTPS is enforced for remote production origins
 * - Clean fallback for local development
 */
export function getApiBaseUrl() {
  const envUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL;

  let url = (typeof envUrl === 'string' ? envUrl.trim() : '');

  if (!url) {
    if (import.meta.env.PROD) {
      console.warn(
        '[FinTrack API Config] ⚠️ No backend URL configured! ' +
        'Neither VITE_API_BASE_URL nor VITE_API_URL is set in environment variables. ' +
        'In Vercel, go to Settings > Environment Variables, add VITE_API_BASE_URL=https://<your-backend>.onrender.com/api/v1 and redeploy.'
      );
    }
    return 'http://localhost:8000/api/v1';
  }

  // Strip trailing slashes
  url = url.replace(/\/+$/, '');

  // Backend routes are mounted under /api/v1
  if (!url.endsWith('/api/v1') && !url.endsWith('/api')) {
    url = `${url}/api/v1`;
  } else if (url.endsWith('/api')) {
    url = `${url}/v1`;
  }

  // Enforce HTTPS for remote production hosts
  if (!url.includes('localhost') && !url.includes('127.0.0.1') && url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  }

  return url;
}

const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Essential for sending & receiving HttpOnly refresh token cookies
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Refresh token queue management
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor: Attach JWT Bearer Access Token
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_API === 'true') {
      const fullUrl = config.baseURL
        ? `${config.baseURL.replace(/\/+$/, '')}/${config.url?.replace(/^\/+/, '')}`
        : config.url;
      console.log(`[FinTrack API Request] ${config.method?.toUpperCase()} ${fullUrl}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Unpack envelope and handle automatic 401 token refresh
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success !== undefined) {
      return response.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and request was not an auth request that shouldn't retry
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/forgot-password') ||
      originalRequest?.url?.includes('/auth/reset-password');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue the request until refresh finishes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call backend /auth/refresh with HttpOnly cookie
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const data = refreshResponse.data?.data || refreshResponse.data;
        const newAccessToken = data?.access_token;
        const user = data?.user;

        if (newAccessToken) {
          useAuthStore.getState().setAuth(user, newAccessToken);
          processQueue(null, newAccessToken);

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } else {
          throw new Error('Refresh response missing access token');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    const isSilentAuthProbe = error.config?.url?.includes('/auth/refresh') && error.response?.status === 401;
    if (!isSilentAuthProbe) {
      console.warn(`[FinTrack API Error] ${error.config?.method?.toUpperCase()} ${fullUrl}:`, error.message || error);
    }

    let errorPayload = error.response?.data?.error;
    if (!errorPayload) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      errorPayload = {
        code: isTimeout ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR',
        message: isTimeout
          ? 'Backend request timed out. If your backend is on Render free tier, it may be waking up from sleep (~30s). Please retry in a moment.'
          : error.message || 'Network request failed. Please verify backend is running.',
      };
    } else if (typeof errorPayload.message === 'string') {
      const msg = errorPayload.message;
      if (
        msg.includes('SQLAlchemy') ||
        msg.includes('psycopg2') ||
        msg.includes('IntegrityError') ||
        msg.includes('UniqueViolation') ||
        msg.includes('duplicate key')
      ) {
        errorPayload.message =
          error.response?.status === 409 || errorPayload.code === 'CONFLICT'
            ? 'Record already exists.'
            : 'A database conflict occurred. Please try again.';
      }
    }
    return Promise.reject(errorPayload);
  }
);

export default apiClient;
