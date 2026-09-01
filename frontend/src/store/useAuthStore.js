import { create } from 'zustand';
import { authApi } from '../api/endpoints/auth';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isAuthLoading: true,
  authError: null,

  setAccessToken: (token) => {
    set({
      accessToken: token,
      isAuthenticated: Boolean(token),
    });
  },

  setUser: (user) => {
    set({ user });
  },

  setAuth: (user, token) => {
    set({
      user,
      accessToken: token,
      isAuthenticated: true,
      authError: null,
    });
  },

  clearAuth: () => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      authError: null,
    });
  },

  setAuthLoading: (isLoading) => {
    set({ isAuthLoading: isLoading });
  },

  setAuthError: (error) => {
    set({ authError: error });
  },

  // Initialize and check current session on app boot
  checkAuth: async () => {
    set({ isAuthLoading: true });
    try {
      // Attempt silent refresh via HttpOnly cookie
      const res = await authApi.refresh();
      const { user, access_token } = res.data || res;
      set({
        user,
        accessToken: access_token,
        isAuthenticated: true,
        isAuthLoading: false,
        authError: null,
      });
      return true;
    } catch {
      // No active session or cookie expired
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isAuthLoading: false,
      });
      return false;
    }
  },

  // Login with email + password
  login: async (email, password) => {
    set({ isAuthLoading: true, authError: null });
    try {
      const res = await authApi.login({ email, password });
      const { user, access_token } = res.data || res;
      set({
        user,
        accessToken: access_token,
        isAuthenticated: true,
        isAuthLoading: false,
        authError: null,
      });
      return { success: true, user };
    } catch (err) {
      const msg = err.message || 'Invalid email or password';
      set({ authError: msg, isAuthLoading: false });
      return { success: false, error: msg };
    }
  },

  // Register new account
  register: async (email, password, full_name) => {
    set({ isAuthLoading: true, authError: null });
    try {
      const res = await authApi.register({ email, password, full_name });
      const { user, access_token } = res.data || res;
      set({
        user,
        accessToken: access_token,
        isAuthenticated: true,
        isAuthLoading: false,
        authError: null,
      });
      return { success: true, user };
    } catch (err) {
      const msg = err.message || 'Registration failed. Please try again.';
      set({ authError: msg, isAuthLoading: false });
      return { success: false, error: msg };
    }
  },

  // Google OAuth / GIS Sign-in
  googleLogin: async (idToken) => {
    set({ isAuthLoading: true, authError: null });
    try {
      const res = await authApi.googleAuth({ credential: idToken, id_token: idToken });
      const { user, access_token } = res.data || res;
      set({
        user,
        accessToken: access_token,
        isAuthenticated: true,
        isAuthLoading: false,
        authError: null,
      });
      return { success: true, user };
    } catch (err) {
      const msg = err.message || 'Google sign-in failed. Please try again.';
      set({ authError: msg, isAuthLoading: false });
      return { success: false, error: msg };
    }
  },

  // Logout current session
  logout: async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('[AuthStore] Logout API error:', err);
    } finally {
      get().clearAuth();
    }
  },

  // Logout from all devices
  logoutAll: async () => {
    try {
      await authApi.logoutAll();
    } catch (err) {
      console.warn('[AuthStore] Logout All API error:', err);
    } finally {
      get().clearAuth();
    }
  },

  // Change password for logged-in user
  changePassword: async (currentPassword, newPassword) => {
    return await authApi.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  // Forgot password email request
  forgotPassword: async (email) => {
    return await authApi.forgotPassword({ email });
  },

  // Reset password with token
  resetPassword: async (token, newPassword) => {
    return await authApi.resetPassword({
      token,
      new_password: newPassword,
    });
  },
}));

export default useAuthStore;
